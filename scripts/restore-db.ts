// =============================================================================
// CLI DE RESTAURACIÓN — SEAMAR V2
// =============================================================================
// Restaura la base de datos desde un respaldo previamente registrado.
// ANTES de tocar la BD crea SIEMPRE un backup previo de seguridad
// (tipo prerestore). Exige confirmación explícita:
//
//   npx tsx scripts/restore-db.ts --id 12 --confirmar RESTAURAR
//
// Salidas: 0 = éxito, 1 = error. La BD se restaura en su lugar (DB_NAME).
// =============================================================================
import "./_env";
import { exit } from "process";
import pool from "../lib/mysql";
import { restaurarBackup } from "../lib/backups";

function parsearArgs(argv: string[]): { id: number; confirmar: string } {
  const args = { id: -1, confirmar: "" };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--id" && argv[i + 1]) {
      args.id = Number(argv[i + 1]);
      i++;
    } else if (a === "--confirmar" && argv[i + 1]) {
      args.confirmar = argv[i + 1];
      i++;
    }
  }

  if (!Number.isInteger(args.id) || args.id <= 0) {
    throw new Error("Uso: npx tsx scripts/restore-db.ts --id <N> --confirmar RESTAURAR");
  }
  return args;
}

async function main() {
  const { id, confirmar } = parsearArgs(process.argv.slice(2));

  console.log(`[backup] Restaurando backup id=${id}…`);
  console.log("[backup] Verificando integridad y creando backup previo de seguridad…");

  const resultado = await restaurarBackup({
    id,
    usuarioId: null,
    usuarioNombre: "CLI",
    confirmacion: confirmar,
  });

  if (!resultado.ok) {
    console.error(`[backup] ERROR: ${resultado.error}`);
    exit(1);
  }

  console.log(`[backup] OK: restauración completada desde backup #${resultado.backupRestauradoId}.`);
  console.log(`[backup] Backup previo de seguridad creado: #${resultado.backupPrevioId}`);
  await pool.end();
}

main().catch(async (e) => {
  console.error(`[backup] ERROR: ${e?.message || e}`);
  try {
    await pool.end();
  } catch {}
  exit(1);
});