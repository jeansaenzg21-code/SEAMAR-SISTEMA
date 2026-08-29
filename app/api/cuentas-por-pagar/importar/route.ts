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
    const numeroDocumento = texto(factura.numeroDocumento)
    const proveedorNombre = texto(factura.proveedor)
    const ruc = texto(factura.rucEmisor)
    const monto = numero(factura.monto)

    if (!numeroDocumento || !proveedorNombre || monto === null) {
      return NextResponse.json(
        { error: "Faltan proveedor, número de documento o monto." },
        { status: 400 },
      )
    }

    const [duplicados]: any = await pool.query(
      `SELECT cxp.id FROM cuentas_por_pagar cxp
       LEFT JOIN proveedores pr ON pr.id = cxp.proveedor_id
       WHERE cxp.numero_documento = ? AND (? IS NULL OR pr.ruc = ?)
       LIMIT 1`,
      [numeroDocumento, ruc, ruc],
    )
    if (duplicados.length > 0) {
      return NextResponse.json({ error: "La factura ya existe.", duplicado: true }, { status: 409 })
    }

    const [proveedores]: any = await pool.query(
      "SELECT id FROM proveedores WHERE (? IS NOT NULL AND ruc = ?) OR razon_social = ? LIMIT 1",
      [ruc, ruc, proveedorNombre],
    )
    let proveedorId = proveedores[0]?.id
    if (!proveedorId) {
      const [nuevo]: any = await pool.query(
        "INSERT INTO proveedores (razon_social, ruc, estado) VALUES (?, ?, 'ACTIVO')",
        [proveedorNombre, ruc],
      )
      proveedorId = nuevo.insertId
    }

    const codigo = await generarCodigoCuenta("CXP", texto(factura.fechaEmision))
    const { fecha: vencimientoFinal, origen: vencimientoOrigen } = resolverVencimiento(texto(factura.fechaVencimiento), true)

    const periodo = await verificarPeriodoRegistrable(texto(factura.fechaEmision))
    if (!periodo.permitido) {
      return NextResponse.json({ error: periodo.motivo }, { status: 409 })
    }

    const [resultado]: any = await pool.query(
      `INSERT INTO cuentas_por_pagar
       (codigo, proveedor_id, numero_documento, detraccion, forma_pago,
        categorizacion, descripcion, monto, moneda, saldo, fecha_emision,
        fecha_vencimiento, vencimiento_origen, estado, archivo_url, archivo_onedrive_id, archivo_nombre)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?, ?, ?)`,
      [
        codigo,
        proveedorId,
        numeroDocumento,
        numero(factura.detraccion),
        texto(factura.formaPago),
        texto(factura.categorizacion) || "OTROS",
        texto(factura.servicio),
        monto,
        normalizarMoneda(factura.moneda) ?? "SOLES",
        monto,
        texto(factura.fechaEmision),
        vencimientoFinal,
        vencimientoOrigen,
        texto(factura.archivo?.webUrl),
        texto(factura.archivo?.itemId),
        texto(factura.archivo?.nombre),
      ],
    )

    registrarActividad({
      tipo: "cxp",
      accion: "crear",
      titulo: `Factura ${numeroDocumento} importada`,
      subtitulo: proveedorNombre,
      usuarioNombre: sesion.nombre,
      referenciaId: resultado.insertId,
    }).catch(() => {})

    return NextResponse.json({ ok: true, id: resultado.insertId })
  } catch (error) {
    console.error("[CXP-IMPORT]", error)
    return NextResponse.json({ error: "No se pudo guardar la factura." }, { status: 500 })
  }
}
