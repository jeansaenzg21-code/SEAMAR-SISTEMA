import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export interface ExcelColumn {
  header: string;
  key: string;
  width: number;
}

export interface ExcelStatusStyle {
  value: string;
  fill: string;
}

export interface ExcelTotalRow {
  labelCol: number;
  label: string;
  valueCol: number;
  value: number;
}

export interface ExcelReportConfig {
  empresaNombre: string;
  titulo: string;
  periodo: string;
  columns: ExcelColumn[];
  moneda: string;
  data: Record<string, any>[];
  monedaColumns?: number[];
  dateColumns?: number[];
  statusColumn?: number;
  statusStyles?: ExcelStatusStyle[];
  totalRows?: ExcelTotalRow[];
}

function monedaFormat(moneda: string): string {
  return moneda === "DOLARES" ? '"US$ " #,##0.00' : '"S/ " #,##0.00';
}

export async function buildExcelBuffer(config: ExcelReportConfig): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(config.titulo);

  const totalCols = config.columns.length;
  const lastColLetter = String.fromCharCode(64 + totalCols);

  // Título
  worksheet.mergeCells(`A1:${lastColLetter}1`);
  worksheet.getCell("A1").value = config.empresaNombre;
  worksheet.getCell("A1").font = { bold: true, size: 20 };
  worksheet.getCell("A1").alignment = { horizontal: "left" };

  // Subtítulo
  worksheet.mergeCells(`A2:${lastColLetter}2`);
  worksheet.getCell("A2").value = config.titulo;
  worksheet.getCell("A2").font = { bold: true, size: 14 };
  worksheet.getCell("A2").alignment = { horizontal: "left" };

  // Periodo
  worksheet.mergeCells(`A3:${lastColLetter}3`);
  worksheet.getCell("A3").value = `Periodo: ${config.periodo}`;
  worksheet.getCell("A3").font = { italic: true };
  worksheet.getCell("A3").alignment = { horizontal: "left" };

  // Fecha de generación
  worksheet.getCell("A5").value = `Generado: ${new Date().toLocaleDateString("es-PE")}`;

  // Anchos de columna
  config.columns.forEach((col, i) => {
    worksheet.getColumn(i + 1).width = col.width;
  });

  // Insertar fila vacía para encabezados en fila 7
  worksheet.spliceRows(7, 0, []);

  const headerRow = worksheet.getRow(7);
  headerRow.values = config.columns.map((c) => c.header);

  for (let col = 1; col <= totalCols; col++) {
    const cell = headerRow.getCell(col);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E3A8A" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  }

  // Auto filter
  worksheet.autoFilter = { from: `A7`, to: `${lastColLetter}7` };

  // Data rows
  let filaActual = 8;
  for (const row of config.data) {
    const excelRow = worksheet.getRow(filaActual);
    excelRow.values = config.columns.map((c) => row[c.key] ?? null);

    // Formato moneda en columnas específicas
    const fmt = monedaFormat(config.moneda);
    (config.monedaColumns || []).forEach((colIdx) => {
      excelRow.getCell(colIdx).value = Number(row[config.columns[colIdx - 1].key] || 0);
      excelRow.getCell(colIdx).numFmt = fmt;
    });

    // Formato fecha
    (config.dateColumns || []).forEach((colIdx) => {
      excelRow.getCell(colIdx).numFmt = "dd/mm/yyyy";
    });

    // Bordes
    excelRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Estilos por estado
    if (config.statusColumn && config.statusStyles) {
      const estadoCell = excelRow.getCell(config.statusColumn);
      const estadoValor = row[config.columns[config.statusColumn - 1].key];
      const style = config.statusStyles.find((s) => s.value === estadoValor);
      if (style) {
        estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: style.fill } };
      }
    }

    filaActual++;
  }

  // Formato de columna global para moneda y fecha
  const fmtGeneral = monedaFormat(config.moneda);
  (config.monedaColumns || []).forEach((colIdx) => {
    worksheet.getColumn(colIdx).numFmt = fmtGeneral;
  });
  (config.dateColumns || []).forEach((colIdx) => {
    worksheet.getColumn(colIdx).numFmt = "dd/mm/yyyy";
  });

  // Total rows
  (config.totalRows || []).forEach((total) => {
    addTotalRow(worksheet, filaActual, total.labelCol, total.label, total.valueCol, total.value);
    filaActual++;
  });

  // Congelar encabezado
  worksheet.views = [{ state: "frozen", ySplit: 7 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function addTotalRow(
  worksheet: ExcelJS.Worksheet,
  row: number,
  labelCol: number,
  label: string,
  valueCol: number,
  value: number
): void {
  const labelCell = worksheet.getCell(`${String.fromCharCode(64 + labelCol)}${row}`);
  labelCell.value = label;
  labelCell.font = { bold: true };
  labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9EAD3" } };

  const valueCell = worksheet.getCell(`${String.fromCharCode(64 + valueCol)}${row}`);
  valueCell.value = value;
  valueCell.font = { bold: true };
  valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9EAD3" } };
}

export function excelResponse(buffer: Buffer, filename: string): NextResponse {
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
}

export function buildExcelResponse(config: ExcelReportConfig & { filename: string }): Promise<NextResponse> {
  return buildExcelBuffer(config).then((buffer) => excelResponse(buffer, config.filename));
}
