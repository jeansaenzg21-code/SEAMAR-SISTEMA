import { NextResponse } from "next/server"
import pool from "@/lib/mysql"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const url = new URL(req.url)
    const soloActivas = url.searchParams.get("activas") === "true"

    const [observaciones] = await pool.query(
      `
      SELECT
        id,
        tipo,
        observacion,
        usuario,
        fecha,
        estado,
        fecha_en_progreso,
        fecha_resolucion
      FROM valorizacion_observaciones
      WHERE valorizacion_id = ?${soloActivas ? " AND estado <> 'RESUELTA'" : ""}
      ORDER BY id DESC
      `,
      [id]
    )

    const [documentos] = await pool.query(
      `
      SELECT
        id,
        nombre,
        url,
        created_at
      FROM valorizacion_documentos
      WHERE valorizacion_id = ?
      ORDER BY id DESC
      `,
      [id]
    )

    return NextResponse.json({
      success: true,
      observaciones,
      documentos,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener detalle de valorización",
      },
      { status: 500 }
    )
  }
}