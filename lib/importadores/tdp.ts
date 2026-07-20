import type { Importador, ItemDetectado } from "./types"
import { procesarDocumento } from "@/lib/openai-documentos"
import { guardarValorizacionesConDocumentos } from "./index"
import { VALORIZACION_PROMPT_TDP } from "@/lib/ai/valorizacion-prompt-tdp"

export const tdpImportador: Importador = {
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
    const json = await procesarDocumento(buffer, nombreArchivo, "valorizacion", VALORIZACION_PROMPT_TDP)

    const datos = [json]

    return guardarValorizacionesConDocumentos(
      datos,
      buffer,
      nombreArchivo,
      creadoPor
    )
  },
}
