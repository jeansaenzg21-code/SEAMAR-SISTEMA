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

// ---------------------------------------------------------------------------
// GET /api/programacion-pagos/[id]  -> detalle
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest, { params }: Params) {
  const sesion = await obtenerSesion()
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { id } = await params
  try {
    const [rows]: any = await pool.query(
      `
      SELECT
        pp.*,
        pr.razon_social AS proveedor,
        p.nombre AS proyecto,
        cxp.numero_documento,
        cxp.codigo AS codigo_obligacion,
        cxp.monto AS monto_obligacion,
        cxp.saldo AS saldo_obligacion,
        cxp.moneda AS moneda_obligacion,
        cxp.fecha_vencimiento AS vencimiento_obligacion
      FROM programaciones_pago pp
      LEFT JOIN proveedores pr ON pp.proveedor_id = pr.id
      LEFT JOIN proyectos p ON pp.proyecto_id = p.id
      LEFT JOIN cuentas_por_pagar cxp ON pp.cuenta_por_pagar_id = cxp.id
      WHERE pp.id = ?
      `,
      [Number(id)]
    )
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Programación no encontrada." }, { status: 404 })
    }
    return NextResponse.json({ success: true, programacion: rows[0] })
  } catch (error) {
    console.error("[PROG-PAGOS-GET-ID]", error)
    return NextResponse.json({ success: false, error: "Error al obtener la programación." }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/programacion-pagos/[id]  -> editar (fecha, monto, forma de pago...)
// ---------------------------------------------------------------------------
export async function PATCH(request: NextRequest, { params }: Params) {
  const sesion = await obtenerSesion()
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { id } = await params
  try {
    const body = await request.json()
    const programacionId = Number(id)

    const [existentes]: any = await pool.query(
      `SELECT * FROM programaciones_pago WHERE id = ?`,
      [programacionId]
    )
    if (existentes.length === 0) {
      return NextResponse.json({ success: false, error: "Programación no encontrada." }, { status: 404 })
    }
    const actual = existentes[0]

    // Solo se pueden editar programaciones no pagadas ni canceladas
    if (actual.estado === "PAGADO" || actual.estado === "CANCELADO") {
      return NextResponse.json(
        { success: false, error: "No se puede modificar una programación pagada o cancelada." },
        { status: 400 }
      )
    }

    const fechaProgramada = texto(body.fecha_programada) || String(actual.fecha_programada).slice(0, 10)
    let monto = numero(body.monto)
    const formaPago = texto(body.forma_pago) ?? actual.forma_pago
    const cuentaBancaria = texto(body.cuenta_bancaria) ?? actual.cuenta_bancaria
    const observaciones = texto(body.observaciones) ?? actual.observaciones

    if (!fechaProgramada || Number.isNaN(new Date(fechaProgramada).getTime())) {
      return NextResponse.json({ success: false, error: "La fecha programada no es válida." }, { status: 400 })
    }
    if (monto === null || monto <= 0) {
      return NextResponse.json({ success: false, error: "El monto debe ser mayor a 0." }, { status: 400 })
    }
    monto = Number(monto.toFixed(2))

    // Validar límite de saldo disponible considerando las demás programaciones activas
    if (monto !== Number(actual.monto)) {
      const [reserva]: any = await pool.query(
        `SELECT COALESCE(SUM(monto), 0) AS total
         FROM programaciones_pago
         WHERE cuenta_por_pagar_id = ? AND estado IN ('PROGRAMADO','PENDIENTE','VENCIDO') AND id != ?`,
        [actual.cuenta_por_pagar_id, programacionId]
      )
      const [obligacion]: any = await pool.query(
        `SELECT saldo FROM cuentas_por_pagar WHERE id = ?`,
        [actual.cuenta_por_pagar_id]
      )
      const saldo = Number(obligacion[0]?.saldo || 0)
      const disponible = saldo - Number(reserva[0]?.total || 0)
      if (monto > disponible + Number(actual.monto)) {
        return NextResponse.json(
          { success: false, error: `El monto excede el saldo disponible (${formatMonto(Math.max(0, disponible + Number(actual.monto)), actual.moneda)}).` },
          { status: 400 }
        )
      }
    }

    await pool.query<ResultSetHeader>(
      `UPDATE programaciones_pago
       SET fecha_programada = ?, monto = ?, forma_pago = ?, cuenta_bancaria = ?, observaciones = ?
       WHERE id = ?`,
      [fechaProgramada, monto, formaPago, cuentaBancaria, observaciones, programacionId]
    )

    const montoStr = formatMonto(monto, actual.moneda || "SOLES")
    registrarActividad({
      tipo: "programacion_pago",
      accion: "actualizar",
      titulo: `Programación de pago modificada por ${montoStr}`,
      subtitulo: `Documento ${actual.numero_documento || ""} · pago el ${fechaProgramada}`.trim(),
      usuarioNombre: sesion.nombre,
      referenciaId: programacionId,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[PROG-PAGOS-PATCH]", error)
    return NextResponse.json({ success: false, error: "No se pudo modificar la programación." }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/programacion-pagos/[id]  -> cancelar programación
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest, { params }: Params) {
  const sesion = await obtenerSesion()
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { id } = await params
  try {
    const programacionId = Number(id)

    const [existentes]: any = await pool.query(
      `SELECT * FROM programaciones_pago WHERE id = ?`,
      [programacionId]
    )
    if (existentes.length === 0) {
      return NextResponse.json({ success: false, error: "Programación no encontrada." }, { status: 404 })
    }
    const actual = existentes[0]

    if (actual.estado === "PAGADO") {
      return NextResponse.json(
        { success: false, error: "No se puede cancelar una programación ya pagada." },
        { status: 400 }
      )
    }
    if (actual.estado === "CANCELADO") {
      return NextResponse.json(
        { success: false, error: "La programación ya fue cancelada." },
        { status: 400 }
      )
    }

    await pool.query<ResultSetHeader>(
      `UPDATE programaciones_pago SET estado = 'CANCELADO' WHERE id = ?`,
      [programacionId]
    )

    registrarActividad({
      tipo: "programacion_pago",
      accion: "eliminar",
      titulo: `Programación de pago cancelada`,
      subtitulo: `Documento ${actual.numero_documento || ""} · ${formatMonto(actual.monto, actual.moneda || "SOLES")}`.trim(),
      usuarioNombre: sesion.nombre,
      referenciaId: programacionId,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[PROG-PAGOS-DELETE]", error)
    return NextResponse.json({ success: false, error: "No se pudo cancelar la programación." }, { status: 500 })
  }
}
