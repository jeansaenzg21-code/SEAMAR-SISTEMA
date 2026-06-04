import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    const { id } = await params;

    const [rows] = await pool.query(
  `
  SELECT
    m.*,
    p.nombre AS proyecto_nombre
  FROM movimientos m
  LEFT JOIN proyectos p
    ON m.proyecto_id = p.id
  WHERE m.proveedor_id = ?
  ORDER BY m.id DESC
  `,
  [id]
);

    return NextResponse.json(rows);

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener movimientos"
      },
      {
        status: 500
      }
    );
  }
}