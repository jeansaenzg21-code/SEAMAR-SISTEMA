import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const moneda = searchParams.get("moneda") || "PEN";
    console.log("=== DIAGNÓSTICO HISTORIAL ===");
    console.log("moneda recibida en history:", JSON.stringify(moneda));
    console.log("Consulta historial: SELECT id, archivo_nombre, banco, moneda, ... FROM conciliaciones_bancarias WHERE moneda = ? ORDER BY id DESC");
    console.log("Params: moneda=%s", moneda);

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
    console.log("Filas devueltas por historial:", rows.length);
    if (rows.length > 0) {
      console.log("Historial:", JSON.stringify(rows, null, 2));
    }

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