import { NextResponse } from "next/server"
import pool from "@/lib/mysql"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const anio = searchParams.get("anio")

    if (anio) {
      const [rows]: any = await pool.query(
        `
        SELECT DISTINCT
          LPAD(MONTH(v.fecha_ejecucion), 2, '0') AS mes
        FROM valorizaciones v
        WHERE v.fecha_ejecucion IS NOT NULL
          AND YEAR(v.fecha_ejecucion) = ?
        ORDER BY mes ASC
        `,
        [Number(anio)]
      )

      return NextResponse.json(rows.map((r: any) => r.mes))
    }

    const [rows]: any = await pool.query(
      `
      SELECT DISTINCT
        YEAR(v.fecha_ejecucion) AS anio
      FROM valorizaciones v
      WHERE v.fecha_ejecucion IS NOT NULL
      ORDER BY anio DESC
      `
    )

    return NextResponse.json(rows.map((r: any) => String(r.anio)))
  } catch (error) {
    console.error(error)
    return NextResponse.json([], { status: 500 })
  }
}
