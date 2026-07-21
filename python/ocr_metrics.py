import time
import threading


class OcrMetrics:
    def __init__(self):
        self._lock = threading.Lock()
        self._start_time = time.monotonic()
        self._processed = 0
        self._failed = 0
        self._ocr_ok = 0
        self._ocr_fail = 0
        self._total_time_ms = 0
        self._min_time_ms = 0
        self._max_time_ms = 0
        self._active_workers = 0
        self._queue_size = 0

    def record_ocr_start(self):
        with self._lock:
            self._active_workers += 1

    def record_ocr_end(self, elapsed_ms: int, success: bool):
        with self._lock:
            self._active_workers -= 1
            if success:
                self._processed += 1
                self._ocr_ok += 1
                self._total_time_ms += elapsed_ms
                if self._min_time_ms == 0 or elapsed_ms < self._min_time_ms:
                    self._min_time_ms = elapsed_ms
                if elapsed_ms > self._max_time_ms:
                    self._max_time_ms = elapsed_ms
            else:
                self._failed += 1
                self._ocr_fail += 1

    def set_queue_size(self, size: int):
        with self._lock:
            self._queue_size = size

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "processed": self._processed,
                "failed": self._failed,
                "ocr_ok": self._ocr_ok,
                "ocr_fail": self._ocr_fail,
                "average_time_ms": (
                    self._total_time_ms // max(self._ocr_ok, 1)
                ),
                "min_time_ms": self._min_time_ms,
                "max_time_ms": self._max_time_ms,
                "active_workers": self._active_workers,
                "idle_workers": 0,
                "queue_size": self._queue_size,
                "uptime_seconds": int(time.monotonic() - self._start_time),
            }
