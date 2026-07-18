import { NextResponse } from "next/server";
import pool from "@/lib/mysql";
import { actualizarDocumentoPorConciliacion } from "@/lib/conciliacion";

export async function POST(
  request: Request
) {
  const connection =
    await pool.getConnection();

  try {

    const {
      movimientoId,
      documentoId,
      origen,
    } = await request.json();

    await connection.beginTransaction();

    // Obtener la fecha del movimiento y conciliacion_id antes de actualizar
    const [movRows]: any = await connection.query(
      `SELECT cm.fecha, cm.conciliacion_id
       FROM conciliacion_movimientos cm
       WHERE cm.id = ?`,
      [movimientoId]
    );

    if (!movRows.length) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, error: "Movimiento no encontrado" },
        { status: 404 }
      );
    }

    const fechaMovimiento = movRows[0].fecha;
    const conciliacionId = movRows[0].conciliacion_id;

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

    // Actualizar estado del documento conciliado
    await actualizarDocumentoPorConciliacion(
      connection,
      origen,
      Number(documentoId)
    );

    await connection.commit();

    return NextResponse.json({
      success: true
    });

  } catch (error: any) {

    await connection.rollback();
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
