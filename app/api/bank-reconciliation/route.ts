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
        "temp_bank.xlsx"
      );

    await writeFile(
      rutaArchivo,
      buffer
    );

    const resultado =
  await PythonShell.run(
    "python/bank_reconciliation.py",
    {
      pythonPath: process.env.PYTHON_PATH,
      args: [rutaArchivo]
    }
  );

    const json =
      JSON.parse(
        resultado.join("")
      );

      console.log(
  "JSON CONCILIACION:",
  JSON.stringify(
    json,
    null,
    2
  )
);

    const [insertResult]: any =
      await pool.query(
        `
        INSERT INTO conciliaciones_bancarias
        (
          archivo_nombre,
          total_movimientos,
          conciliados,
          observaciones,
          diferencias,
          pendientes,
          usuario,
          estado
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          archivo.name,
          json.totalMovimientos || 0,
          json.conciliados || 0,
          json.observaciones || 0,
          json.diferencias || 0,
          json.pendientes || 0,
          "ADMIN",
          "PROCESADA"
        ]
      );

    const conciliacionId =
      insertResult.insertId;

    const movimientos =
  Array.isArray(json.movimientos)
    ? json.movimientos
    : [];

    for (const movimiento of movimientos) {

  const [movResult]: any =
    await pool.query(
      `
      INSERT INTO conciliacion_movimientos
      (
        conciliacion_id,
        fecha,
        referencia,
        descripcion,
        monto,
        moneda,
        tipo,
        estado,
        origen,
        documento_id,
        conciliado_manual,
        diferencia,
        causa_diferencia,
        fecha_registro
      )
      VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        conciliacionId,
        movimiento.fecha ?? null,
        movimiento.referencia ?? null,
        movimiento.descripcion ?? null,
        movimiento.monto ?? 0,
        movimiento.moneda ?? null,
        movimiento.tipo ?? null,
        movimiento.estado ?? "pendiente",
        null,
        null,
        0,
        null,
        null
      ]
    );

  const movimientoId = movResult.insertId;

  const coincidencias =
    Array.isArray(movimiento.coincidencias)
      ? movimiento.coincidencias
      : [];

  for (const coincidencia of coincidencias) {

    await pool.query(
      `
      INSERT INTO conciliacion_movimiento_coincidencias
      (
        movimiento_id,
        documento_id,
        origen,
        score,
        tipo,
        fecha_registro
      )
      VALUES
      (?, ?, ?, ?, ?, NOW())
      `,
      [
        movimientoId,
        Number(coincidencia.id),
        coincidencia.origen ?? null,
        null,
        null
      ]
    );

  }

} // <-- EL FOR CIERRA AQUÍ

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