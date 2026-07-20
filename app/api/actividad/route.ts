import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/mysql";
import { obtenerSesion } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const limit =
      Number(request.nextUrl.searchParams.get("limit")) || 20;

    const sesion = await obtenerSesion();
    const esAdmin = sesion?.rol === "ADMINISTRADOR";

    let query =
      `
      SELECT
        id,
        tipo,
        accion,
        titulo,
        subtitulo,
        usuario_nombre,
        leido,
        created_at
      FROM actividad_sistema
      `;

    const params: any[] = [];

    if (sesion && !esAdmin) {
      query += ` WHERE usuario_nombre = ?`;
      params.push(sesion.nombre);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    const [rows] = await pool.query(query, params);

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