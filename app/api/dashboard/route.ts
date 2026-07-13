import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function GET(request: Request) {
  try {

    const { searchParams } = new URL(request.url)

    const moneda =
      searchParams.get("moneda") ?? "SOLES"

    const mes =
      Number(searchParams.get("mes")) || new Date().getMonth() + 1

    const anio =
      Number(searchParams.get("anio")) || new Date().getFullYear()
    // =========================
    // CUENTAS POR COBRAR
    // =========================
    const [cxcRows]: any = await pool.query(
  `
  SELECT COALESCE(SUM(saldo), 0) AS total
  FROM cuentas_por_cobrar
  WHERE moneda = ?
    AND MONTH(fecha_emision) = ?
    AND YEAR(fecha_emision) = ?
    AND estado IN ('PENDIENTE', 'FACTURADO')
  `,
  [
    moneda,
    mes,
    anio
  ]
);
    // =========================
    // CUENTAS POR PAGAR
    // =========================
    const [cxpRows]: any = await pool.query(
  `
  SELECT COALESCE(SUM(saldo), 0) AS total
  FROM cuentas_por_pagar
  WHERE moneda = ?
    AND MONTH(fecha_emision) = ?
    AND YEAR(fecha_emision) = ?
    AND estado IN ('PENDIENTE', 'VENCIDO')
  `,
  [
    moneda,
    mes,
    anio
  ]
);

    // =========================
    // VALORIZACIONES APROBADAS
    // =========================
    const [valorizacionesRows]: any = await pool.query(
  `
  SELECT COALESCE(SUM(monto), 0) AS total
  FROM valorizaciones
  WHERE moneda = ?
    AND MONTH(fecha_ejecucion) = ?
    AND YEAR(fecha_ejecucion) = ?
    AND estado = 'APROBADO'
  `,
  [
    moneda,
    mes,
    anio
  ]
);

    // =========================
    // VALORIZACIONES PENDIENTES
    // =========================
    const [pendientesRows]: any = await pool.query(
  `
  SELECT COALESCE(SUM(monto), 0) AS total
  FROM valorizaciones
  WHERE moneda = ?
    AND MONTH(fecha_ejecucion) = ?
    AND YEAR(fecha_ejecucion) = ?
    AND estado IN ('BORRADOR', 'EN_REVISION', 'OBSERVADO')
  `,
  [
    moneda,
    mes,
    anio
  ]
);

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

      alerts: [
  {
    id: "1",
    title: "Valorizaciones en borrador",
    description: "10 valorizaciones han permanecido en borrador durante 7 días.",
    estado: "pending",
  },
  {
    id: "2",
    title: "Valorizaciones en revisión",
    description: "21 valorizaciones han permanecido en revisión durante 3 días.",
    estado: "warning",
  },
  {
    id: "3",
    title: "Valorizaciones observadas",
    description: "5 valorizaciones continúan observadas desde hace 5 días.",
    estado: "today",
  },
  
],
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