import type { Importador, ItemDetectado } from "./types"
import { procesarDocumento } from "@/lib/openai-documentos"
import { guardarValorizacionesConDocumentos } from "./index"
import { VALORIZACION_PROMPT_TDP } from "@/lib/ai/valorizacion-prompt-tdp"

const EMPRESA_CLIENTE_TDP = "TERMINALES DEL PERÚ"

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
    empresa: string,
    buffer: Buffer,
    nombreArchivo: string,
    _seleccion: string[],
    creadoPor?: string
  ) {
    const json = await procesarDocumento(buffer, nombreArchivo, "valorizacion", VALORIZACION_PROMPT_TDP)

    // La empresa seleccionada en el diálogo define el cliente de la valorización.
    json.empresaCliente = EMPRESA_CLIENTE_TDP
    json.forzarCliente = true

    const datos = [json]

    return guardarValorizacionesConDocumentos(
      datos,
      buffer,
      nombreArchivo,
      creadoPor
    )
  },
}
