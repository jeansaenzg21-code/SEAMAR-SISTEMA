import { NextResponse } from "next/server"
import pool from "@/lib/mysql"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const [rows] = await pool.query(
      `
      SELECT
        id,
        nombre,
        url
      FROM valorizacion_documentos
      WHERE valorizacion_id = ?
      ORDER BY id DESC
      `,
      [id]
    )

    return NextResponse.json(rows)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      [],
      { status: 500 }
    )
  }
}