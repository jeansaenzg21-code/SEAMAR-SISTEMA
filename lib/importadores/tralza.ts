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

    json.empresaCliente = "TRALZA"
    json.proveedor = "TRALZA"
    json.proyecto = `OS ${json.numeroOrdenServicio}`

    const datos = [json]

    return guardarValorizacionesConDocumentos(
      datos,
      buffer,
      nombreArchivo,
      creadoPor
    )
  },
}
