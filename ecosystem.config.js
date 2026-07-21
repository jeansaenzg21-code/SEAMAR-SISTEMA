module.exports = {
  apps: [
    {
      name: "ocr-service",
      script: "python/ocr_server.py",
      interpreter: process.env.PYTHON_PATH || "python3",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: "2G",
      time: true,
      error_file: "./logs/ocr-service-error.log",
      out_file: "./logs/ocr-service-out.log",
      merge_logs: true,
      env: {
        OCR_SERVICE_HOST: "127.0.0.1",
        OCR_SERVICE_PORT: "8000",
        OCR_MAX_WORKERS: "1",
      },
    },
  ],
};
