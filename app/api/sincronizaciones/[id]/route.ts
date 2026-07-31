import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/mysql";
import { obtenerEventosSincronizacion } from "@/lib/sync-events";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  const { id } = await params;

  const [rows]: any =
    await pool.query(
      `
      SELECT *
      FROM sincronizaciones
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

  if (rows.length === 0) {

    return NextResponse.json(
      {
        success: false,
        error: "Sincronización no encontrada"
      },
      {
        status: 404
      }
    );

  }

  const eventos =
    obtenerEventosSincronizacion(
      Number(id)
    );

  return NextResponse.json({
    ...rows[0],
    eventos
  });

}