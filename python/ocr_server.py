import os
import logging
import asyncio
import itertools
import tempfile
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request

from paddleocr import PaddleOCR
from ocr_queue import OcrQueue, es_imagen
from ocr_metrics import OcrMetrics
from ocr_detect import detectar_tipo_documento, extraer_texto_plano

# =========================
# CONFIGURACIÓN
# =========================
CONFIG = {
    "host": os.getenv("OCR_SERVICE_HOST", "0.0.0.0"),
    "port": int(os.getenv("OCR_SERVICE_PORT", "8000")),
    "max_workers": int(os.getenv("OCR_MAX_WORKERS", "1")),
    "max_queue_size": int(os.getenv("OCR_MAX_QUEUE_SIZE", "500")),
    "max_file_size_mb": int(os.getenv("OCR_MAX_FILE_SIZE_MB", "50")),
    "worker_timeout": int(os.getenv("OCR_WORKER_TIMEOUT", "300")),
    "version": "1.0.0",
}

MAX_FILE_SIZE_BYTES = CONFIG["max_file_size_mb"] * 1024 * 1024

# =========================
# LOGGER
# =========================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger("ocr-service")

# =========================
# ESTADO GLOBAL
# =========================

ocr: PaddleOCR | None = None
ocr_queue: OcrQueue | None = None
metrics: OcrMetrics | None = None
doc_id_counter = itertools.count(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global ocr, ocr_queue, metrics

    os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

    metrics = OcrMetrics()

    logger.info("Iniciando PaddleOCR...")

    ocr = PaddleOCR(
        use_textline_orientation=True,
        lang="es"
    )

    ocr_queue = OcrQueue(
        num_workers=CONFIG["max_workers"],
        ocr=ocr,
        metrics=metrics,
        max_queue_size=CONFIG["max_queue_size"],
        worker_timeout=CONFIG["worker_timeout"],
    )
    await ocr_queue.start()

    logger.info("PaddleOCR inicializado correctamente")
    logger.info("=" * 50)
    logger.info("SEAMAR OCR SERVICE")
    logger.info(f"Workers: {CONFIG['max_workers']}")
    logger.info(f"Cola máxima: {CONFIG['max_queue_size']}")
    logger.info(f"Tamaño máximo PDF: {CONFIG['max_file_size_mb']}MB")
    logger.info(f"Worker timeout: {CONFIG['worker_timeout']}s")
    logger.info(f"Puerto: {CONFIG['port']}")
    logger.info("=" * 50)

    yield

    logger.info("Iniciando apagado gracefully...")
    await ocr_queue.stop()
    ocr_queue = None
    ocr = None
    metrics = None
    logger.info("OCR Service detenido")


app = FastAPI(
    title="SEAMAR OCR Service",
    version=CONFIG["version"],
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    snap = metrics.snapshot() if metrics else {}
    idle = CONFIG["max_workers"] - snap.get("active_workers", 0)
    return {
        "status": "ok",
        "version": CONFIG["version"],
        "ocr_loaded": ocr is not None,
        "workers": CONFIG["max_workers"],
        "active_workers": snap.get("active_workers", 0),
        "idle_workers": max(idle, 0),
        "queue_size": snap.get("queue_size", 0),
        "processed": snap.get("processed", 0),
        "failed": snap.get("failed", 0),
        "average_time_ms": snap.get("average_time_ms", 0),
        "min_time_ms": snap.get("min_time_ms", 0),
        "max_time_ms": snap.get("max_time_ms", 0),
        "uptime_seconds": snap.get("uptime_seconds", 0),
    }


@app.post("/ocr")
async def ocr_endpoint(request: Request):
    doc_id = request.headers.get("x-document-id") or f"OCR-{next(doc_id_counter):06d}"

    content_type = request.headers.get("content-type", "")

    tipos_validos = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
    ]

    if content_type not in tipos_validos:
        logger.warning(f"[{doc_id}] Content-Type inválido: {content_type}")
        return {
            "ok": False,
            "error": (
                "Content-Type debe ser application/pdf, "
                "image/jpeg o image/png"
            ),
        }

    try:
        content = await request.body()
    except Exception as e:
        logger.error(f"[{doc_id}] Error leyendo body: {e}")
        return {"ok": False, "error": "Error leyendo el documento"}

    if not content:
        logger.warning(f"[{doc_id}] Documento vacío")
        return {"ok": False, "error": "El documento está vacío"}

    if len(content) > MAX_FILE_SIZE_BYTES:
        logger.warning(
            f"[{doc_id}] Documento demasiado grande: "
            f"{len(content)} bytes (máx: {MAX_FILE_SIZE_BYTES})"
        )
        return {
            "ok": False,
            "error": (
                f"El documento excede el tamaño máximo de "
                f"{CONFIG['max_file_size_mb']}MB"
            ),
        }

    if ocr_queue is None or ocr is None:
        logger.error(f"[{doc_id}] OCR Service no disponible")
        return {"ok": False, "error": "OCR Service no disponible"}

    try:
        result = await ocr_queue.enqueue(content, doc_id, content_type)

        logger.info(
            f"[{doc_id}] Documento procesado exitosamente | "
            f"Caracteres: {len(result.texto)} | "
            f"Cola: {result.queue_wait_ms}ms | "
            f"OCR: {result.ocr_ms}ms"
        )

        return {
            "ok": True,
            "texto": result.texto,
            "queue_wait_ms": result.queue_wait_ms,
            "ocr_ms": result.ocr_ms,
        }

    except asyncio.QueueFull:
        logger.warning(f"[{doc_id}] Cola llena, rechazando documento")
        return {
            "ok": False,
            "error": (
                "El servicio OCR está saturado, "
                "intente nuevamente en unos momentos"
            ),
        }

    except Exception as e:
        logger.error(
            f"[{doc_id}] Error procesando OCR: {e}"
        )
        return {"ok": False, "error": "Error procesando OCR"}


@app.post("/procesar-documento")
async def procesar_documento_endpoint(request: Request):
    doc_id = request.headers.get("x-document-id") or f"OCR-{next(doc_id_counter):06d}"

    content_type = request.headers.get("content-type", "")

    tipos_validos = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
    ]

    if content_type not in tipos_validos:
        logger.warning(f"[{doc_id}] Content-Type inválido: {content_type}")
        return {
            "ok": False,
            "error": (
                "Content-Type debe ser application/pdf, "
                "image/jpeg o image/png"
            ),
        }

    try:
        content = await request.body()
    except Exception as e:
        logger.error(f"[{doc_id}] Error leyendo body: {e}")
        return {"ok": False, "error": "Error leyendo el documento"}

    if not content:
        logger.warning(f"[{doc_id}] Documento vacío")
        return {"ok": False, "error": "El documento está vacío"}

    if len(content) > MAX_FILE_SIZE_BYTES:
        logger.warning(
            f"[{doc_id}] Documento demasiado grande: "
            f"{len(content)} bytes (máx: {MAX_FILE_SIZE_BYTES})"
        )
        return {
            "ok": False,
            "error": (
                f"El documento excede el tamaño máximo de "
                f"{CONFIG['max_file_size_mb']}MB"
            ),
        }

    if ocr_queue is None or ocr is None:
        logger.error(f"[{doc_id}] OCR Service no disponible")
        return {"ok": False, "error": "OCR Service no disponible"}

    try:
        # IMAGEN: se clasifica automáticamente y se ejecuta OCR directo.
        if es_imagen(content_type):
            result = await ocr_queue.enqueue(content, doc_id, content_type)

            logger.info(
                f"[{doc_id}] [DOCUMENTO] tipo detectado: IMAGEN | "
                f"Caracteres OCR: {len(result.texto)}"
            )

            return {
                "ok": True,
                "tipo": "IMAGEN",
                "texto": result.texto,
                "queue_wait_ms": result.queue_wait_ms,
                "ocr_ms": result.ocr_ms,
            }

        # PDF: extraer capa de texto con PyMuPDF y detectar el tipo.
        fd, temp_path = tempfile.mkstemp(suffix=".pdf")
        try:
            with os.fdopen(fd, "wb") as f:
                f.write(content)

            tipo = await asyncio.to_thread(
                detectar_tipo_documento, temp_path
            )

            if tipo == "PDF_TEXTO":
                texto = await asyncio.to_thread(
                    extraer_texto_plano, temp_path
                )

                logger.info(
                    f"[{doc_id}] [DOCUMENTO] tipo detectado: PDF_TEXTO | "
                    f"Caracteres: {len(texto)}"
                )

                return {
                    "ok": True,
                    "tipo": "PDF_TEXTO",
                    "texto": texto,
                    "queue_wait_ms": 0,
                    "ocr_ms": 0,
                }

            logger.info(
                f"[{doc_id}] [DOCUMENTO] tipo detectado: PDF_ESCANEADO | "
                "[OCR] activado porque el PDF no contiene texto suficiente."
            )

            result = await ocr_queue.enqueue(
                content, doc_id, "application/pdf"
            )

            return {
                "ok": True,
                "tipo": "PDF_ESCANEADO",
                "texto": result.texto,
                "queue_wait_ms": result.queue_wait_ms,
                "ocr_ms": result.ocr_ms,
            }
        finally:
            if os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except Exception:
                    pass

    except asyncio.QueueFull:
        logger.warning(f"[{doc_id}] Cola llena, rechazando documento")
        return {
            "ok": False,
            "error": (
                "El servicio OCR está saturado, "
                "intente nuevamente en unos momentos"
            ),
        }

    except Exception as e:
        logger.error(f"[{doc_id}] Error procesando documento: {e}")
        return {"ok": False, "error": "Error procesando el documento"}


if __name__ == "__main__":
    uvicorn.run(
        app,
        host=CONFIG["host"],
        port=CONFIG["port"],
    )
