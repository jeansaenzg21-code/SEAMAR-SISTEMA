import os
import time
import logging
import tempfile
import asyncio
import itertools
from dataclasses import dataclass, field

from ocr_core import extraer_texto
from ocr_metrics import OcrMetrics

logger = logging.getLogger("ocr-service")

MAX_RETRIES = 2
RETRY_BACKOFF_SECONDS = [2, 4]


@dataclass
class OcrJob:
    pdf_bytes: bytes
    document_id: str
    future: asyncio.Future = field(default=None, compare=False)

    def __post_init__(self):
        if self.future is None:
            self.future = asyncio.get_running_loop().create_future()


def es_error_reintentable(error: Exception) -> bool:
    msg = str(error).lower()
    no_reintentar = [
        "empty",
        "corrupt",
        "invalid format",
        "cannot open",
        "file not found",
        "syntax error",
        "timeout",
    ]
    return not any(kw in msg for kw in no_reintentar)


class OcrQueue:
    def __init__(
        self,
        num_workers: int,
        ocr,
        metrics: OcrMetrics,
        max_queue_size: int = 500,
        worker_timeout: int = 300,
    ):
        self.queue = asyncio.Queue(maxsize=max_queue_size)
        self.ocr = ocr
        self.metrics = metrics
        self.num_workers = num_workers
        self.max_queue_size = max_queue_size
        self.worker_timeout = worker_timeout
        self.workers: list[asyncio.Task] = []
        self._id_counter = itertools.count(1)

    async def start(self):
        self.workers = [
            asyncio.create_task(self._worker_loop(i))
            for i in range(self.num_workers)
        ]
        logger.info(
            f"Cola OCR iniciada | Workers: {self.num_workers} | "
            f"Cola máxima: {self.max_queue_size}"
        )

    async def stop(self):
        logger.info("Iniciando apagado de cola OCR...")

        for _ in range(self.num_workers):
            try:
                self.queue.put_nowait(None)
            except asyncio.QueueFull:
                pass

        if self.workers:
            done, pending = await asyncio.wait(
                self.workers, timeout=30.0
            )
            for task in pending:
                task.cancel()
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass
            self.workers = []

        remaining = self.queue.qsize()
        if remaining:
            logger.warning(
                f"Cola OCR detenida con {remaining} trabajo(s) "
                f"pendiente(s) que no alcanzaron a procesarse"
            )

        logger.info("Cola OCR detenida")

    async def enqueue(self, pdf_bytes: bytes, document_id: str) -> str:
        job = OcrJob(
            pdf_bytes=pdf_bytes,
            document_id=document_id,
        )
        position = self.queue.qsize() + 1

        try:
            self.queue.put_nowait(job)
        except asyncio.QueueFull:
            logger.warning(
                f"[{document_id}] Cola llena ({self.max_queue_size}), "
                f"rechazando documento"
            )
            raise

        self.metrics.set_queue_size(self.queue.qsize())
        logger.info(
            f"[{document_id}] Documento encolado | "
            f"Posición en cola: {position}"
        )
        return await job.future

    async def _worker_loop(self, worker_id: int):
        logger.info(f"Worker {worker_id} iniciado")

        while True:
            item = await self.queue.get()

            if item is None:
                self.queue.task_done()
                break

            job: OcrJob = item
            self.metrics.set_queue_size(self.queue.qsize())

            logger.info(
                f"[{job.document_id}] Worker {worker_id} asignado"
            )

            await self._procesar_con_reintentos(job, worker_id)

            self.queue.task_done()
            self.metrics.set_queue_size(self.queue.qsize())

        logger.info(f"Worker {worker_id} detenido")

    async def _procesar_con_reintentos(
        self, job: OcrJob, worker_id: int
    ):
        ultimo_error: Exception | None = None
        tiempo_inicio = time.time()
        temp_path = None

        for intento in range(1, MAX_RETRIES + 2):
            try:
                fd, temp_path = tempfile.mkstemp(suffix=".pdf")
                with os.fdopen(fd, "wb") as f:
                    f.write(job.pdf_bytes)

                logger.info(
                    f"[{job.document_id}] Worker {worker_id} | "
                    f"Intento {intento} | Inicio OCR: {temp_path}"
                )

                self.metrics.record_ocr_start()
                ocr_start = time.monotonic()
                texto = await asyncio.wait_for(
                    asyncio.to_thread(extraer_texto, temp_path, self.ocr),
                    timeout=self.worker_timeout,
                )
                elapsed_ms = int(
                    (time.monotonic() - ocr_start) * 1000
                )

                chars = len(texto)
                elapsed = time.time() - tiempo_inicio

                logger.info(
                    f"[{job.document_id}] Worker {worker_id} | "
                    f"OCR exitoso | Caracteres: {chars} | "
                    f"Tiempo OCR: {elapsed_ms}ms | "
                    f"Tiempo total: {elapsed:.2f}s"
                )

                self.metrics.record_ocr_end(elapsed_ms, success=True)

                if not job.future.done():
                    job.future.set_result(texto)
                return

            except Exception as e:
                elapsed = time.time() - tiempo_inicio
                ultimo_error = e

                if os.path.exists(temp_path or ""):
                    try:
                        os.unlink(temp_path)
                    except Exception:
                        pass

                if (
                    intento <= MAX_RETRIES
                    and es_error_reintentable(e)
                ):
                    wait = RETRY_BACKOFF_SECONDS[intento - 1]
                    logger.warning(
                        f"[{job.document_id}] Worker {worker_id} | "
                        f"Intento {intento} falló | "
                        f"Error: {e} | "
                        f"Tiempo: {elapsed:.2f}s | "
                        f"Reintentando en {wait}s..."
                    )
                    await asyncio.sleep(wait)
                    temp_path = None
                    continue
                else:
                    motivo = (
                        "error no reintentable"
                        if not es_error_reintentable(e)
                        else "reintentos agotados"
                    )
                    logger.error(
                        f"[{job.document_id}] Worker {worker_id} | "
                        f"OCR falló definitivamente | "
                        f"Motivo: {motivo} | "
                        f"Error: {e} | "
                        f"Tiempo: {elapsed:.2f}s"
                    )
                    self.metrics.record_ocr_end(0, success=False)

                    if not job.future.done():
                        job.future.set_exception(e)
                    return

            finally:
                if temp_path and os.path.exists(temp_path):
                    try:
                        os.unlink(temp_path)
                    except Exception:
                        pass
