import { NextResponse } from "next/server"
import pool from "@/lib/mysql"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [rows]: any = await pool.query(
    
    `
    SELECT *
    FROM valorizaciones_pactadas
    WHERE proyecto_id = ?
    AND estado = 'ACTIVA'
    ORDER BY id ASC
    `,
    [id]
  )

  return NextResponse.json(rows)
}