import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { PythonShell } from "python-shell";
import pool from "@/lib/mysql";
export async function POST(
  request: Request
) {

  try {

    const formData =
      await request.formData();

    const archivo =
      formData.get("archivo") as File;

    if (!archivo) {

      return NextResponse.json(
        {
          success: false,
          error: "No se recibió archivo"
        },
        {
          status: 400
        }
      );

    }

    const bytes =
      await archivo.arrayBuffer();

    const buffer =
      Buffer.from(bytes);

    const rutaArchivo =
      join(
        process.cwd(),
        "temp.xlsx"
      );

    await writeFile(
      rutaArchivo,
      buffer
    );

    const resultado =
      await PythonShell.run(
        "python/conciliar_facturas.py",
        {
          args: [rutaArchivo]
        }
      );

    const json =
      JSON.parse(
        resultado.join("")
      );

      const [insertResult]: any =
  await pool.query(
    `
    INSERT INTO conciliaciones_facturas
    (
      archivo_nombre,
      total_excel,
      coincidencias,
      no_encontradas,
      diferencias_monto,
      usuario,
      estado
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      archivo.name,
      json.totalExcel || 0,
      json.coincidencias || 0,
      json.noEncontradas || 0,
      json.diferenciasMonto || 0,
      "ADMIN",
      "PROCESADA"
    ]
  );

const conciliacionId =
  insertResult.insertId;

    return NextResponse.json({
  ...json,
  conciliacionId
});

  } catch (error: any) {

    console.error(error);

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