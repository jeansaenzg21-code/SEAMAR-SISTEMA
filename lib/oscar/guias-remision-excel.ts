import ExcelJS from "exceljs";
import type {
  BienGuiaRemision,
  GuiaRemisionOscar,
} from "./guias-remision-types";

const COLUMNAS: { header: string; ancho: number }[] = [
  { header: "N° GUÍA", ancho: 16 },
  { header: "FECHA TRASLADO", ancho: 16 },
  { header: "MOTIVO", ancho: 24 },
  { header: "DESTINATARIO", ancho: 34 },
  { header: "RUC", ancho: 14 },
  { header: "DIRECCIÓN", ancho: 32 },
  { header: "CÓDIGO", ancho: 16 },
  { header: "DESCRIPCIÓN", ancho: 48 },
  { header: "MARCA", ancho: 14 },
  { header: "MODELO", ancho: 16 },
  { header: "SERIE", ancho: 18 },
  { header: "REF", ancho: 16 },
  { header: "N° PARTE", ancho: 14 },
  { header: "LOTE", ancho: 14 },
  { header: "ACCESORIOS", ancho: 34 },
  { header: "UNID.", ancho: 10 },
  { header: "CANT.", ancho: 10 },
];

// Columnas que deben ajustar el texto en párrafo (wrap) dentro de la celda.
const TEXTO_ENVOLVENTE = new Set(["D", "F", "H", "O"]);

const TOTAL_COLS = COLUMNAS.length;
const ULTIMA_COL = String.fromCharCode(64 + TOTAL_COLS);

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function bordeCeldas(worksheet: ExcelJS.Worksheet, fila: number) {
  for (let col = 1; col <= TOTAL_COLS; col++) {
    const celda = worksheet.getCell(`${String.fromCharCode(64 + col)}${fila}`);
    celda.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  }
}

export async function buildGuiasRemisionExcel(
  guias: GuiaRemisionOscar[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Guías de remisión");

  worksheet.mergeCells(`A1:${ULTIMA_COL}1`);
  worksheet.getCell("A1").value = "Módulo personal";
  worksheet.getCell("A1").font = { bold: true, size: 20 };

  worksheet.mergeCells(`A2:${ULTIMA_COL}2`);
  worksheet.getCell("A2").value = "GUÍAS DE REMISIÓN";
  worksheet.getCell("A2").font = { bold: true, size: 14 };

  worksheet.mergeCells(`A3:${ULTIMA_COL}3`);
  worksheet.getCell("A3").value = `Total de guías: ${guias.length}`;
  worksheet.getCell("A3").font = { italic: true };

  worksheet.getCell("A5").value = `Generado: ${new Date().toLocaleDateString("es-PE")}`;

  COLUMNAS.forEach((col, i) => {
    worksheet.getColumn(i + 1).width = col.ancho;
  });

  worksheet.spliceRows(7, 0, []);
  const headerRow = worksheet.getRow(7);

  for (let col = 1; col <= TOTAL_COLS; col++) {
    const celda = headerRow.getCell(col);
    celda.value = COLUMNAS[col - 1].header;
    celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E3A8A" } };
    celda.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }

  worksheet.autoFilter = { from: `A7`, to: `${ULTIMA_COL}7` };

  let filaActual = 8;

  for (const guia of guias) {
    const bienes = guia.bienes.length > 0 ? guia.bienes : [null];
    const inicio = filaActual;
    const fin = filaActual + bienes.length - 1;
    const numGuia =
      [guia.guia.serie, guia.guia.numero].filter(Boolean).join("-") || "";

    for (const bien of bienes) {
      const fila = filaActual;
      const b = bien as BienGuiaRemision | null;

      worksheet.getCell(`A${fila}`).value = numGuia || null;
      worksheet.getCell(`B${fila}`).value = guia.guia.fechaInicioTraslado ?? null;
      worksheet.getCell(`C${fila}`).value = guia.guia.motivoTraslado ?? null;
      worksheet.getCell(`D${fila}`).value = guia.guia.destinatario ?? null;
      worksheet.getCell(`E${fila}`).value = guia.guia.rucCliente ?? null;
      worksheet.getCell(`F${fila}`).value = guia.guia.direccion ?? null;

      worksheet.getCell(`G${fila}`).value = b?.codigoBien ?? null;
      worksheet.getCell(`H${fila}`).value = b?.descripcion ?? null;
      worksheet.getCell(`I${fila}`).value = b?.marca ?? null;
      worksheet.getCell(`J${fila}`).value = b?.modelo ?? null;
      worksheet.getCell(`K${fila}`).value = b?.serie ?? null;
      worksheet.getCell(`L${fila}`).value = b?.ref ?? null;
      worksheet.getCell(`M${fila}`).value = b?.nroParte ?? null;
      worksheet.getCell(`N${fila}`).value = b?.lote ?? null;
      worksheet.getCell(`O${fila}`).value = b?.accesorios ?? null;
      worksheet.getCell(`P${fila}`).value = b?.unidadMedida ?? null;
      worksheet.getCell(`Q${fila}`).value = numero(b?.cantidad);

      bordeCeldas(worksheet, fila);

      worksheet.getCell(`B${fila}`).numFmt = "dd/mm/yyyy";

      // Ajuste en párrafo para las columnas de texto largo
      TEXTO_ENVOLVENTE.forEach((col) => {
        worksheet.getCell(`${col}${fila}`).alignment = {
          wrapText: true,
          vertical: "top",
        };
      });

      filaActual++;
    }

    // Cabecera (A-F) combinada para la guía
    if (fin > inicio) {
      for (const col of ["A", "B", "C", "D", "E", "F"]) {
        const rango = `${col}${inicio}:${col}${fin}`;
        worksheet.mergeCells(rango);
        worksheet.getCell(`${col}${inicio}`).alignment = {
          vertical: "middle",
          wrapText: TEXTO_ENVOLVENTE.has(col),
        };
      }
    }
  }

  worksheet.views = [{ state: "frozen", ySplit: 7 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
