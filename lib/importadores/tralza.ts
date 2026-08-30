import type { Importador, ItemDetectado } from "./types"
import { procesarDocumento } from "@/lib/openai-documentos"
import { guardarValorizacionesConDocumentos } from "./index"
import { VALORIZACION_PROMPT_TRALZA } from "@/lib/ai/valorizacion-prompt-tralza"

export const tralzaImportador: Importador = {
  async detectar(buffer: Buffer, nombreArchivo: string) {
    const items: ItemDetectado[] = [
      {
        id: nombreArchivo,
        nombre: nombreArchivo,
      },
    ]

    return { items }
  },

  async importar(
    _empresa: string,
    buffer: Buffer,
    nombreArchivo: string,
    _seleccion: string[],
    creadoPor?: string
  ) {
    console.time("procesar_documento")
    const json = await procesarDocumento(buffer, nombreArchivo, "valorizacion", VALORIZACION_PROMPT_TRALZA)
    console.timeEnd("procesar_documento")

    if (!json.numeroOrdenServicio) {
      throw new Error("No se pudo obtener el número de Orden de Servicio del documento")
    }

    // Solo dígitos, conservando ceros a la izquierda ("OS 00000117" -> "00000117").
    const osSoloDigitos = String(json.numeroOrdenServicio).replace(/[^\d]/g, "")
    if (!osSoloDigitos) {
      throw new Error("No se pudo obtener el número de Orden de Servicio del documento")
    }
    json.numeroOrdenServicio = osSoloDigitos

    json.empresaCliente = "TRALZA"
    json.proveedor = "TRALZA"

    if (json.descripcion) {
      json.descripcion = String(json.descripcion).replace(/\s+/g, " ").trim()
    }

    // Si el sistema no encuentra un proyecto, la columna Proyecto queda en blanco:
    // la descripción va en su propia columna y no debe reutilizarse como proyecto.
    json.proyecto = ""

    const datos = [json]

    return guardarValorizacionesConDocumentos(
      datos,
      buffer,
      nombreArchivo,
      creadoPor
    )
  },
}
