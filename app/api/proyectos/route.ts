import { NextResponse } from "next/server"
import pool from "@/lib/mysql"
import { subirContratoAOneDrive } from "@/lib/onedrive"

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
    const formData =
      await request.formData()

    const cliente_id =
      formData.get("cliente_id")

    const nombre =
      formData.get("nombre") as string

    const descripcion =
      formData.get("descripcion") as string

    const tipo =
      formData.get("tipo") as string

    const monto =
      formData.get("monto") as string

    const moneda =
      formData.get("moneda") as string

    const fecha_inicio =
      formData.get("fecha_inicio") as string

    const fecha_fin =
      formData.get("fecha_fin") as string

    const contrato =
      formData.get("contrato") as File | null

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

    let contrato_nombre = null
    let contrato_onedrive_id = null
    let contrato_url = null

    if (
      contrato &&
      contrato.size > 0
    ) {
      const buffer =
        Buffer.from(
          await contrato.arrayBuffer()
        )

      try {
        const archivo =
          await subirContratoAOneDrive(
            contrato.name,
            buffer
          )

        contrato_nombre =
          archivo.nombre

        contrato_onedrive_id =
          archivo.itemId

        contrato_url =
          archivo.webUrl
      } catch (error) {
        console.error(
          "No se pudo subir contrato a OneDrive:",
          error
        )

        contrato_nombre =
          contrato.name
      }
    }

    const [result]: any =
      await pool.query(
        `
        INSERT INTO proyectos (
          cliente_id,
          nombre,
          descripcion,
          tipo,
          monto,
          moneda,
          estado,
          fecha_inicio,
          fecha_fin,
          contrato_nombre,
          contrato_onedrive_id,
          contrato_url
        )
        VALUES (?, ?, ?, ?, ?, ?, 'EN_CURSO', ?, ?, ?, ?, ?)
        `,
        [
          cliente_id,
          nombre,
          descripcion || null,
          tipo || "PROYECTO",
          monto ? Number(monto) : 0,
          moneda || "PEN",
          fecha_inicio || new Date().toISOString().slice(0, 10),
fecha_fin || null,
          contrato_nombre,
          contrato_onedrive_id,
          contrato_url,
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
    success: false,
    message:
      error instanceof Error
        ? error.message
        : "Error al registrar proyecto",
  },
  {
    status: 500,
  }
)
  }
}