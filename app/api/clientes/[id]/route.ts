import { NextResponse } from "next/server"
import pool from "@/lib/mysql"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const [rows]: any = await pool.query(
      `
      SELECT *
      FROM clientes
      WHERE id = ?
      `,
      [id]
    )

    if (rows.length === 0) {
      return NextResponse.json(
        {
          message: "Cliente no encontrado",
        },
        {
          status: 404,
        }
      )
    }

    return NextResponse.json(rows[0])

  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        message: "Error al obtener cliente",
      },
      {
        status: 500,
      }
    )
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const {
      razon_social,
      contacto_principal,
      correo,
      telefono,
      direccion,
    } = await request.json()

    await pool.query(
      `
      UPDATE clientes
      SET
        razon_social = ?,
        contacto_principal = ?,
        correo = ?,
        telefono = ?,
        direccion = ?
      WHERE id = ?
      `,
      [
        razon_social,
        contacto_principal,
        correo,
        telefono,
        direccion,
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
        message: "Error al actualizar cliente",
      },
      {
        status: 500,
      }
    )
  }
}