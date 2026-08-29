import { NextRequest, NextResponse } from "next/server"
import {
  resumenCuentas,
  numeroFiltro,
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const resumen = await resumenCuentas(
      CONFIG,
      {
        estado: searchParams.get("estado") || null,
        tercero: searchParams.get("proveedor") || null,
        q: searchParams.get("q") || null,
      },
      numeroFiltro(searchParams.get("year"), 2000, 2100),
      numeroFiltro(searchParams.get("month"), 1, 12)
    )

    return NextResponse.json({
      success: true,
      ...resumen,
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