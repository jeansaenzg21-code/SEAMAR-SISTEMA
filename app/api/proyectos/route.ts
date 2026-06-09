import { NextResponse } from "next/server"
import pool from "@/lib/mysql"

export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT
        p.*,
        c.razon_social as cliente_nombre
      FROM proyectos p
      LEFT JOIN clientes c
        ON p.cliente_id = c.id
      ORDER BY p.id DESC
    `)

    return NextResponse.json(rows)

  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener proyectos",
      },
      {
        status: 500,
      }
    )
  }
}


export async function POST(
  request: Request
) {

  try {
    const {
      cliente_id,
      nombre,
      descripcion,
    } = await request.json()

    if (!nombre?.trim()) {
      return NextResponse.json(
        {
          message:
            "El nombre del proyecto es obligatorio",
        },
        {
          status: 400,
        }
      )
    }

    const [result]: any =
      await pool.query(
        `
        INSERT INTO proyectos (
          cliente_id,
          nombre,
          descripcion,
          estado,
          fecha_inicio
        )
        VALUES (?, ?, ?, 'EN_CURSO', CURDATE())
        `,
        [
          cliente_id,
          nombre,
          descripcion || null,
        ]
      )

    return NextResponse.json({
      success: true,
      id: result.insertId,
    })

  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        message:
          "Error al registrar proyecto",
      },
      {
        status: 500,
      }
    )
  }
}