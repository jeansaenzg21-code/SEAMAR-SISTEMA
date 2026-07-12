import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function GET(request: NextRequest) {
  try {
    const limit =
      Number(request.nextUrl.searchParams.get("limit")) || 20;

    const [rows] = await pool.query(
      `
      SELECT
        id,
        tipo,
        accion,
        titulo,
        subtitulo,
        leido,
        created_at
      FROM actividad_sistema
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [limit]
    );

    return NextResponse.json({
      success: true,
      actividades: rows,
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener la actividad del sistema"
      },
      {
        status: 500
      }
    );

  }
}

export async function PATCH() {
  try {

    await pool.query(`
      UPDATE actividad_sistema
      SET leido = 1
      WHERE leido = 0
    `);

    return NextResponse.json({
      success: true
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        success: false
      },
      {
        status: 500
      }
    );

  }
}