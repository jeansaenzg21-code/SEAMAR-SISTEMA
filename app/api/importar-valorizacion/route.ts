import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const empresa = formData.get("empresa");
    const modo = formData.get("modo");
    const archivo = formData.get("archivo") as File;

   if (
  empresa === "REPSOL" &&
  modo === "individual"
) {
  const arrayBuffer =
    await archivo.arrayBuffer();

  const workbook =
    new ExcelJS.Workbook();

  await workbook.xlsx.load(
    arrayBuffer as any
  );

  const hojas = workbook.worksheets
  .filter((sheet) => {
    const nombre = sheet.name
      .toUpperCase()
      .trim();

    return (
      nombre.startsWith("VAL") &&
      !nombre.includes("CONSOLIDADO") &&
      !nombre.includes("RESUMEN") &&
      !nombre.includes("COMPRA") &&
      !nombre.includes("HOJA") &&
      !nombre.includes("ANEXO")
    );
  })
  .map((sheet) => sheet.name);

console.log(
  "HOJAS DE VALORIZACIÓN:",
  hojas.length
);

console.log(hojas);

  return NextResponse.json({
    success: true,
    hojas
  });
}

    console.log("EMPRESA:", empresa);
    console.log("MODO:", modo);
    console.log("ARCHIVO:", archivo);

   
    return NextResponse.json({
      success: true,
      message: "Archivo recibido correctamente"
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      {
        status: 500
      }
    );
  }
}