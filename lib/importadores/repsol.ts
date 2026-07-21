import * as XLSX from "xlsx"
import type { Importador, ItemDetectado } from "./types"
import { leerValorizacionesExcel } from "@/lib/excel-reader"
import { guardarValorizacionesConDocumentos } from "./index"

export const repsolImportador: Importador = {
  async detectar(buffer: Buffer, nombreArchivo: string) {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellStyles: false,
    cellFormula: false,
    cellDates: false,
  });

  const hojas = workbook.SheetNames.filter((name) => {
    const nombre = name.toUpperCase().trim();
    return (
      nombre.startsWith("VAL") &&
      !nombre.includes("CONSOLIDADO") &&
      !nombre.includes("RESUMEN") &&
      !nombre.includes("COMPRA") &&
      !nombre.includes("HOJA") &&
      !nombre.includes("ANEXO")
    );
  });

  const items: ItemDetectado[] = hojas.map((hoja) => ({
    id: hoja,
    nombre: hoja,
  }));

  return { items };
},

  async importar(
    buffer: Buffer,
    nombreArchivo: string,
    seleccion: string[],
    creadoPor?: string
  ) {

    console.log("========== ENTRÉ A REPSOL.IMPORTAR ==========");
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
