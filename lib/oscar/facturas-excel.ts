import ExcelJS from "exceljs";
import type { FacturaOscarAgrupada } from "./types";

const COLUMNAS: { header: string; ancho: number }[] = [
  { header: "RUC EMISOR", ancho: 15 },
  { header: "PROVEEDOR", ancho: 35 },
  { header: "RUC CLIENTE", ancho: 15 },
  { header: "CLIENTE", ancho: 35 },
  { header: "N° DOCUMENTO", ancho: 20 },
  { header: "FECHA", ancho: 12 },
  { header: "MONEDA", ancho: 10 },
  { header: "CONDICIÓN DE PAGO", ancho: 18 },
  { header: "CÓDIGO", ancho: 14 },
  { header: "CANT.", ancho: 10 },
  { header: "UNID.", ancho: 8 },
  { header: "DESCRIPCIÓN", ancho: 55 },
  { header: "V. UNIT.", ancho: 14 },
  { header: "DSCTO.", ancho: 12 },
  { header: "V. VENTA", ancho: 14 },
  { header: "TOTAL", ancho: 14 },
];

const TOTAL_COLS = COLUMNAS.length;
const ULTIMA_COL = String.fromCharCode(64 + TOTAL_COLS);

function formatoMoneda(moneda: string | null): string {
  return moneda === "DOLARES" ? '"US$ " #,##0.00' : '"S/ " #,##0.00';
}

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

export async function buildFacturasOscarExcel(
  facturas: FacturaOscarAgrupada[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Facturas");

  // Título
  worksheet.mergeCells(`A1:${ULTIMA_COL}1`);
  worksheet.getCell("A1").value = "Módulo personal";
  worksheet.getCell("A1").font = { bold: true, size: 20 };

  worksheet.mergeCells(`A2:${ULTIMA_COL}2`);
  worksheet.getCell("A2").value = "FACTURAS - CUENTAS POR PAGAR";
  worksheet.getCell("A2").font = { bold: true, size: 14 };

  worksheet.mergeCells(`A3:${ULTIMA_COL}3`);
  worksheet.getCell("A3").value = `Total de facturas: ${facturas.length}`;
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
    celda.alignment = { horizontal: "center", vertical: "middle" };
  }

  worksheet.autoFilter = { from: `A7`, to: `${ULTIMA_COL}7` };

  let filaActual = 8;

  for (const factura of facturas) {
    const lineas = factura.lineas.length > 0 ? factura.lineas : [null];
    const inicio = filaActual;
    const fin = filaActual + lineas.length - 1;

    for (const linea of lineas) {
      const fila = filaActual;
      const cab = factura.cabecera;

      worksheet.getCell(`A${fila}`).value = cab.rucEmisor;
      worksheet.getCell(`B${fila}`).value = cab.razonSocialEmisor;
      worksheet.getCell(`C${fila}`).value = cab.rucCliente;
      worksheet.getCell(`D${fila}`).value = cab.razonSocialCliente;
      worksheet.getCell(`E${fila}`).value = cab.numeroDocumento;
      worksheet.getCell(`F${fila}`).value = cab.fechaEmision ?? null;
      worksheet.getCell(`G${fila}`).value = cab.moneda;
      worksheet.getCell(`H${fila}`).value = cab.condicionPago;

      worksheet.getCell(`I${fila}`).value = linea?.codigo ?? null;
      worksheet.getCell(`J${fila}`).value = numero(linea?.cantidad);
      worksheet.getCell(`K${fila}`).value = linea?.unidad ?? null;
      worksheet.getCell(`L${fila}`).value = linea?.descripcion ?? null;
      worksheet.getCell(`M${fila}`).value = numero(linea?.valorUnitario);
      worksheet.getCell(`N${fila}`).value = numero(linea?.descuento);
      worksheet.getCell(`O${fila}`).value = numero(linea?.valorVenta);

      worksheet.getCell(`P${fila}`).value = numero(cab.total);

      bordeCeldas(worksheet, fila);

      worksheet.getCell(`F${fila}`).numFmt = "dd/mm/yyyy";
      const fmt = formatoMoneda(cab.moneda);
      worksheet.getCell(`M${fila}`).numFmt = fmt;
      worksheet.getCell(`N${fila}`).numFmt = fmt;
      worksheet.getCell(`O${fila}`).numFmt = fmt;
      worksheet.getCell(`P${fila}`).numFmt = fmt;

      filaActual++;
    }

    // Celdas combinadas para los campos generales (A-H) y total (P)
    if (fin > inicio) {
      for (const col of ["A", "B", "C", "D", "E", "F", "G", "H", "P"]) {
        const rango = `${col}${inicio}:${col}${fin}`;
        worksheet.mergeCells(rango);
        worksheet.getCell(`${col}${inicio}`).alignment = {
          vertical: "middle",
        };
      }
    }
  }

  worksheet.views = [{ state: "frozen", ySplit: 7 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
