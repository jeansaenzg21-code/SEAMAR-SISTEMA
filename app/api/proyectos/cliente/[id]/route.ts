import { NextResponse } from "next/server"
import pool from "@/lib/mysql"

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    const { id } = await params

    const [rows]: any =
      await pool.query(
        `
        SELECT *
        FROM proyectos
        WHERE cliente_id = ?
        ORDER BY fecha_creacion DESC
        `,
        [id]
      )

    return NextResponse.json(rows)

  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        message:
          "Error al obtener proyectos",
      },
      {
        status: 500,
      }
    )
  }
}