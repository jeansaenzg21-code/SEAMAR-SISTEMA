import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/mysql"
import { generarCodigoCuenta } from "@/lib/codigo-cuenta"
import { verificarPeriodoRegistrable } from "@/lib/backups"
import { resolverVencimiento } from "@/lib/vencimiento"
import {
  consultarCuentas,
  numeroFiltro,
  type FiltrosCuenta,
} from "@/lib/cuentas-query"

const CONFIG = {
  tabla: "cuentas_por_pagar",
  alias: "cxp",
  select:
    "cxp.*, pr.razon_social AS proveedor, p.nombre AS proyecto, ps.nombre_servicio AS servicio",
  joins: `
    LEFT JOIN proveedores pr ON cxp.proveedor_id = pr.id
    LEFT JOIN proyectos p ON cxp.proyecto_id = p.id
    LEFT JOIN proyecto_servicios ps ON cxp.servicio_id = ps.id`,
  numeroCol: "cxp.numero_documento",
  terceroRef: "pr.razon_social",
  camposBusqueda: [
    "cxp.codigo",
    "cxp.numero_documento",
    "pr.razon_social",
    "p.nombre",
    "ps.nombre_servicio",
    "cxp.descripcion",
  ],
}

function parsearFiltros(searchParams: URLSearchParams): FiltrosCuenta {
  return {
    estado: searchParams.get("estado") || null,
    tercero: searchParams.get("proveedor") || null,
    q: searchParams.get("q") || null,
    year: numeroFiltro(searchParams.get("year"), 2000, 2100),
    month: numeroFiltro(searchParams.get("month"), 1, 12),
    day: numeroFiltro(searchParams.get("day"), 1, 31),
    page: Math.max(1, Number(searchParams.get("page") || "1") || 1),
    pageSize: Math.min(200, Math.max(1, Number(searchParams.get("pageSize") || "50") || 50)),
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const resultado = await consultarCuentas(CONFIG, parsearFiltros(searchParams))

    return NextResponse.json({
      success: true,
      rows: resultado.rows,
      total: resultado.total,
      totalPages: resultado.totalPages,
      page: resultado.page,
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

    const codigo = await generarCodigoCuenta("CXP", fecha_emision)
    const { fecha: vencimientoFinal, origen: vencimientoOrigen } = resolverVencimiento(fecha_vencimiento, false)

    const periodo = await verificarPeriodoRegistrable(fecha_emision)
    if (!periodo.permitido) {
      return NextResponse.json(
        { success: false, message: periodo.motivo },
        { status: 409 }
      )
    }

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
        vencimiento_origen,

        estado

      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        vencimientoFinal,
        vencimientoOrigen,

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