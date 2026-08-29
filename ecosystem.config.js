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
    {
      name: "backup-scheduler",
      script: "scripts/backup-scheduler.ts",
      interpreter: "npx",
      interpreter_args: "tsx",
      autorestart: true,
      max_restarts: 5,
      restart_delay: 30000,
      time: true,
      error_file: "./logs/backup-scheduler-error.log",
      out_file: "./logs/backup-scheduler-out.log",
      merge_logs: true,
      // PM2 reinicia el proceso (y por lo tanto ejecuta el backup automático)
      // a las 11:30 p.m. de todos los días.
      cron_restart: "30 23 * * *",
      env: {
        BACKUP_SCHEDULER_CRON: "1",
      },
    },
  ],
};
