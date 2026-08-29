import pool from "./mysql"

/**
 * Consultas para CxC/CxP escalables a millones de documentos:
 *  - Paginación en el servidor (LIMIT/OFFSET sobre el PK).
 *  - Filtros parametrizados (estado, tercero, rango de fechas, búsqueda prefijo).
 *  - Agregados por fecha para la navegación año/mes/día, calculados con
 *    una sola consulta GROUP BY (nada se transfiere ni se filtra en el cliente).
 */

export interface FiltrosCuenta {
  estado?: string | null
  tercero?: string | null
  q?: string | null
  year?: number | null
  month?: number | null
  day?: number | null
  page?: number
  pageSize?: number
}

export interface ConfigCuentas {
  tabla: string
  alias: string
  /** Columnas seleccionadas (con alias de tercero/proyecto/servicio). */
  select: string
  /** JOINs (LEFT JOIN a tabla de terceros y proyectos). */
  joins: string
  numeroCol: string
  terceroRef: string
  camposBusqueda: string[]
}

function stringIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Construye la cláusula WHERE y sus parámetros.
 * Las fechas se filtran siempre por RANGO (`col >= ? AND col < ?`) para que
 * el índice de fecha_emision sea utilizable (evita YEAR()/MONTH()).
 */
export function construirFiltros(config: ConfigCuentas, f: FiltrosCuenta) {
  const { alias, terceroRef, camposBusqueda, numeroCol } = config
  const conds: string[] = []
  const params: unknown[] = []

  if (f.estado && f.estado !== "all") {
    conds.push(`${alias}.estado = ?`)
    params.push(f.estado)
  }

  if (f.tercero && f.tercero !== "all") {
    conds.push(`${terceroRef} = ?`)
    params.push(f.tercero)
  }

  if (f.q && f.q.trim()) {
    const like = `${f.q.trim()}%`
    conds.push(`(${camposBusqueda.map((c) => `${c} LIKE ?`).join(" OR ")})`)
    camposBusqueda.forEach(() => params.push(like))
  }

  if (f.year != null) {
    const mesBase = f.month != null ? f.month - 1 : 0
    const diaIni = f.day != null ? f.day : 1
    const inicio = new Date(Date.UTC(f.year, mesBase, diaIni))
    let fin: Date
    if (f.day != null) {
      fin = new Date(Date.UTC(f.year, mesBase, diaIni + 1))
    } else if (f.month != null) {
      fin = new Date(Date.UTC(f.year, mesBase + 1, 1))
    } else {
      fin = new Date(Date.UTC(f.year + 1, 0, 1))
    }
    conds.push(`${alias}.fecha_emision >= ?`, `${alias}.fecha_emision < ?`)
    params.push(stringIso(inicio), stringIso(fin))
  }

  return { where: conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "", params }
}

export async function consultarCuentas(config: ConfigCuentas, f: FiltrosCuenta) {
  const page = Math.max(1, f.page ?? 1)
  const pageSize = Math.min(200, Math.max(1, f.pageSize ?? 50))
  const offset = (page - 1) * pageSize

  const { where, params } = construirFiltros(config, f)

  const [totales]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM ${config.tabla} ${config.alias} ${config.joins} ${where}`,
    params
  )
  const total = Number(totales?.[0]?.total ?? 0)

  const [rows]: any = await pool.query(
    `SELECT ${config.select}
     FROM ${config.tabla} ${config.alias}
     ${config.joins}
     ${where}
     ORDER BY ${config.alias}.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  return {
    rows,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    page,
  }
}

export type FechaResumen = { fecha: string; total: number }

/**
 * Ago. Se ignora el filtro de fecha del WHERE (para no encoger la lista de
 * años); los parámetros `anio`/`mes` solo indican qué desglose devolver:
 *  - años: siempre
 *  - meses: cuando `anio` esté definido
 *  - días: cuando `anio` y `mes` estén definidos
 */
export async function resumenCuentas(
  config: ConfigCuentas,
  f: Omit<FiltrosCuenta, "year" | "month" | "day">,
  anio?: number | null,
  mes?: number | null
) {
  const { where, params } = construirFiltros(config, f)

  const [rows]: any = await pool.query(
    `SELECT CAST(DATE(${config.alias}.fecha_emision) AS CHAR) AS fecha, COUNT(*) AS total
     FROM ${config.tabla} ${config.alias}
     ${config.joins}
     ${where}
     GROUP BY CAST(DATE(${config.alias}.fecha_emision) AS CHAR)
     ORDER BY fecha ASC`,
    params
  )

  const porFecha = new Map<string, number>()
  let totalGeneral = 0
  const acumAnios = new Map<number, number>()
  const acumMeses = new Map<number, number>()
  const acumDias = new Map<number, number>()

  for (const r of rows) {
    const fecha = String(r.fecha ?? "").slice(0, 10)
    const n = Number(r.total ?? 0)
    porFecha.set(fecha, n)
    totalGeneral += n

    const anioFecha = Number(fecha.slice(0, 4))
    const mesFecha = Number(fecha.slice(5, 7)) - 1
    const diaFecha = Number(fecha.slice(8, 10))
    if (!Number.isFinite(anioFecha)) continue

    acumAnios.set(anioFecha, (acumAnios.get(anioFecha) ?? 0) + n)
    if (anio != null && anioFecha === anio) {
      acumMeses.set(mesFecha, (acumMeses.get(mesFecha) ?? 0) + n)
    }
    if (anio != null && mes != null && anioFecha === anio && mesFecha === mes - 1) {
      acumDias.set(diaFecha, (acumDias.get(diaFecha) ?? 0) + n)
    }
  }

  const years = Array.from(acumAnios.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, count]) => ({ year, count }))

  const months = acumMeses.size > 0
    ? Array.from(acumMeses.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([month, count]) => ({ month, count }))
    : []

  let days: { day: number; count: number }[] = []
  if (anio != null && mes != null) {
    const totalDiasMes = new Date(anio, mes, 0).getDate()
    for (let d = 1; d <= totalDiasMes; d++) {
      days.push({ day: d, count: acumDias.get(d) ?? 0 })
    }
  }

  return { years, months, days, total: totalGeneral }
}

export function numeroFiltro(valor: string | null, min: number, max: number): number | null {
  if (!valor) return null
  const n = Number(valor)
  if (!Number.isInteger(n) || n < min || n > max) return null
  return n
}