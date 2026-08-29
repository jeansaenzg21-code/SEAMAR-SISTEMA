// =============================================================================
// CLI DE BACKUP — SEAMAR V2
// =============================================================================
// Genera un respaldo REAL de la base de datos con mysqldump (misma lógica de
// la interfaz web, usable desde crontab / systemd / PM2 sin depender de Next):
//
//   npx tsx scripts/backup-db.ts --tipo daily|weekly|monthly|manual|archivo
//                                [--motivo "texto"]
//                                [--retencion]            (solo aplicar retención)
//
// Requiere las credenciales en .env / .env.local (DB_HOST, DB_USER,
// DB_PASSWORD, DB_NAME). Salidas: 0 = éxito, 1 = error.
// =============================================================================
import "./_env";
import { exit } from "process";
import pool from "../lib/mysql";
import {
  aplicarRetencion,
  asegurarDirectorios,
  ejecutarBackup,
  obtenerConfigBackup,
  type TipoBackup,
} from "../lib/backups";

interface Args {
  tipo: TipoBackup | null;
  motivo: string | null;
  retencion: boolean;
}

function parsearArgs(argv: string[]): Args {
  const args: Args = { tipo: null, motivo: null, retencion: false };

  const tipos: TipoBackup[] = ["daily", "weekly", "monthly", "manual", "archivo"];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tipo" && argv[i + 1]) {
      const t = argv[i + 1].toLowerCase();
      if (!tipos.includes(t as TipoBackup)) {
        throw new Error(`Tipo inválido. Usa: ${tipos.join(" | ")}`);
      }
      args.tipo = t as TipoBackup;
      i++;
    } else if (a === "--motivo" && argv[i + 1]) {
      args.motivo = argv[i + 1];
      i++;
    } else if (a === "--retencion") {
      args.retencion = true;
    }
  }

  return args;
}

async function main() {
  const args = parsearArgs(process.argv.slice(2));
  const config = obtenerConfigBackup();

  if (!config.db.database) {
    console.error("[backup] Falta DB_NAME. Revisa .env.local / .env");
    exit(1);
  }

  await asegurarDirectorios(config);

  if (args.retencion) {
    const eliminados = await aplicarRetencion(config, "sistema");
    console.log(`[backup] Retención aplicada. Respaldos eliminados: ${eliminados}`);
    await pool.end();
    return;
  }

  const tipo = args.tipo ?? "manual";
  console.log(`[backup] Iniciando backup tipo=${tipo} motivo=${args.motivo ?? "-"}`);
  const resultado = await ejecutarBackup(tipo, { motivo: args.motivo, usuarioNombre: "CLI" });

  if (!resultado.ok) {
    console.error(`[backup] ERROR: ${resultado.error}`);
    exit(1);
  }

  console.log(`[backup] OK: ${resultado.nombre} (id=${resultado.id})`);
  console.log(`[backup] Ruta: ${resultado.ruta}`);
  await pool.end();
}

main().catch(async (e) => {
  console.error(`[backup] ERROR: ${e?.message || e}`);
  try {
    await pool.end();
  } catch {}
  exit(1);
});