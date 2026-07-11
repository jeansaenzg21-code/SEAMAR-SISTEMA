

import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function GET() {
  try {
    const [rows]: any = await pool.query(`
      SELECT COUNT(*) AS pendientes
      FROM valorizaciones
      WHERE estado = 'EN_REVISION'
    `);

    return NextResponse.json({
      pendientes: rows[0].pendientes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener pendientes" },
      { status: 500 }
    );
  }
}