import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const connection = await pool.getConnection();

  try {
    const id = params.id;

    // 1. Cabecera
    const [cabecera]: any = await connection.query(
      `SELECT * FROM conciliaciones_bancarias WHERE id = ?`,
      [id]
    );

    if (!cabecera.length) {
      return NextResponse.json(
        { success: false, error: "Conciliación no encontrada" },
        { status: 404 }
      );
    }

    // 2. Movimientos
    const [movimientos]: any = await connection.query(
      `SELECT * FROM conciliacion_movimientos WHERE conciliacion_id = ?`,
      [id]
    );

    // 3. Coincidencias
    const [coincidencias]: any = await connection.query(
      `SELECT * FROM conciliacion_movimiento_coincidencias cmc
       JOIN conciliacion_movimientos cm
       ON cmc.movimiento_id = cm.id
       WHERE cm.conciliacion_id = ?`,
      [id]
    );

    connection.release();

    return NextResponse.json({
      success: true,
      cabecera: cabecera[0],
      movimientos,
      coincidencias,
    });

  } catch (error: any) {
    connection.release();

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}