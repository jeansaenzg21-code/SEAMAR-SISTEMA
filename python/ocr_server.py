import os
import logging
import asyncio
import itertools
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request

from paddleocr import PaddleOCR
from ocr_queue import OcrQueue
from ocr_metrics import OcrMetrics

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
    if "application/pdf" not in content_type:
        logger.warning(f"[{doc_id}] Content-Type inválido: {content_type}")
        return {"ok": False, "error": "Content-Type debe ser application/pdf"}

    try:
        content = await request.body()
    except Exception as e:
        logger.error(f"[{doc_id}] Error leyendo body: {e}")
        return {"ok": False, "error": "Error leyendo el PDF"}

    if not content:
        logger.warning(f"[{doc_id}] PDF vacío")
        return {"ok": False, "error": "El PDF está vacío"}

    if len(content) > MAX_FILE_SIZE_BYTES:
        logger.warning(
            f"[{doc_id}] PDF demasiado grande: "
            f"{len(content)} bytes (máx: {MAX_FILE_SIZE_BYTES})"
        )
        return {
            "ok": False,
            "error": (
                f"El PDF excede el tamaño máximo de "
                f"{CONFIG['max_file_size_mb']}MB"
            ),
        }

    if ocr_queue is None or ocr is None:
        logger.error(f"[{doc_id}] OCR Service no disponible")
        return {"ok": False, "error": "OCR Service no disponible"}

    try:
        result = await ocr_queue.enqueue(content, doc_id)

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


if __name__ == "__main__":
    uvicorn.run(
        app,
        host=CONFIG["host"],
        port=CONFIG["port"],
    )
