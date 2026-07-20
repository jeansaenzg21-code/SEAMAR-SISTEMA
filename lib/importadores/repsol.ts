import ExcelJS from "exceljs"
import type { Importador, ItemDetectado } from "./types"
import { leerValorizacionesExcel } from "@/lib/excel-reader"
import { guardarValorizacionesConDocumentos } from "./index"

export const repsolImportador: Importador = {
  async detectar(buffer: Buffer, nombreArchivo: string) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as any)

    const hojas = workbook.worksheets
      .filter((sheet) => {
        const nombre = sheet.name.toUpperCase().trim()
        return (
          nombre.startsWith("VAL") &&
          !nombre.includes("CONSOLIDADO") &&
          !nombre.includes("RESUMEN") &&
          !nombre.includes("COMPRA") &&
          !nombre.includes("HOJA") &&
          !nombre.includes("ANEXO")
        )
      })
      .map((sheet) => sheet.name)

    const items: ItemDetectado[] = hojas.map((hoja) => ({
      id: hoja,
      nombre: hoja,
    }))

    return { items }
  },

  async importar(
    buffer: Buffer,
    nombreArchivo: string,
    seleccion: string[],
    creadoPor?: string
  ) {
    const todas = await leerValorizacionesExcel(buffer, {
      nombre: nombreArchivo,
    })

    const filtradas = todas.filter((v: any) =>
      seleccion.includes(v.hojaExcel)
    )

    return guardarValorizacionesConDocumentos(
      filtradas,
      buffer,
      nombreArchivo,
      creadoPor
    )
  },
}
