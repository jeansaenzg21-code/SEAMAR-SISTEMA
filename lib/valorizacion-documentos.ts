import pool from "@/lib/mysql"

/**
 * Verifica si una valorización ya tiene un documento de respaldo con el mismo
 * onedrive_id o el mismo nombre. Evita registrar duplicados.
 */
export async function existeDocumentoValorizacion(
  valorizacionId: string | number,
  nombre: string,
  onedriveId?: string
): Promise<boolean> {
  const [rows]: any = await pool.query(
    `SELECT id FROM valorizacion_documentos
     WHERE valorizacion_id = ?
       AND (onedrive_id = ? OR nombre = ?)
     LIMIT 1`,
    [valorizacionId, onedriveId ?? "", nombre]
  )
  return rows.length > 0
}

/**
 * Devuelve una etiqueta corta y legible del cliente a partir de su razón
 * social/proveedor, para usarla en mensajes automáticos del sistema.
 */
export function nombreCortoCliente(proveedor: string): string {
  const nombre = String(proveedor || "")
    .trim()
    .toUpperCase()

  if (!nombre) return "CLIENTE"

  if (nombre.includes("REPSOL")) return "REPSOL"

  if (nombre.includes("TERMINALES")) return "TDP"

  if (
    nombre.includes("TRALZA") ||
    nombre.includes("TRALSA") ||
    nombre.includes("TRANSPORTES Y ALMACENAMIENTO")
  ) {
    return "TRALSA"
  }

  const primeraPalabra = nombre.split(/\s+/)[0]
  return primeraPalabra || nombre
}

/**
 * Cantidad mínima de documentos de respaldo que debe tener una valorización.
 * Regla de negocio centralizada: REPSOL exige 4 documentos, el resto 3.
 */
export function documentosRequeridos(proveedor: string): number {
  const nombre = String(proveedor || "").trim().toUpperCase()
  return nombre.includes("REPSOL") ? 4 : 3
}