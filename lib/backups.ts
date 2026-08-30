import pool from "@/lib/mysql";
import { registrarActividad } from "@/lib/actividad";
import { spawn } from "child_process";
import { createHash } from "crypto";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import type { ResultSetHeader } from "mysql2/promise";

// =============================================================================
// MÓDULO DE BACKUP / RESTAURACIÓN / RETENCIÓN
// =============================================================================
// Genera respaldos REALES de la base de datos mediante `mysqldump` (spawn con
// password vía MYSQL_PWD; nunca en la línea de comandos). Cada respaldo se
// registra en la tabla `backups`, se valida (tamaño + encabezado SQL) y se
// protege con checksum SHA-256. La retención elimina respaldos viejos por tipo
// y deja trazabilidad en `backup_eliminaciones`.
// =============================================================================

export type TipoBackup = "daily" | "weekly" | "monthly" | "manual" | "prerestore" | "archivo";
export type EstadoBackup = "EN_PROCESO" | "COMPLETADO" | "ERROR" | "RESTAURADO";

export interface BackupRecord {
  id: number;
  tipo: TipoBackup;
  nombre_archivo: string;
  ruta: string;
  tamano: number | null;
  checksum: string | null;
  estado: EstadoBackup;
  fase: string | null;
  error: string | null;
  motivo: string | null;
  usuario_id: number | null;
  usuario_nombre: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  created_at: string;
}

export interface ConfigBackup {
  dir: string;
  mysqldump: string;
  mysql: string;
  retencion: { daily: number; weekly: number; monthly: number };
  lockMinutos: number;
  db: { host: string; port: number; user: string; password: string; database: string };
}

// -----------------------------------------------------------------------------
// CONFIGURACIÓN Y DIRECTORIOS
// -----------------------------------------------------------------------------

export const SUBDIRS = ["daily", "weekly", "monthly", "manual", "archive", "prerestore"] as const;

export function obtenerConfigBackup(): ConfigBackup {
  const dir = path.resolve(process.env.BACKUP_DIR || path.join(process.cwd(), "backups"));

  const dbHost = process.env.DB_HOST || "";
  const dbPort = Number(process.env.DB_PORT || 3306);

  return {
    dir,
    mysqldump: process.env.BACKUP_MYSQLDUMP_PATH || "mysqldump",
    mysql: process.env.BACKUP_MYSQL_PATH || "mysql",
    retencion: {
      daily: Math.max(1, Number(process.env.BACKUP_RETENTION_DAILY_DAYS || 7)),
      weekly: Math.max(1, Number(process.env.BACKUP_RETENTION_WEEKLY_COUNT || 4)),
      monthly: Math.max(1, Number(process.env.BACKUP_RETENTION_MONTHLY_COUNT || 6)),
    },
    lockMinutos: Math.max(1, Number(process.env.BACKUP_MAX_LOCK_MINUTES || 45)),
    db: {
      host: dbHost,
      port: Number.isInteger(dbPort) && dbPort > 0 ? dbPort : 3306,
      user: process.env.DB_USER || "",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "",
    },
  };
}

export function subdirectorio(tipo: TipoBackup): string {
  const base = subdirDeTipo(tipo);
  return base;
}

function subdirDeTipo(tipo: TipoBackup): string {
  switch (tipo) {
    case "prerestore":
      return "prerestore";
    case "archivo":
      return "archive";
    default:
      return tipo;
  }
}

export async function asegurarDirectorios(config: ConfigBackup): Promise<void> {
  await fsp.mkdir(config.dir, { recursive: true });
  for (const sub of SUBDIRS) {
    await fsp.mkdir(path.join(config.dir, sub), { recursive: true });
  }
}

function rutaSubdir(config: ConfigBackup, tipo: TipoBackup): string {
  return path.join(config.dir, subdirDeTipo(tipo));
}

// -----------------------------------------------------------------------------
// LOCK (impide backup+backup y backup+restauración simultáneos)
// -----------------------------------------------------------------------------

interface LockInfo {
  pid: number;
  operacion: string;
  nombre: string;
  fecha: string;
}

function rutaLock(config: ConfigBackup): string {
  return path.join(config.dir, ".backup.lock");
}

function pidVivo(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: any) {
    return e?.code === "EPERM";
  }
}

export async function estadoLock(config: ConfigBackup): Promise<
  { activo: boolean; lock: LockInfo | null; vencido: boolean } | { activo: false; lock: null; vencido: false }
> {
  const ruta = rutaLock(config);
  try {
    const stat = await fsp.stat(ruta);
    if (!stat.isFile()) return { activo: false, lock: null, vencido: false };

    const contenido = await fsp.readFile(ruta, "utf8");
    let lock: LockInfo;
    try {
      lock = JSON.parse(contenido);
    } catch {
      lock = { pid: -1, operacion: "desconocida", nombre: "", fecha: new Date().toISOString() };
    }

    const vencidoPorTiempo = Date.now() - stat.mtimeMs > config.lockMinutos * 60_000;
    const vencidoPorPid = !pidVivo(Number(lock.pid) || -1);
    const vencido = vencidoPorTiempo || vencidoPorPid;

    if (vencido) {
      return { activo: false, lock: null, vencido: true };
    }
    return { activo: true, lock, vencido: false };
  } catch {
    return { activo: false, lock: null, vencido: false };
  }
}

export async function adquirirLock(config: ConfigBackup, operacion: string, nombre: string): Promise<void> {
  await asegurarDirectorios(config);

  const estado = await estadoLock(config);
  if (estado.activo) {
    const lock = estado.lock;
    throw new Error(
      `Operación bloqueada: ya hay una ${lock?.operacion || "operación"} en curso (` +
        `${lock?.nombre || "desconocida"}). Espera a que termine o revisa el lock vencido.`
    );
  }

  const lock: LockInfo = {
    pid: process.pid,
    operacion,
    nombre,
    fecha: new Date().toISOString(),
  };

  try {
    await fsp.writeFile(rutaLock(config), JSON.stringify(lock), { flag: "wx" });
  } catch (e: any) {
    if (e?.code === "EEXIST") {
      throw new Error("Operación bloqueada: otro proceso está generando/restaurando un backup.");
    }
    throw e;
  }
}

export async function liberarLock(config: ConfigBackup): Promise<void> {
  try {
    await fsp.rm(rutaLock(config), { force: true });
  } catch {
    // noop: el lock ya no existe
  }
}

// -----------------------------------------------------------------------------
// NOMBRES Y VALIDACIÓN DE ARCHIVOS
// -----------------------------------------------------------------------------

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

export function generarNombre(tipo: TipoBackup, fecha: Date): string {
  const y = fecha.getFullYear();
  const m = dosDigitos(fecha.getMonth() + 1);
  const d = dosDigitos(fecha.getDate());
  const h = dosDigitos(fecha.getHours());
  const min = dosDigitos(fecha.getMinutes());
  const s = dosDigitos(fecha.getSeconds());
  const base = tipo === "prerestore" ? "SEAMAR_PRE_RESTORE" : "SEAMAR_DB";
  return `${base}_${y}-${m}-${d}_${h}${min}${s}.sql`;
}

export async function validarArchivoDump(ruta: string): Promise<{ valido: boolean; motivo: string; tamano: number }> {
  try {
    const stat = await fsp.stat(ruta);
    if (!stat.isFile()) return { valido: false, motivo: "La ruta no corresponde a un archivo.", tamano: 0 };
    if (stat.size <= 0) return { valido: false, motivo: "El archivo está vacío.", tamano: stat.size };

    const fd = await fsp.open(ruta, "r");
    const buffer = Buffer.alloc(4096);
    await fd.read(buffer, 0, buffer.length, 0);
    await fd.close();

    const cabecera = buffer.toString("utf8").trimStart().slice(0, 512);
    const esDumpSql =
      cabecera.includes("-- MySQL dump") ||
      cabecera.includes("-- mysqldump") ||
      cabecera.includes("MariaDB dump. mysqldump");

    if (!esDumpSql) {
      return { valido: false, motivo: "El archivo no tiene el formato de un dump SQL de MySQL.", tamano: stat.size };
    }

    return { valido: true, motivo: "OK", tamano: stat.size };
  } catch (e: any) {
    return { valido: false, motivo: e?.message || "No se pudo leer el archivo.", tamano: 0 };
  }
}

export async function calcularChecksum(ruta: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = fs.createReadStream(ruta);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

// -----------------------------------------------------------------------------
// EJECUCIÓN DEL DUMP CON mysqldump (password por MYSQL_PWD, sin inyección)
// -----------------------------------------------------------------------------

interface ResultadoDump {
  ok: boolean;
  error: string | null;
}

export async function ejecutarDumpSql(config: ConfigBackup, origen: string, destino: string): Promise<ResultadoDump> {
  const args: string[] = [];
  if (config.db.host) args.push("-h", config.db.host);
  if (config.db.port !== 3306) args.push("-P", String(config.db.port));
  if (config.db.user) args.push("-u", config.db.user);
  args.push("--single-transaction", "--routines", "--triggers", "--events", config.db.database);

  return new Promise((resolve) => {
    const child = spawn(config.mysqldump, args, {
      env: { ...process.env, MYSQL_PWD: config.db.password },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const streamSalida = fs.createWriteStream(destino);
    let stderr = "";

    child.stdout.pipe(streamSalida);
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err: any) => {
      streamSalida.destroy();
      const detalle =
        err?.code === "ENOENT"
          ? `No se encontró el comando "${config.mysqldump}". Verifica BACKUP_MYSQLDUMP_PATH o el PATH del servidor.`
          : err?.message || String(err);
      resolve({ ok: false, error: detalle });
    });

    streamSalida.on("error", (err) => {
      resolve({ ok: false, error: `Error escribiendo el archivo de backup: ${err.message}` });
    });

    child.on("close", (code) => {
      if (code !== 0) {
        const error = (stderr || "").trim() || `mysqldump terminó con código ${code}`;
        resolve({ ok: false, error });
        return;
      }
      resolve({ ok: true, error: null });
    });
  });
}

// -----------------------------------------------------------------------------
// ACCESO A LA TABLA backups
// -----------------------------------------------------------------------------

export async function registrarInicioBackup(input: {
  tipo: TipoBackup;
  nombre: string;
  ruta: string;
  motivo?: string | null;
  usuarioId?: number | null;
  usuarioNombre?: string | null;
}): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO backups (tipo, nombre_archivo, ruta, estado, fase, motivo, usuario_id, usuario_nombre, fecha_inicio)
     VALUES (?, ?, ?, 'EN_PROCESO', 'Preparando backup...', ?, ?, ?, NOW())`,
    [
      input.tipo,
      input.nombre,
      input.ruta,
      input.motivo ?? null,
      input.usuarioId ?? null,
      input.usuarioNombre ?? null,
    ]
  );
  return result.insertId;
}

export async function actualizarFaseBackup(id: number, fase: string): Promise<void> {
  await pool.query(`UPDATE backups SET fase = ? WHERE id = ?`, [fase, id]);
}

export async function finalizarBackup(
  id: number,
  estado: EstadoBackup,
  extra: { tamano?: number | null; checksum?: string | null; error?: string | null; fase?: string | null } = {}
): Promise<void> {
  await pool.query(
    `UPDATE backups
     SET estado = ?,
         tamano = IFNULL(?, tamano),
         checksum = IFNULL(?, checksum),
         error = ?,
         fase = ?,
         fecha_fin = NOW()
     WHERE id = ?`,
    [estado, extra.tamano ?? null, extra.checksum ?? null, extra.error ?? null, extra.fase ?? null, id]
  );
}

export function mapearBackup(row: any): BackupRecord {
  return {
    id: Number(row.id),
    tipo: row.tipo,
    nombre_archivo: row.nombre_archivo,
    ruta: row.ruta,
    tamano: row.tamano != null ? Number(row.tamano) : null,
    checksum: row.checksum,
    estado: row.estado,
    fase: row.fase,
    error: row.error,
    motivo: row.motivo,
    usuario_id: row.usuario_id != null ? Number(row.usuario_id) : null,
    usuario_nombre: row.usuario_nombre,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    created_at: row.created_at,
  };
}

export async function obtenerBackup(id: number): Promise<BackupRecord | null> {
  const [rows]: any = await pool.query(`SELECT * FROM backups WHERE id = ? LIMIT 1`, [id]);
  if (!rows?.[0]) return null;
  return mapearBackup(rows[0]);
}

export async function listarBackups(filtro?: { tipo?: string; estado?: string }): Promise<BackupRecord[]> {
  const conds: string[] = [];
  const params: unknown[] = [];
  if (filtro?.tipo) {
    conds.push("tipo = ?");
    params.push(filtro.tipo);
  }
  if (filtro?.estado) {
    conds.push("estado = ?");
    params.push(filtro.estado);
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";
  const [rows]: any = await pool.query(
    `SELECT * FROM backups ${where} ORDER BY id DESC LIMIT 500`,
    params
  );
  return (rows || []).map(mapearBackup);
}

export function rutaSegura(config: ConfigBackup, ruta: string): string {
  const resuelta = path.resolve(ruta);
  const base = path.resolve(config.dir) + path.sep;
  if (!resuelta.startsWith(base)) {
    throw new Error("Ruta de backup fuera del directorio permitido.");
  }
  return resuelta;
}

// -----------------------------------------------------------------------------
// RECUPERACIÓN DE BACKUPS INTERRUMPIDOS
// -----------------------------------------------------------------------------

export async function recuperarBackupsInterrumpidos(config: ConfigBackup): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE backups
     SET estado = 'ERROR', fase = NULL,
         error = CONCAT(IFNULL(error, ''), ' Backups interrumpido (proceso reiniciado o timeout).')
     WHERE estado = 'EN_PROCESO'
       AND (fecha_inicio IS NULL OR fecha_inicio < (NOW() - INTERVAL ? MINUTE))`,
    [config.lockMinutos]
  );
  return result.affectedRows || 0;
}

// -----------------------------------------------------------------------------
// BACKUP COMPLETO (con lock + validación + checksum + retención)
// -----------------------------------------------------------------------------

export interface ResultadoBackup {
  id: number;
  ok: boolean;
  error: string | null;
  nombre: string;
  ruta: string;
}

export async function producirDumpSinLock(
  config: ConfigBackup,
  tipo: TipoBackup,
  input: {
    motivo?: string | null;
    usuarioId?: number | null;
    usuarioNombre?: string | null;
  } = {}
): Promise<ResultadoBackup> {
  const nombre = generarNombre(tipo, new Date());
  const ruta = path.join(rutaSubdir(config, tipo), nombre);

  const id = await registrarInicioBackup({
    tipo,
    nombre,
    ruta,
    motivo: input.motivo,
    usuarioId: input.usuarioId,
    usuarioNombre: input.usuarioNombre,
  });

  await actualizarFaseBackup(id, "Generando dump con mysqldump...");
  console.log(`[backup] Iniciando ${tipo}: ${nombre}`);
  const dump = await ejecutarDumpSql(config, config.db.database, ruta);

  if (!dump.ok) {
    await finalizarBackup(id, "ERROR", { error: dump.error });
    return { id, ok: false, error: dump.error, nombre, ruta };
  }

  await actualizarFaseBackup(id, "Validando archivo generado...");
  const validacion = await validarArchivoDump(ruta);
  if (!validacion.valido) {
    await finalizarBackup(id, "ERROR", { error: validacion.motivo });
    return { id, ok: false, error: validacion.motivo, nombre, ruta };
  }

  await actualizarFaseBackup(id, "Calculando checksum SHA-256...");
  const checksum = await calcularChecksum(ruta);

  await finalizarBackup(id, "COMPLETADO", { tamano: validacion.tamano, checksum });
  console.log(`[backup] Completado: ${nombre} (${validacion.tamano} bytes) sha256=${checksum.slice(0, 16)}…`);

  return { id, ok: true, error: null, nombre, ruta };
}

export async function ejecutarBackup(
  tipo: TipoBackup,
  input: {
    motivo?: string | null;
    usuarioId?: number | null;
    usuarioNombre?: string | null;
  } = {}
): Promise<ResultadoBackup> {
  const config = obtenerConfigBackup();
  await asegurarDirectorios(config);
  await recuperarBackupsInterrumpidos(config);

  const nombreAGenerar = generarNombre(tipo, new Date());
  await adquirirLock(config, tipo === "prerestore" ? "backup previo a restauración" : "backup", nombreAGenerar);

  try {
    const resultado = await producirDumpSinLock(config, tipo, input);
    if (resultado.ok) {
      await registrarActividad({
        tipo: "backup",
        accion: "backup",
        titulo: `Backup ${tipo} completado: ${resultado.nombre}`,
        subtitulo: `SHA-256 ${resultado.ruta}`,
        usuarioNombre: input.usuarioNombre,
        referenciaId: resultado.id,
      });
      try {
        await aplicarRetencion(config, "sistema");
      } catch (e) {
        console.error("[backup] Error en retención:", e);
      }
    } else {
      await registrarActividad({
        tipo: "backup",
        accion: "backup",
        titulo: `Backup ${tipo} fallido`,
        subtitulo: resultado.error,
        usuarioNombre: input.usuarioNombre,
        referenciaId: resultado.id,
      });
    }
    return resultado;
  } finally {
    await liberarLock(config);
  }
}

// -----------------------------------------------------------------------------
// RETENCIÓN (diario 7, semanal 4, mensual 6 — 100% trazable)
// -----------------------------------------------------------------------------

export async function aplicarRetencion(config: ConfigBackup, usuarioProceso: string): Promise<number> {
  const reglas: { tipo: TipoBackup; conservar: number }[] = [
    { tipo: "daily", conservar: config.retencion.daily },
    { tipo: "weekly", conservar: config.retencion.weekly },
    { tipo: "monthly", conservar: config.retencion.monthly },
  ];

  let eliminados = 0;

  for (const regla of reglas) {
    const backups = await listarBackups({ tipo: regla.tipo });
    const conservables = backups.filter((b) => b.estado === "COMPLETADO" || b.estado === "RESTAURADO");
    const excedentes = conservables.slice(regla.conservar);

    for (const b of excedentes) {
      await eliminarRegistroYArchivo(config, b, "Retención automática", usuarioProceso);
      eliminados += 1;
    }
  }

  if (eliminados > 0) {
    await registrarActividad({
      tipo: "backup",
      accion: "eliminar",
      titulo: `Retención aplicada: ${eliminados} respaldo(s) eliminado(s)`,
      subtitulo: "Eliminación automática por política de retención.",
      usuarioNombre: usuarioProceso === "sistema" ? null : usuarioProceso,
    });
  }

  return eliminados;
}

async function eliminarRegistroYArchivo(
  config: ConfigBackup,
  b: BackupRecord,
  motivo: string,
  usuarioProceso: string
): Promise<void> {
  try {
    const ruta = rutaSegura(config, b.ruta);
    await fsp.rm(ruta, { force: true });
  } catch (e) {
    console.error(`[backup] No se pudo eliminar ${b.ruta}:`, e);
  }

  await pool.query(
    `INSERT INTO backup_eliminaciones (backup_id, nombre_archivo, tipo, tamano, fecha_eliminacion, motivo, usuario_proceso)
     VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
    [b.id, b.nombre_archivo, b.tipo, b.tamano, motivo, usuarioProceso]
  );
  await pool.query(`DELETE FROM backups WHERE id = ?`, [b.id]);
}

// -----------------------------------------------------------------------------
// ELIMINACIÓN MANUAL (con trazabilidad)
// -----------------------------------------------------------------------------

export async function eliminarBackup(id: number, usuarioNombre: string | null): Promise<void> {
  const config = obtenerConfigBackup();
  await asegurarDirectorios(config);

  const backup = await obtenerBackup(id);
  if (!backup) throw new Error("El backup no existe.");

  await eliminarRegistroYArchivo(config, backup, "Eliminación manual", usuarioNombre || "ADMINISTRADOR");

  await registrarActividad({
    tipo: "backup",
    accion: "eliminar",
    titulo: `Backup eliminado: ${backup.nombre_archivo}`,
    subtitulo: `Tipo: ${backup.tipo}`,
    usuarioNombre,
    referenciaId: backup.id,
  });
}

// -----------------------------------------------------------------------------
// VALIDACIÓN BAJO DEMANDA (recalcula checksum)
// -----------------------------------------------------------------------------

export interface ResultadoValidacion {
  valido: boolean;
  checksumActual: string | null;
  coindideChecksum: boolean;
  tamano: number | null;
  motivo: string;
}

export async function validarBackup(id: number): Promise<ResultadoValidacion> {
  const config = obtenerConfigBackup();
  await asegurarDirectorios(config);

  const backup = await obtenerBackup(id);
  if (!backup) throw new Error("El backup no existe.");

  const ruta = rutaSegura(config, backup.ruta);
  try {
    const stat = await fsp.stat(ruta);
    if (!stat.isFile()) {
      return { valido: false, checksumActual: null, coindideChecksum: false, tamano: null, motivo: "Archivo no encontrado." };
    }

    const checksumActual = await calcularChecksum(ruta);
    const coindideChecksum = backup.checksum ? checksumActual === backup.checksum : false;

    const dump = await validarArchivoDump(ruta);
    const valido = dump.valido && coindideChecksum;
    const motivo = dump.valido
      ? coindideChecksum
        ? "OK"
        : "El checksum no coincide con el registrado. El archivo pudo ser alterado."
      : dump.motivo;

    await registrarActividad({
      tipo: "backup",
      accion: "validar",
      titulo: `Backup validado: ${backup.nombre_archivo}`,
      subtitulo: valido ? "Integridad correcta" : motivo,
    });

    return { valido, checksumActual, coindideChecksum, tamano: stat.size, motivo };
  } catch (e: any) {
    return { valido: false, checksumActual: null, coindideChecksum: false, tamano: null, motivo: e?.message || "Error de validación." };
  }
}

// -----------------------------------------------------------------------------
// RESTAURACIÓN (chequeos + backup previo + mysql)
// -----------------------------------------------------------------------------

export interface ResultadoRestauracion {
  ok: boolean;
  error: string | null;
  backupRestauradoId: number;
  backupPrevioId: number | null;
  checksumVerificado: boolean;
}

export async function restaurarBackup(input: {
  id: number;
  usuarioId: number | null;
  usuarioNombre: string | null;
  confirmacion: string;
}): Promise<ResultadoRestauracion> {
  const { id, usuarioNombre, usuarioId } = input;

  if (input.confirmacion !== "RESTAURAR") {
    throw new Error("Debes escribir RESTAURAR para confirmar la restauración.");
  }

  const config = obtenerConfigBackup();
  await asegurarDirectorios(config);
  await recuperarBackupsInterrumpidos(config);

  const backup = await obtenerBackup(id);
  if (!backup) throw new Error("El backup no existe.");
  if (backup.estado === "ERROR") throw new Error("Un backup con estado ERROR no puede restaurarse.");
  if (!backup.checksum) throw new Error("El backup no tiene checksum registrado. Valídalo primero.");

  const ruta = rutaSegura(config, backup.ruta);

  const stat = await fsp.stat(ruta).catch(() => null);
  if (!stat || !stat.isFile()) throw new Error("El archivo del backup no existe en el servidor.");

  const checksumActual = await calcularChecksum(ruta);
  if (checksumActual !== backup.checksum) {
    throw new Error(`El checksum no coincide. El backup fue alterado o está corrupto (${backup.checksum} != ${checksumActual}).`);
  }

  const dumpValido = await validarArchivoDump(ruta);
  if (!dumpValido.valido) throw new Error(`El archivo no es un dump válido: ${dumpValido.motivo}`);

  await registrarActividad({
    tipo: "backup",
    accion: "restaurar",
    titulo: `Restauración iniciada: ${backup.nombre_archivo}`,
    subtitulo: "Creando backup previo de la base de datos actual.",
    usuarioNombre,
    referenciaId: id,
  });

  await adquirirLock(config, "restauración", `SELECT_${backup.nombre_archivo}`);

  let backupPrevioId: number | null = null;
  try {
    // 1) Punto de recuperación obligatorio antes de tocar la BD actual.
    const previo = await producirDumpSinLock(config, "prerestore", {
      motivo: `Backup previo a restauración de ${backup.nombre_archivo}`,
      usuarioId,
      usuarioNombre,
    });
    backupPrevioId = previo.id;
    if (!previo.ok) {
      throw new Error("No se continuó con la restauración: falló el backup previo de seguridad.");
    }

    // 2) Restauración con mysql (el dump se envía por stdin, sin cargarlo en memoria).
    const args: string[] = [];
    if (config.db.host) args.push("-h", config.db.host);
    if (config.db.port !== 3306) args.push("-P", String(config.db.port));
    if (config.db.user) args.push("-u", config.db.user);
    args.push(config.db.database);

    const resultado = await new Promise<{ ok: boolean; error: string | null }>((resolve) => {
      const child = spawn(config.mysql, args, {
        env: { ...process.env, MYSQL_PWD: config.db.password },
        stdio: ["pipe", "ignore", "pipe"],
        windowsHide: true,
      });

      const streamEntrada = fs.createReadStream(ruta);
      let stderr = "";

      streamEntrada.on("error", (err) => {
        child.kill();
        resolve({ ok: false, error: `No se pudo leer el dump: ${err.message}` });
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      streamEntrada.pipe(child.stdin);

      child.on("error", (err: any) => {
        const detalle =
          err?.code === "ENOENT"
            ? `No se encontró el comando "${config.mysql}". Verifica BACKUP_MYSQL_PATH o el PATH del servidor.`
            : err?.message || String(err);
        resolve({ ok: false, error: detalle });
      });

      child.stdin.on("error", () => {
        // mysql pudo cerrar el stdin: generalmente indica fin de restauración.
      });

      child.on("close", (code) => {
        if (code !== 0) {
          resolve({ ok: false, error: (stderr || "").trim() || `mysql terminó con código ${code}` });
          return;
        }
        resolve({ ok: true, error: null });
      });
    });

    if (!resultado.ok) {
      await registrarActividad({
        tipo: "backup",
        accion: "restaurar",
        titulo: `Restauración FALLIDA: ${backup.nombre_archivo}`,
        subtitulo: resultado.error,
        usuarioNombre,
        referenciaId: id,
      });
      throw new Error(resultado.error || "Error al restaurar la base de datos.");
    }

    // 3) Marcar el backup como RESTAURADO y registrar el éxito.
    await pool.query(`UPDATE backups SET estado = 'RESTAURADO', error = NULL, fecha_fin = NOW(), fase = NULL WHERE id = ?`, [id]);

    await registrarActividad({
      tipo: "backup",
      accion: "restaurar",
      titulo: `Restauración completada: ${backup.nombre_archivo}`,
      subtitulo: `Backup previo de seguridad: ${backupPrevioId}`,
      usuarioNombre,
      referenciaId: id,
    });

    return { ok: true, error: null, backupRestauradoId: id, backupPrevioId, checksumVerificado: true };
  } finally {
    await liberarLock(config);
  }
}

// -----------------------------------------------------------------------------
// PERIODOS (cierre / archivado histórico)
// -----------------------------------------------------------------------------

export interface PeriodoRecord {
  id: number;
  anio: number;
  mes: number;
  estado: "ABIERTO" | "CERRADO" | "ARCHIVADO";
  fecha_cierre: string | null;
  usuario_cierre: string | null;
  backup_id: number | null;
}

export async function listarPeriodos(): Promise<PeriodoRecord[]> {
  const [rows]: any = await pool.query(`SELECT * FROM periodos ORDER BY anio DESC, mes DESC`);
  return (rows || []).map((r: any) => ({
    id: Number(r.id),
    anio: Number(r.anio),
    mes: Number(r.mes),
    estado: r.estado,
    fecha_cierre: r.fecha_cierre,
    usuario_cierre: r.usuario_cierre,
    backup_id: r.backup_id != null ? Number(r.backup_id) : null,
  }));
}

export async function estadoPeriodoPorFecha(
  fecha: string | null | undefined
): Promise<{ existe: boolean; estado: "ABIERTO" | "CERRADO" | "ARCHIVADO" | null; anio: number | null; mes: number | null }> {
  if (!fecha || typeof fecha !== "string") return { existe: false, estado: null, anio: null, mes: null };

  const d = new Date(fecha);
  if (isNaN(d.getTime())) return { existe: false, estado: null, anio: null, mes: null };

  const anio = d.getFullYear();
  const mes = d.getMonth() + 1;
  if (anio < 2000 || anio > 2100 || mes < 1 || mes > 12) {
    return { existe: false, estado: null, anio, mes };
  }

  let rows: any;
  try {
    [rows] = await pool.query(
      `SELECT estado FROM periodos WHERE anio = ? AND mes = ? LIMIT 1`,
      [anio, mes]
    );
  } catch (error: any) {
    if (error?.errno === 1146 || error?.code === "ER_NO_SUCH_TABLE") {
      return { existe: false, estado: null, anio, mes };
    }
    throw error;
  }

  if (!rows?.[0]) return { existe: false, estado: null, anio, mes };
  return { existe: true, estado: rows[0].estado, anio, mes };
}

// =============================================================================
// GUARD DE PERIODOS CERRADOS / ARCHIVADOS
// =============================================================================
// Impide registrar documentos nuevos (CxC/CxP/importaciones/valorizaciones)
// cuya fecha pertenezca a un periodo CERRADO o ARCHIVADO.

export async function verificarPeriodoRegistrable(
  fecha: string | null | undefined
): Promise<{ permitido: boolean; motivo?: string }> {
  const p = await estadoPeriodoPorFecha(fecha);

  if (p.estado === "CERRADO" || p.estado === "ARCHIVADO") {
    const periodo = `${p.anio}-${String(p.mes).padStart(2, "0")}`;
    return {
      permitido: false,
      motivo: `El periodo ${periodo} está ${p.estado.toLowerCase()}. Reabra el periodo desde Configuración > Archivo Histórico para registrar documentos con esta fecha.`,
    };
  }

  return { permitido: true };
}

export async function asegurarPeriodo(anio: number, mes: number): Promise<void> {
  await pool.query(
    `INSERT INTO periodos (anio, mes, estado) VALUES (?, ?, 'ABIERTO')
     ON DUPLICATE KEY UPDATE anio = VALUES(anio)`,
    [anio, mes]
  );
}

export async function cerrarYArchivarPeriodo(input: {
  anio: number;
  mes: number;
  usuarioId: number | null;
  usuarioNombre: string | null;
}): Promise<{ periodo: PeriodoRecord | null; backup: ResultadoBackup | null; ok: boolean; error: string | null }> {
  const { anio, mes, usuarioId, usuarioNombre } = input;

  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    throw new Error("Año inválido.");
  }
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error("Mes inválido.");
  }

  await asegurarPeriodo(anio, mes);

  const [filas]: any = await pool.query(`SELECT * FROM periodos WHERE anio = ? AND mes = ? LIMIT 1`, [anio, mes]);
  const periodo = filas?.[0];
  if (!periodo) throw new Error("No se pudo localizar el periodo.");

  if (periodo.estado === "ARCHIVADO") {
    return { periodo: null, backup: null, ok: false, error: "El periodo ya está archivado." };
  }

  const motivo = `Cierre de periodo ${anio}-${String(mes).padStart(2, "0")}`;
  const backup = await ejecutarBackup("archivo", { motivo, usuarioId, usuarioNombre });
  if (!backup.ok) {
    return { periodo: null, backup, ok: false, error: backup.error };
  }

  await pool.query(
    `UPDATE periodos
     SET estado = 'ARCHIVADO', fecha_cierre = NOW(), usuario_cierre = ?, backup_id = ?
     WHERE anio = ? AND mes = ?`,
    [usuarioNombre, backup.id, anio, mes]
  );

  const [nuevo]: any = await pool.query(`SELECT * FROM periodos WHERE anio = ? AND mes = ? LIMIT 1`, [anio, mes]);

  await registrarActividad({
    tipo: "periodo",
    accion: "archivar",
    titulo: `Periodo ${anio}-${String(mes).padStart(2, "0")} CERRADO Y ARCHIVADO`,
    subtitulo: `Respaldo asociado: ${backup.nombre}`,
    usuarioNombre,
    referenciaId: nuevo?.[0]?.id != null ? Number(nuevo[0].id) : null,
  });

  return { periodo: nuevo?.[0] ?? periodo, backup, ok: true, error: null };
}

export async function reabrirPeriodo(id: number, usuarioNombre: string | null): Promise<void> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE periodos SET estado = 'ABIERTO', fecha_cierre = NULL, usuario_cierre = NULL, backup_id = NULL WHERE id = ?`,
    [id]
  );
  if (result.affectedRows === 0) throw new Error("El periodo no existe.");

  await registrarActividad({
    tipo: "periodo",
    accion: "actualizar",
    titulo: `Periodo #${id} reabierto`,
    subtitulo: "El periodo vuelve a estado ABIERTO.",
    usuarioNombre,
    referenciaId: id,
  });
}

// -----------------------------------------------------------------------------
// RESUMEN PARA LA INTERFAZ
// -----------------------------------------------------------------------------

export interface ResumenRespaldo {
  ultimo: BackupRecord | null;
  EnProceso: boolean;
  espacioTotal: number;
  cantidad: number;
  retencion: { daily: number; weekly: number; monthly: number };
  dir: string;
  mysqldumpDisponible: boolean;
}

export async function obtenerResumenRespaldo(): Promise<ResumenRespaldo> {
  const config = obtenerConfigBackup();
  await asegurarDirectorios(config);

  const [enProceso]: any = await pool.query(
    `SELECT id FROM backups WHERE estado = 'EN_PROCESO' LIMIT 1`
  );
  const [totales]: any = await pool.query(
    `SELECT IFNULL(SUM(tamano), 0) AS espacio, COUNT(*) AS cantidad FROM backups WHERE estado IN ('COMPLETADO','RESTAURADO')`
  );
  const [ultimo]: any = await pool.query(
    `SELECT * FROM backups WHERE estado IN ('COMPLETADO','RESTAURADO') ORDER BY id DESC LIMIT 1`
  );

  let mysqldumpDisponible = false;
  try {
    await new Promise((resolve) => {
      const child = spawn(config.mysqldump, ["--version"], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
      child.on("error", () => resolve(null));
      child.on("close", () => resolve(null));
    });
    mysqldumpDisponible = true;
  } catch {
    mysqldumpDisponible = false;
  }

  return {
    ultimo: ultimo?.[0] ? mapearBackup(ultimo[0]) : null,
    EnProceso: (enProceso?.length || 0) > 0,
    espacioTotal: Number(totales?.[0]?.espacio ?? 0),
    cantidad: Number(totales?.[0]?.cantidad ?? 0),
    retencion: config.retencion,
    dir: config.dir,
    mysqldumpDisponible,
  };
}