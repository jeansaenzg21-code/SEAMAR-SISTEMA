import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/mysql"
import { obtenerSesion } from "@/lib/session"
import { registrarActividad } from "@/lib/actividad"
import type { ResultSetHeader } from "mysql2/promise"

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

interface Params {
  params: Promise<{ id: string }>
}

function formatMonto(monto: number, moneda: string): string {
  const valor = Number(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (moneda === "DOLARES") return `US$ ${valor}`
  return `S/ ${valor}`
}

// Recalcula saldo y estado de la cuenta por pagar a partir de sus
// programaciones pagadas.
async function recalcularObligacion(connection: any, cxpId: number, sesion: any) {
  const [obligaciones]: any = await connection.query(
    `SELECT cxp.*, pr.razon_social AS proveedor
     FROM cuentas_por_pagar cxp
     LEFT JOIN proveedores pr ON cxp.proveedor_id = pr.id
     WHERE cxp.id = ?`,
    [cxpId]
  )
  if (obligaciones.length === 0) return
  const cxp = obligaciones[0]

  const [pagos]: any = await connection.query(
    `SELECT COALESCE(SUM(monto_pagado), 0) AS total_pagado
     FROM programaciones_pago
     WHERE cuenta_por_pagar_id = ? AND estado = 'PAGADO'`,
    [cxpId]
  )
  const totalPagado = Number(pagos[0]?.total_pagado || 0)
  const nuevoSaldo = Math.max(0, Number(cxp.monto) - totalPagado)

  let estado = cxp.estado
  const fechaVenc = cxp.fecha_vencimiento ? String(cxp.fecha_vencimiento).slice(0, 10) : null
  const hoy = new Date().toISOString().slice(0, 10)

  if (nuevoSaldo <= 0) {
    estado = "PAGADO"
  } else if (fechaVenc && fechaVenc < hoy) {
    estado = "VENCIDO"
  } else {
    estado = "PENDIENTE"
  }

  await connection.query(
    `UPDATE cuentas_por_pagar SET saldo = ?, estado = ? WHERE id = ?`,
    [nuevoSaldo, estado, cxpId]
  )

  // Si la obligación quedó completamente pagada, registrar actividad de la CXP
  if (nuevoSaldo <= 0) {
    registrarActividad({
      tipo: "cxp",
      accion: "pagar",
      titulo: `Cuenta por pagar ${cxp.numero_documento} pagada`,
      subtitulo: `${cxp.proveedor || cxp.numero_documento} · ${formatMonto(totalPagado, cxp.moneda || "SOLES")}`,
      usuarioNombre: sesion?.nombre || null,
      referenciaId: cxpId,
    }).catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// POST /api/programacion-pagos/[id]/pagar  -> registrar pago ejecutado
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest, { params }: Params) {
  const sesion = await obtenerSesion()
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { id } = await params
  try {
    const programacionId = Number(id)
    const body = await request.json()

    const connection = await pool.getConnection()
    await connection.beginTransaction()

    try {
      const [existentes]: any = await connection.query(
        `SELECT * FROM programaciones_pago WHERE id = ?`,
        [programacionId]
      )
      if (existentes.length === 0) {
        throw new Error("Programación no encontrada.")
      }
      const actual = existentes[0]

      if (actual.estado === "PAGADO") {
        throw new Error("Esta programación ya fue pagada.")
      }
      if (actual.estado === "CANCELADO") {
        throw new Error("Esta programación fue cancelada.")
      }

      let montoPagado = numero(body.monto_pagado)
      if (montoPagado === null) montoPagado = Number(actual.monto)
      if (montoPagado <= 0) {
        throw new Error("El monto pagado debe ser mayor a 0.")
      }
      if (montoPagado > Number(actual.monto)) {
        throw new Error("El monto pagado no puede exceder el monto programado.")
      }
      montoPagado = Number(montoPagado.toFixed(2))

      const fechaPago = texto(body.fecha_pago) || new Date().toISOString().slice(0, 10)
      const referenciaPago = texto(body.referencia_pago)
      const observaciones = texto(body.observaciones) ?? actual.observaciones

      await connection.query<ResultSetHeader>(
        `UPDATE programaciones_pago
         SET estado = 'PAGADO', fecha_pago = ?, monto_pagado = ?, referencia_pago = ?, observaciones = ?
         WHERE id = ?`,
        [fechaPago, montoPagado, referenciaPago, observaciones, programacionId]
      )

      await recalcularObligacion(connection, actual.cuenta_por_pagar_id, sesion)

      await connection.commit()

      const montoStr = formatMonto(montoPagado, actual.moneda || "SOLES")
      registrarActividad({
        tipo: "programacion_pago",
        accion: "pagar",
        titulo: `Pago registrado para ${actual.numero_documento || actual.proveedor_id || ""} por ${montoStr}`,
        subtitulo: `Referencia ${referenciaPago || "—"} · ${fechaPago}`,
        usuarioNombre: sesion.nombre,
        referenciaId: programacionId,
      }).catch(() => {})

      return NextResponse.json({ success: true })
    } catch (txError: any) {
      await connection.rollback()
      console.error("[PROG-PAGOS-PAGAR-TX]", txError)
      return NextResponse.json({ success: false, error: txError.message || "No se pudo registrar el pago." }, { status: 400 })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error("[PROG-PAGOS-PAGAR]", error)
    return NextResponse.json({ success: false, error: "No se pudo registrar el pago." }, { status: 500 })
  }
}
