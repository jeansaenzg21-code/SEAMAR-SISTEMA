import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function POST(
  request: Request
) {
  const connection =
    await pool.getConnection();

  try {

    const {
      movimientoId,
      documentoId,
      origen
    } = await request.json();

    await connection.query(
      `
      UPDATE conciliacion_movimientos
      SET
        estado = 'conciliado',
        documento_id = ?,
        origen = ?,
        conciliado_manual = 1
      WHERE id = ?
      `,
      [
        documentoId,
        origen,
        movimientoId
      ]
    );

    await connection.query(
  `
  DELETE FROM conciliacion_movimiento_coincidencias
  WHERE movimiento_id = ?
  AND documento_id <> ?
  `,
  [
    movimientoId,
    documentoId
  ]
);

    return NextResponse.json({
      success: true
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

  } finally {

    connection.release();

  }
}