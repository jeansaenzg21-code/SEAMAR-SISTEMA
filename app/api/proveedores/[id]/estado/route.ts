import { NextResponse } from "next/server"
import pool from "@/lib/db"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.text()

console.log("BODY RECIBIDO:", body)

const { estado } = JSON.parse(body)
    const { id } = await params

    await pool.query(
      `
      UPDATE proveedores
      SET estado = ?
      WHERE id = ?
      `,
      [estado, id]
    )

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message: "Error al actualizar estado",
      },
      {
        status: 500,
      }
    )
  }
}