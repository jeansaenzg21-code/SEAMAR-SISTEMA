import { NextResponse } from "next/server"
import pool from "@/lib/mysql"

export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT
        cxp.*,
        pr.razon_social AS proveedor,
        p.nombre AS proyecto
      FROM cuentas_por_pagar cxp
      LEFT JOIN proveedores pr
        ON cxp.proveedor_id = pr.id
      LEFT JOIN proyectos p
        ON cxp.proyecto_id = p.id
      ORDER BY cxp.id DESC
    `)

    return NextResponse.json(rows)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      proveedor_id,
      proyecto_id,

      tipo_documento,
      numero_documento,

      descripcion,

      monto,

      fecha_emision,
      fecha_vencimiento,
    } = body

    const codigo = `CXP-${Date.now()}`

    const [existente]: any = await pool.query(
      `
      SELECT id
      FROM cuentas_por_pagar
      WHERE numero_documento = ?
      LIMIT 1
      `,
      [numero_documento]
    )

    if (existente.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "El documento ya existe",
        },
        {
          status: 400,
        }
      )
    }

    const [result] = await pool.query(
      `
      INSERT INTO cuentas_por_pagar (

        codigo,

        proveedor_id,
        proyecto_id,

        tipo_documento,
        numero_documento,

        descripcion,

        monto,
        saldo,

        fecha_emision,
        fecha_vencimiento,

        estado

      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        codigo,

        proveedor_id || null,
        proyecto_id || null,

        tipo_documento || null,
        numero_documento || null,

        descripcion || null,

        monto,
        monto,

        fecha_emision || null,
        fecha_vencimiento || null,

        "PENDIENTE",
      ]
    )

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    )
  }
}