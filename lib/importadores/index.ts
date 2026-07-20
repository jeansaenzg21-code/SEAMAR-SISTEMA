import type { Importador, ResultadoImportacion } from "./types"
import { repsolImportador } from "./repsol"
import { tdpImportador } from "./tdp"
import { tralzaImportador } from "./tralza"
import pool from "@/lib/mysql"
import { guardarValorizacion } from "@/lib/valorizaciones"
import { getAccessToken } from "@/lib/graph"
import { subirDocumentoRespaldoAOneDrive } from "@/lib/onedrive"
import { registrarActividad } from "@/lib/actividad"

const importadores: Record<string, Importador> = {
  REPSOL: repsolImportador,
  TDP: tdpImportador,
  TRALZA: tralzaImportador,
}

export function obtenerImportador(empresa: string): Importador | null {
  return importadores[empresa] ?? null
}

export async function guardarValorizacionesConDocumentos(
  datos: any[],
  archivoBuffer: Buffer,
  archivoNombre: string,
  creadoPor?: string
): Promise<ResultadoImportacion> {
  const debugId = `IMPORT_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  console.log(`[${debugId}] INICIO guardarValorizacionesConDocumentos`);
  console.log(`[${debugId}] datos.length:`, datos.length);
  console.log(`[${debugId}] archivoNombre:`, archivoNombre);
  console.log(`[${debugId}] archivoBuffer.length:`, archivoBuffer.length);

  if (datos.length === 0) {
    console.log(`[${debugId}] No hay datos, retornando error`);
    return { success: false, error: "No hay datos para importar" }
  }

  console.log(`[${debugId}] Obteniendo token...`);
  const token = await getAccessToken()
  console.log(`[${debugId}] Token obtenido (primeros 20):`, token?.slice(0, 20) + "...");

  console.log(`[${debugId}] INICIANDO subida a OneDrive (1 sola llamada)...`);
  console.time("onedrive_subida")
  const archivoSubido = await subirDocumentoRespaldoAOneDrive(archivoNombre, archivoBuffer, token)
  console.timeEnd("onedrive_subida")
  console.log(`[${debugId}] Subida completada: nombre=${archivoSubido.nombre} itemId=${archivoSubido.itemId}`);

  for (const data of datos) {
    if (!data.archivoNombre) data.archivoNombre = archivoSubido.nombre
    if (!data.archivoOnedriveId) data.archivoOnedriveId = archivoSubido.itemId
    if (!data.archivoUrl) data.archivoUrl = archivoSubido.webUrl
  }

  const guardadas: any[] = []

  console.log(`[${debugId}] Procesando ${datos.length} valorizaciones en el loop...`);
  for (const data of datos) {
    console.log(`[${debugId}] Procesando valorización: codigo=${data.codigo || "sin código"} proveedor=${data.proveedor}`);
    console.time("guardar_valorizacion_individual")
    if (data.codigo) {
      const [existe]: any = await pool.query(
        `SELECT id FROM valorizaciones WHERE codigo = ? LIMIT 1`,
        [data.codigo]
      )
      if (existe.length > 0) { console.timeEnd("guardar_valorizacion_individual"); console.log(`[${debugId}] Valorización duplicada (codigo=${data.codigo}), saltando`); continue }
    }

    console.log(`[${debugId}] Llamando a guardarValorizacion...`);
    await guardarValorizacion(data, creadoPor)

    console.time("insert_valorizacion_documentos")
    const [rows]: any = data.codigo
      ? await pool.query(
          `SELECT id FROM valorizaciones WHERE codigo = ? AND archivo_onedrive_id = ? LIMIT 1`,
          [data.codigo, archivoSubido.itemId]
        )
      : await pool.query(
          `SELECT id FROM valorizaciones WHERE archivo_onedrive_id = ? ORDER BY id DESC LIMIT 1`,
          [archivoSubido.itemId]
        )

    if (rows.length > 0) {
      await pool.query(
        `INSERT INTO valorizacion_documentos (valorizacion_id, nombre, onedrive_id, url) VALUES (?, ?, ?, ?)`,
        [rows[0].id, archivoSubido.nombre, archivoSubido.itemId, archivoSubido.webUrl]
      )
    }
    console.timeEnd("insert_valorizacion_documentos")

    guardadas.push(data)
    console.timeEnd("guardar_valorizacion_individual")
  }

  console.log(`[${debugId}] FINAL: ${guardadas.length} valorizaciones guardadas de ${datos.length} totales`);
  console.log(`[${debugId}] FIN guardarValorizacionesConDocumentos`);

  if (guardadas.length > 0) {
    await registrarActividad({
      tipo: "valorizacion",
      accion: "importacion",
      titulo: `Se importaron ${guardadas.length} valorizaciones`,
      subtitulo: `Archivo: ${archivoNombre}`,
      usuarioNombre: creadoPor || null,
    })
  }

  return {
    success: true,
    creadas: guardadas.length,
    data: guardadas,
  }
}
