import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function GET() {
  try {
    const [rows]: any = await pool.query(`
      SELECT
        id,
        archivo_nombre,
        banco,
        moneda,
        total_movimientos,
        fecha_proceso,
        estado
      FROM conciliaciones_bancarias
      ORDER BY id DESC
    `);

    const historial = rows.map((row: any) => ({
  id: row.id,
  archivoNombre: row.archivo_nombre,
  banco: row.banco,
  fecha: row.fecha_proceso,
  moneda: row.moneda,
  totalMovimientos: row.total_movimientos,
  estado: row.estado,
}));

    return NextResponse.json({
      success: true,
      historial,
    });

  } catch (error: any) {

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );

  }
}