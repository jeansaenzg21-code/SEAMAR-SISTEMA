import pool from "./mysql"

export async function generarCodigoCuenta(
  prefijo: "CXP" | "CXC",
  fecha?: string | null
): Promise<string> {
  const tabla = prefijo === "CXP" ? "cuentas_por_pagar" : "cuentas_por_cobrar"

  const fechaParseada = fecha ? new Date(fecha) : null
  const anio =
    fechaParseada && !Number.isNaN(fechaParseada.getTime())
      ? fechaParseada.getFullYear()
      : new Date().getFullYear()

  const [rows]: any = await pool.query(
    `SELECT codigo FROM ${tabla} WHERE codigo LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefijo}-${anio}-%`]
  )

  let correlativo = 1
  if (rows.length > 0) {
    const ultimo = Number(String(rows[0].codigo).split("-").pop())
    if (Number.isInteger(ultimo)) correlativo = ultimo + 1
  }

  return `${prefijo}-${anio}-${String(correlativo).padStart(4, "0")}`
}
