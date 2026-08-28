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

// Estados de programación que "reservan" saldo pendiente de la obligación.
const ESTADOS_RESERVAN: string[] = ["PROGRAMADO", "PENDIENTE", "VENCIDO"]

// ---------------------------------------------------------------------------
// GET: calendario mensual de vencimientos + bandeja del día.
// Solo considera obligaciones con fecha_vencimiento definida y saldo pendiente.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const sesion = await obtenerSesion()
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  try {
    const searchParams = request.nextUrl.searchParams
    const proveedorId = searchParams.get("proveedorId")
    const proyectoId = searchParams.get("proyectoId")
    const moneda = searchParams.get("moneda")
    const documento = searchParams.get("documento")
    const incluirProgramadas = searchParams.get("incluirProgramadas") !== "false"

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const hoyISO = hoy.toISOString().slice(0, 10)

    // Mes a mostrar en el calendario (por defecto el actual)
    const year = Number(searchParams.get("year")) || hoy.getFullYear()
    const month = Number(searchParams.get("month")) || hoy.getMonth() // 0-11
    const diasEnMes = new Date(year, month + 1, 0).getDate()

    // ---- Consulta de obligaciones con vencimiento y saldo pendiente ----
    const paramsObligaciones: any[] = []
    let whereObligaciones = `
      WHERE cxp.estado IN ('PENDIENTE','VENCIDO')
        AND cxp.saldo > 0
        AND cxp.fecha_vencimiento IS NOT NULL
    `

    if (proveedorId) {
      whereObligaciones += ` AND cxp.proveedor_id = ?`
      paramsObligaciones.push(Number(proveedorId))
    }
    if (proyectoId) {
      whereObligaciones += ` AND cxp.proyecto_id = ?`
      paramsObligaciones.push(Number(proyectoId))
    }
    if (moneda) {
      whereObligaciones += ` AND cxp.moneda = ?`
      paramsObligaciones.push(moneda)
    }
    if (documento) {
      whereObligaciones += ` AND cxp.numero_documento LIKE ?`
      paramsObligaciones.push(`%${documento}%`)
    }
    if (!incluirProgramadas) {
      whereObligaciones += `
        AND cxp.id NOT IN (
          SELECT cuenta_por_pagar_id
          FROM programaciones_pago
          WHERE estado IN ('PROGRAMADO','PENDIENTE','VENCIDO')
        )
      `
    }

    const [obligaciones]: any = await pool.query(
      `
      SELECT
        cxp.id,
        cxp.codigo,
        cxp.proveedor_id,
        pr.razon_social AS proveedor,
        cxp.proyecto_id,
        p.nombre AS proyecto,
        cxp.numero_documento,
        cxp.monto,
        cxp.saldo,
        cxp.moneda,
        DATE_FORMAT(cxp.fecha_vencimiento, '%Y-%m-%d') AS fecha_vencimiento,
        DATE_FORMAT(cxp.fecha_emision, '%Y-%m-%d') AS fecha_emision,
        cxp.forma_pago,
        cxp.categorizacion,
        cxp.estado AS estado_obligacion,
        COALESCE(
          SUM(CASE WHEN pp.estado IN ('PROGRAMADO','PENDIENTE','VENCIDO') THEN pp.monto ELSE 0 END),
          0
        ) AS monto_programado
      FROM cuentas_por_pagar cxp
      LEFT JOIN proveedores pr ON cxp.proveedor_id = pr.id
      LEFT JOIN proyectos p ON cxp.proyecto_id = p.id
      LEFT JOIN programaciones_pago pp ON pp.cuenta_por_pagar_id = cxp.id
      ${whereObligaciones}
      GROUP BY cxp.id
      ORDER BY cxp.fecha_vencimiento ASC, cxp.id ASC
      `,
      paramsObligaciones
    )

    const enriquecidas = (obligaciones as any[]).map((o) => {
      const programado = Number(o.monto_programado)
      const disponible = Number(
        (Number(o.saldo) - programado).toFixed(2)
      )
      const fechaVenc = String(o.fecha_vencimiento).slice(0, 10)
      const diffDias = Math.floor(
        (new Date(fechaVenc + "T00:00:00").getTime() - hoy.getTime()) / 86400000
      )

      let prioridad: "VENCIDO" | "VENCE_HOY" | "PROXIMO" | "PENDIENTE" = "PENDIENTE"
      if (fechaVenc < hoyISO) prioridad = "VENCIDO"
      else if (fechaVenc === hoyISO) prioridad = "VENCE_HOY"
      else if (diffDias <= 7) prioridad = "PROXIMO"

      let programacionEstado: "NO_PROGRAMADA" | "PARCIAL" | "PROGRAMADA" = "NO_PROGRAMADA"
      if (programado > 0 && programado < Number(o.saldo)) programacionEstado = "PARCIAL"
      else if (programado > 0 && programado >= Number(o.saldo)) programacionEstado = "PROGRAMADA"

      return {
        ...o,
        monto: Number(o.monto),
        saldo: Number(o.saldo),
        monto_programado: programado,
        disponible,
        fecha_vencimiento: fechaVenc,
        prioridad,
        dias_vencimiento: diffDias,
        programacion_estado: programacionEstado,
      }
    })

    // ---- Agrupar por día solo las obligaciones del mes mostrado ----
    const prefijoMes = `${year}-${String(month + 1).padStart(2, "0")}`
    const diasMap = new Map<number, any[]>()
    for (const o of enriquecidas) {
      const fv = String(o.fecha_vencimiento).slice(0, 10)
      if (!fv.startsWith(prefijoMes)) continue
      const d = Number(fv.slice(8, 10))
      if (!diasMap.has(d)) diasMap.set(d, [])
      diasMap.get(d)!.push(o)
    }

    const calendarioMes = Array.from(diasMap.entries())
      .map(([dia, items]) => ({
        dia,
        fecha: `${year}-${String(month + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`,
        total_soles: Number(items.filter((i) => i.moneda !== "DOLARES").reduce((s, i) => s + i.saldo, 0).toFixed(2)),
        total_dolares: Number(items.filter((i) => i.moneda === "DOLARES").reduce((s, i) => s + i.saldo, 0).toFixed(2)),
        items,
      }))
      .sort((a, b) => a.dia - b.dia)

    // ---- KPIs (contadores globales; totales pendientes SOLO del mes mostrado) ----
    const kpi = {
      vencidos_count: 0,
      vence_hoy_count: 0,
      proximos_count: 0,
      total_pendiente_soles: 0,
      total_pendiente_dolares: 0,
    }
    for (const o of enriquecidas) {
      if (o.prioridad === "VENCIDO") kpi.vencidos_count++
      else if (o.prioridad === "VENCE_HOY") kpi.vence_hoy_count++
      else if (o.prioridad === "PROXIMO") kpi.proximos_count++
      const fv = String(o.fecha_vencimiento).slice(0, 10)
      if (!fv.startsWith(prefijoMes)) continue
      if (o.moneda === "DOLARES") kpi.total_pendiente_dolares += o.saldo
      else kpi.total_pendiente_soles += o.saldo
    }

    // ---- Filtros ----
    const [proveedores]: any = await pool.query(
      `SELECT id, razon_social FROM proveedores WHERE estado = 'ACTIVO' ORDER BY razon_social ASC`
    )
    const [proyectos]: any = await pool.query(
      `SELECT id, nombre FROM proyectos ORDER BY nombre ASC`
    )

    // ---- Pagos programados (por su fecha_programada) dentro del mes mostrado ----
    const [programaciones]: any = await pool.query(
      `
      SELECT
        pp.id,
        pp.cuenta_por_pagar_id,
        pp.codigo,
        pr.razon_social AS proveedor,
        cxp.numero_documento,
        cxp.moneda,
        pp.monto,
        pp.estado,
        DATE_FORMAT(pp.fecha_programada, '%Y-%m-%d') AS fecha_programada,
        pp.forma_pago
      FROM programaciones_pago pp
      LEFT JOIN cuentas_por_pagar cxp ON pp.cuenta_por_pagar_id = cxp.id
      LEFT JOIN proveedores pr ON cxp.proveedor_id = pr.id
      WHERE pp.estado IN ('PROGRAMADO','PENDIENTE','VENCIDO')
        AND pp.fecha_programada >= ? AND pp.fecha_programada <= ?
      ORDER BY pp.fecha_programada ASC, pp.id ASC
      `,
      [`${prefijoMes}-01`, `${prefijoMes}-${String(diasEnMes).padStart(2, "0")}`]
    )

    const progDias = new Map<number, any[]>()
    for (const p of programaciones) {
      const fp = String(p.fecha_programada).slice(0, 10)
      if (!fp.startsWith(prefijoMes)) continue
      const d = Number(fp.slice(8, 10))
      if (!progDias.has(d)) progDias.set(d, [])
      progDias.get(d)!.push({ ...p, monto: Number(p.monto) })
    }

    const programacionesMes = Array.from(progDias.entries())
      .map(([dia, items]) => ({
        dia,
        fecha: `${prefijoMes}-${String(dia).padStart(2, "0")}`,
        total_soles: Number(items.filter((i) => i.moneda !== "DOLARES").reduce((s, i) => s + i.monto, 0).toFixed(2)),
        total_dolares: Number(items.filter((i) => i.moneda === "DOLARES").reduce((s, i) => s + i.monto, 0).toFixed(2)),
        items,
      }))
      .sort((a, b) => a.dia - b.dia)

    return NextResponse.json({
      success: true,
      mes: {
        year,
        month,
        dias_en_mes: diasEnMes,
      },
      calendario_mes: calendarioMes,
      programaciones_mes: programacionesMes,
      kpi,
      filtros: { proveedores, proyectos },
      hoy: hoyISO,
    })
  } catch (error) {
    console.error("[PROG-PAGOS-GET]", error)
    return NextResponse.json({ success: false, error: "Error al obtener las programaciones" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST: crear una o varias programaciones de pago
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion()
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  try {
    const body = await request.json()
    const items = Array.isArray(body.items) ? body.items : [body]

    if (items.length === 0) {
      return NextResponse.json({ success: false, error: "No se recibieron obligaciones para programar." }, { status: 400 })
    }

    const fechaProgramada = texto(body.fecha_programada)
    const formaPago = texto(body.forma_pago)
    const cuentaBancaria = texto(body.cuenta_bancaria)
    const observaciones = texto(body.observaciones)

    if (!fechaProgramada) {
      return NextResponse.json({ success: false, error: "La fecha programada es obligatoria." }, { status: 400 })
    }
    if (Number.isNaN(new Date(fechaProgramada).getTime())) {
      return NextResponse.json({ success: false, error: "La fecha programada no es válida." }, { status: 400 })
    }

    const connection = await pool.getConnection()
    await connection.beginTransaction()

    try {
      const creados: any[] = []

      for (const item of items) {
        const cxpId = numero(item.cuenta_por_pagar_id)
        let monto = numero(item.monto)

        if (!cxpId || cxpId <= 0) {
          throw new Error("Obligación inválida.")
        }
        if (monto === null || monto <= 0) {
          throw new Error("El monto a programar debe ser mayor a 0.")
        }
        monto = Number(monto.toFixed(2))

        // Validar existencia y estado de la obligación
        const [obligaciones]: any = await connection.query(
          `
          SELECT cxp.*, pr.razon_social AS proveedor
          FROM cuentas_por_pagar cxp
          LEFT JOIN proveedores pr ON cxp.proveedor_id = pr.id
          WHERE cxp.id = ?
          `,
          [cxpId]
        )
        if (obligaciones.length === 0) {
          throw new Error("La cuenta por pagar seleccionada no existe.")
        }
        const cxp = obligaciones[0]
        if (cxp.estado === "PAGADO" || Number(cxp.saldo) <= 0) {
          throw new Error(`La obligación ${cxp.numero_documento} ya está pagada o sin saldo pendiente.`)
        }

        // Sumar saldo ya programado en estados activos
        const [reserva]: any = await connection.query(
          `
          SELECT COALESCE(SUM(monto), 0) AS total
          FROM programaciones_pago
          WHERE cuenta_por_pagar_id = ? AND estado IN (?)
          `,
          [cxpId, ESTADOS_RESERVAN]
        )
        const yaProgramado = Number(reserva[0]?.total || 0)
        const disponible = Number(cxp.saldo) - yaProgramado

        if (monto > disponible) {
          throw new Error(
            `El monto S/ ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2 })} excede el saldo disponible de la obligación ${cxp.numero_documento} (${(disponible < 0 ? 0 : disponible).toLocaleString("es-PE", { minimumFractionDigits: 2 })}).`
          )
        }

        const [resultado]: any = await connection.query<ResultSetHeader>(
          `
          INSERT INTO programaciones_pago (
            cuenta_por_pagar_id,
            proveedor_id,
            proyecto_id,
            fecha_programada,
            fecha_vencimiento,
            moneda,
            monto,
            forma_pago,
            cuenta_bancaria,
            observaciones,
            estado,
            usuario_creacion
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PROGRAMADO', ?)
          `,
          [
            cxpId,
            cxp.proveedor_id || null,
            cxp.proyecto_id || null,
            fechaProgramada,
            cxp.fecha_vencimiento || null,
            cxp.moneda || "SOLES",
            monto,
            formaPago,
            cuentaBancaria,
            observaciones,
            sesion.nombre || "ADMIN",
          ]
        )

        creados.push({
          id: resultado.insertId,
          cuenta_por_pagar_id: cxpId,
          proveedor: cxp.proveedor || cxp.numero_documento,
          documento: cxp.numero_documento,
          monto,
          moneda: cxp.moneda || "SOLES",
        })
      }

      await connection.commit()

      // Registrar actividad por cada programación creada
      for (const creado of creados) {
        const montoStr = formatMonto(creado.monto, creado.moneda)
        registrarActividad({
          tipo: "programacion_pago",
          accion: "programar",
          titulo: `Pago programado para ${creado.proveedor} por ${montoStr}`,
          subtitulo: `Documento ${creado.documento} · pago el ${fechaProgramada}`,
          usuarioNombre: sesion.nombre,
          referenciaId: creado.id,
        }).catch(() => {})
      }

      return NextResponse.json({ success: true, creados: creados.map((c) => c.id) })
    } catch (txError: any) {
      await connection.rollback()
      console.error("[PROG-PAGOS-TX]", txError)
      return NextResponse.json(
        { success: false, error: txError.message || "No se pudo crear la programación." },
        { status: 400 }
      )
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error("[PROG-PAGOS-POST]", error)
    return NextResponse.json({ success: false, error: "No se pudo crear la programación." }, { status: 500 })
  }
}

function formatMonto(monto: number, moneda: string): string {
  const num = Number(monto)
  const valor = num.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (moneda === "DOLARES") return `US$ ${valor}`
  return `S/ ${valor}`
}
