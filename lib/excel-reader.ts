import ExcelJS from "exceljs";

export async function leerExcel(
  buffer: any
) {

  const workbook =
    new ExcelJS.Workbook();

  await workbook.xlsx.load(
    buffer as any
  );

  let contenido = "";

  workbook.eachSheet((sheet) => {

    contenido += `\nHOJA: ${sheet.name}\n`;

    sheet.eachRow((row) => {

      const valores =
        row.values as any[];

      contenido +=
        valores.join(" | ") + "\n";

    });

  });

  return contenido;

}

export async function leerValorizacionesExcel(
  buffer: any,
  archivo: any
) {
  const ExcelJS = await import("exceljs");

  const workbook =
    new ExcelJS.Workbook();

  await workbook.xlsx.load(
    buffer as any
  );

  const sheet =
    workbook.worksheets[0];

  const valorizaciones: any[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

   const fechaDocumento =
  row.getCell("Y").value;

const descripcion =
  row.getCell("M").value;

const monto =
  row.getCell("J").value;

    if (
      !fechaDocumento ||
      !descripcion ||
      !monto
    ) {
      return;
    }

    valorizaciones.push({
      tipoDocumento: "valorizacion",
      proveedor: "SEAMAR",
      descripcion: String(descripcion),
      monto: Number(monto),
      moneda: "PEN",
      fechaEjecucion: fechaDocumento,
      negocioOperacion: "VALORIZACION_EXCEL",
      numeroOrdenServicio:
  String(row.getCell("K").value || ""),

      archivoNombre: archivo.nombre,
      archivoOnedriveId: archivo.itemId,
      archivoUrl: archivo.webUrl,
    });
  });

  return valorizaciones;
}