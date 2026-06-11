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