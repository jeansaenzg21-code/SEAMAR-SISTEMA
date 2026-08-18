import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const moneda = searchParams.get("moneda") || "PEN";

    const [rows]: any = await pool.query(
      `SELECT
        id,
        archivo_nombre,
        banco,
        moneda,
        total_movimientos,
        conciliados,
        pendientes,
        observaciones,
        fecha_proceso,
        estado
      FROM conciliaciones_bancarias
      WHERE moneda = ?
      ORDER BY id DESC`,
      [moneda]
    );

    const historial = rows.map((row: any) => ({
  id: row.id,
  archivoNombre: row.archivo_nombre,
  banco: row.banco,
  fecha: row.fecha_proceso,
  moneda: row.moneda,
  totalMovimientos: row.total_movimientos,
  conciliados: row.conciliados,
  pendientes: row.pendientes,
  observaciones: row.observaciones,
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