import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/mysql"
import { obtenerSesion } from "@/lib/session"
import { registrarActividad } from "@/lib/actividad"
import { generarCodigoCuenta } from "@/lib/codigo-cuenta"
import { normalizarMoneda } from "@/lib/moneda"
import { verificarPeriodoRegistrable } from "@/lib/backups"
import { resolverVencimiento } from "@/lib/vencimiento"

function texto(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const result = String(value).trim()
  return result || null
}

function numero(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const result = Number(value)
  return Number.isFinite(result) ? result : null
}

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion()
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  try {
    const factura = (await request.json()).factura || {}
    const numeroFactura = texto(factura.numeroDocumento)
    const clienteNombre = texto(factura.cliente)
    const ruc = texto(factura.rucCliente)
    const monto = numero(factura.monto)

    if (!numeroFactura || !clienteNombre || monto === null) {
      return NextResponse.json(
        { error: "Faltan cliente, número de documento o monto." },
        { status: 400 },
      )
    }

    const [duplicados]: any = await pool.query(
      `SELECT cxc.id FROM cuentas_por_cobrar cxc
       LEFT JOIN clientes c ON c.id = cxc.cliente_id
       WHERE cxc.numero_factura = ? AND (? IS NULL OR c.ruc = ?)
       LIMIT 1`,
      [numeroFactura, ruc, ruc],
    )
    if (duplicados.length > 0) {
      return NextResponse.json({ error: "La factura ya existe.", duplicado: true }, { status: 409 })
    }

    const [clientes]: any = await pool.query(
      "SELECT id FROM clientes WHERE (? IS NOT NULL AND ruc = ?) OR razon_social = ? LIMIT 1",
      [ruc, ruc, clienteNombre],
    )
    let clienteId = clientes[0]?.id
    if (!clienteId) {
      const [nuevo]: any = await pool.query(
        "INSERT INTO clientes (razon_social, ruc, estado) VALUES (?, ?, 'ACTIVO')",
        [clienteNombre, ruc],
      )
      clienteId = nuevo.insertId
    }

    const codigo = await generarCodigoCuenta("CXC", texto(factura.fechaEmision))
    const { fecha: vencimientoFinal, origen: vencimientoOrigen } = resolverVencimiento(texto(factura.fechaVencimiento), true)

    const periodo = await verificarPeriodoRegistrable(texto(factura.fechaEmision))
    if (!periodo.permitido) {
      return NextResponse.json({ error: periodo.motivo }, { status: 409 })
    }

    const [resultado]: any = await pool.query(
      `INSERT INTO cuentas_por_cobrar
       (codigo, cliente_id, numero_factura, descripcion, monto, moneda,
        detraccion, forma_pago, categorizacion, saldo, fecha_emision,
        fecha_vencimiento, vencimiento_origen, estado, archivo_onedrive_id, archivo_nombre, archivo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?, ?, ?)`,
      [
        codigo,
        clienteId,
        numeroFactura,
        texto(factura.servicio),
        monto,
        normalizarMoneda(factura.moneda) ?? "SOLES",
        numero(factura.detraccion),
        texto(factura.formaPago),
        texto(factura.categorizacion) || "OTROS",
        monto,
        texto(factura.fechaEmision),
        vencimientoFinal,
        vencimientoOrigen,
        texto(factura.archivo?.itemId),
        texto(factura.archivo?.nombre),
        texto(factura.archivo?.webUrl),
      ],
    )

    registrarActividad({
      tipo: "cxc",
      accion: "crear",
      titulo: `Factura ${numeroFactura} importada`,
      subtitulo: clienteNombre,
      usuarioNombre: sesion.nombre,
      referenciaId: resultado.insertId,
    }).catch(() => {})

    return NextResponse.json({ ok: true, id: resultado.insertId })
  } catch (error) {
    console.error("[CXC-IMPORT]", error)
    return NextResponse.json({ error: "No se pudo guardar la factura." }, { status: 500 })
  }
}
