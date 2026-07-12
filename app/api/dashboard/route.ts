import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function GET() {
  try {
    // =========================
    // CUENTAS POR COBRAR
    // =========================
    const [cxcRows]: any = await pool.query(`
      SELECT COALESCE(SUM(saldo), 0) AS total
      FROM cuentas_por_cobrar
      WHERE estado IN ('PENDIENTE', 'PARCIAL', 'VENCIDO')
    `);

    // =========================
    // CUENTAS POR PAGAR
    // =========================
    const [cxpRows]: any = await pool.query(`
      SELECT COALESCE(SUM(saldo), 0) AS total
      FROM cuentas_por_pagar
      WHERE estado IN ('PENDIENTE', 'VENCIDO')
    `);

    // =========================
    // VALORIZACIONES APROBADAS
    // =========================
    const [valorizacionesRows]: any = await pool.query(`
      SELECT COALESCE(SUM(monto), 0) AS total
      FROM valorizaciones
      WHERE estado = 'APROBADO'
    `);

    // =========================
    // VALORIZACIONES PENDIENTES
    // =========================
    const [pendientesRows]: any = await pool.query(`
  SELECT COALESCE(SUM(monto), 0) AS total
  FROM valorizaciones
  WHERE estado IN ('BORRADOR', 'EN_REVISION', 'OBSERVADO')
`);

// =========================
// ACTIVIDAD RECIENTE
// =========================
const [actividadRows]: any = await pool.query(`
  SELECT
    id,
    tipo,
    accion,
    titulo,
    subtitulo,
    created_at
  FROM actividad_sistema
  ORDER BY created_at DESC
  LIMIT 5
`);

    return NextResponse.json({
      kpis: [
        {
          id: "accounts_receivable",
          value: Number(cxcRows[0].total),
          description: "Total pendiente",
        },
        {
          id: "accounts_payable",
          value: Number(cxpRows[0].total),
          description: "Total pendiente",
        },
        {
          id: "valorizaciones",
          value: Number(valorizacionesRows[0].total),
          description: "Valorizaciones aprobadas",
        },
        {
  id: "pending_valuations",
  value: Number(pendientesRows[0].total),
  description: "Valorizaciones pendientes",
}
      ],

      // Se implementarán después
      alerts: [],
      recentActivity: actividadRows.map((actividad: any) => ({
  id: String(actividad.id),

  type: actividad.tipo,

  title: actividad.titulo,

  subtitle: actividad.subtitulo ?? "",

  createdAt: actividad.created_at,

})),
      topClients: [],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al cargar el dashboard",
      },
      {
        status: 500,
      }
    );
  }
}