import { NextResponse } from "next/server"
import pool from "@/lib/mysql"

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const { id } = await params

    const { estado } =
      await request.json()

    let fechaFin = null

    if (
      estado === "FINALIZADO" ||
      estado === "CANCELADO"
    ) {
      fechaFin = new Date()
    }

    await pool.query(
      `
      UPDATE proyectos
      SET
        estado = ?,
        fecha_fin = ?
      WHERE id = ?
      `,
      [
        estado,
        fechaFin,
        id,
      ]
    )

    return NextResponse.json({
      success: true,
    })

  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message:
          "Error al actualizar estado",
      },
      {
        status: 500,
      }
    )
  }
}
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
        {
          message:
            "Proyecto no encontrado",
        },
        {
          status: 404,
        }
      )
    }

    return NextResponse.json(
      rows[0]
    )

  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        message:
          "Error al obtener proyecto",
      },
      {
        status: 500,
      }
    )
  }
}