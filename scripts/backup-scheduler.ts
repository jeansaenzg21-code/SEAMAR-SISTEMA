// =============================================================================
// PROGRAMADOR DE BACKUP AUTOMÁTICO — SEAMAR V2
// =============================================================================
// Determina el tipo de respaldo según la fecha y ejecuta el backup:
//   - Último día del mes  -> monthly
//   - Domingo (resto)     -> weekly
//   - Cualquier otro día  -> daily
//
// MODO RECOMENDADO (producción): programar este script en el cron del servidor:
//   # crontab (Linux):
//   30 23 * * * cd /ruta/a/SEAMAR-SISTEMA && npx tsx scripts/backup-scheduler.ts >> backups/scheduler.log 2>&1
//
//   # Windows (Programador de tareas) / PM2 con cron_restart (ver ecosystem.config.js)
//
// También admite modo bucle para procesos residentes:
//   npx tsx scripts/backup-scheduler.ts --periodo-horas 6
// =============================================================================
import "./_env";
import { exit } from "process";
import pool from "../lib/mysql";
import {
  asegurarDirectorios,
  ejecutarBackup,
  obtenerConfigBackup,
  type TipoBackup,
} from "../lib/backups";

function tipoAutomatico(fecha: Date): TipoBackup {
  const ultimoDiaDelMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
  const esUltimoDia = fecha.getDate() === ultimoDiaDelMes;
  if (esUltimoDia) return "monthly";
  if (fecha.getDay() === 0) return "weekly";
  return "daily";
}

function ux(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

async function ejecutarUnaVez() {
  const config = obtenerConfigBackup();
  if (!config.db.database) {
    console.error("[backup] Falta DB_NAME. Revisa .env.local / .env");
    await pool.end();
    exit(1);
  }

  await asegurarDirectorios(config);
  const tipo = tipoAutomatico(new Date());
  console.log(`[backup] ${new Date().toISOString()} Backup automático tipo=${tipo}`);

  const resultado = await ejecutarBackup(tipo, { motivo: `Backup automático (${tipo})` });

  if (!resultado.ok) {
    console.error(`[backup] ${new Date().toISOString()} ERROR: ${resultado.error}`);
    await pool.end();
    exit(1);
  }

  console.log(`[backup] ${new Date().toISOString()} OK: ${resultado.nombre} (id=${resultado.id})`);
  console.log(`[backup] Ruta: ${resultado.ruta}`);
}

async function main() {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--periodo-horas");
  const horas = idx >= 0 && args[idx + 1] ? Number(args[idx + 1]) : 0;

  if (horas > 0 && Number.isInteger(horas)) {
    console.log(`[backup] Modo bucle: cada ${horas} hora(s). Ctrl+C para detener.`);
    await ejecutarUnaVez();
    setInterval(() => {
      ejecutarUnaVez().catch((e) => console.error("[backup] ERROR en bucle:", e));
    }, horas * 60 * 60 * 1000);
  } else {
    await ejecutarUnaVez();
  }
}

main().catch((e) => {
  console.error(`[backup] ERROR: ${e?.message || e}`);
  exit(1);
});