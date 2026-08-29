import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/mysql";
import { generarCodigoCuenta } from "@/lib/codigo-cuenta";
import { verificarPeriodoRegistrable } from "@/lib/backups";
import { resolverVencimiento } from "@/lib/vencimiento";
import {
  consultarCuentas,
  numeroFiltro,
  type FiltrosCuenta,
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

function parsearFiltros(searchParams: URLSearchParams): FiltrosCuenta {
  return {
    estado: searchParams.get("estado") || null,
    tercero: searchParams.get("cliente") || null,
    q: searchParams.get("q") || null,
    year: numeroFiltro(searchParams.get("year"), 2000, 2100),
    month: numeroFiltro(searchParams.get("month"), 1, 12),
    day: numeroFiltro(searchParams.get("day"), 1, 31),
    page: Math.max(1, Number(searchParams.get("page") || "1") || 1),
    pageSize: Math.min(200, Math.max(1, Number(searchParams.get("pageSize") || "50") || 50)),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resultado = await consultarCuentas(CONFIG, parsearFiltros(searchParams));

    return NextResponse.json({
      success: true,
      rows: resultado.rows,
      total: resultado.total,
      totalPages: resultado.totalPages,
      page: resultado.page,
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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      cliente_id,
      proyecto_id,
      valorizacion_id,
      numero_factura,
descripcion,
        monto,
        fecha_emision,
        fecha_vencimiento,
      } = body;

    const codigo = await generarCodigoCuenta("CXC", fecha_emision);
    const { fecha: vencimientoFinal, origen: vencimientoOrigen } = resolverVencimiento(fecha_vencimiento, false);

    const periodo = await verificarPeriodoRegistrable(fecha_emision);
    if (!periodo.permitido) {
      return NextResponse.json(
        { success: false, message: periodo.motivo },
        { status: 409 }
      );
    }

    const [existente]: any = await pool.query(
      `
      SELECT id
      FROM cuentas_por_cobrar
      WHERE numero_factura = ?
      LIMIT 1
      `,
      [numero_factura]
    );

    if (existente.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "La factura ya existe",
        },
        {
          status: 400,
        }
      );
    }

    const [result] = await pool.query(
      `
      INSERT INTO cuentas_por_cobrar (
        codigo,
        cliente_id,
        proyecto_id,
        valorizacion_id,
        numero_factura,
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
        cliente_id || null,
        proyecto_id || null,
        valorizacion_id || null,
        numero_factura || null,
        descripcion || null,
        monto,
        monto,
        fecha_emision || null,
        vencimientoFinal,
        vencimientoOrigen,
        "PENDIENTE",
      ]
    );

    return NextResponse.json({
      success: true,
      result,
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