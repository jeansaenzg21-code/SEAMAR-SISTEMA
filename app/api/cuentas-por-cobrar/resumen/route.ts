import { NextRequest, NextResponse } from "next/server";
import {
  resumenCuentas,
  numeroFiltro,
} from "@/lib/cuentas-query";

const CONFIG = {
  tabla: "cuentas_por_cobrar",
  alias: "cxc",
  select:
    "cxc.*, c.razon_social AS cliente, p.nombre AS proyecto, cxc.descripcion AS servicio",
  joins: `
    LEFT JOIN clientes c ON cxc.cliente_id = c.id
    LEFT JOIN proyectos p ON cxc.proyecto_id = p.id`,
  numeroCol: "cxc.numero_factura",
  terceroRef: "c.razon_social",
  camposBusqueda: [
    "cxc.codigo",
    "cxc.numero_factura",
    "c.razon_social",
    "p.nombre",
    "cxc.descripcion",
  ],
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const resumen = await resumenCuentas(
      CONFIG,
      {
        estado: searchParams.get("estado") || null,
        tercero: searchParams.get("cliente") || null,
        q: searchParams.get("q") || null,
      },
      numeroFiltro(searchParams.get("year"), 2000, 2100),
      numeroFiltro(searchParams.get("month"), 1, 12)
    );

    return NextResponse.json({
      success: true,
      ...resumen,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}