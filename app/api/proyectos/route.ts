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

const contrato =
  formData.get("contrato") as File | null

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
}
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
}
        INSERT INTO proyectos (
  cliente_id,
  nombre,
  descripcion,
  estado,
  fecha_inicio,
  contrato_nombre,
  contrato_onedrive_id,
  contrato_url
)
VALUES (?, ?, ?, 'EN_CURSO', CURDATE(), ?, ?, ?)
        `,
        [
  cliente_id,
  nombre,
  descripcion || null,
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
        message:
          "Error al registrar proyecto",
      },
      {
        status: 500,
      }
    )
  }
}