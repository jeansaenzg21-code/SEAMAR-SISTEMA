import { NextResponse } from "next/server"
import pool from "@/lib/mysql"

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const { id } = await params

    const [rows]: any =
      await pool.query(
        `
        SELECT *
        FROM proyectos
        WHERE id = ?
        LIMIT 1
        `,
        [id]
      )

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Proyecto no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json(rows[0])
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { message: "Error al obtener proyecto" },
      { status: 500 }
    )
  }
}