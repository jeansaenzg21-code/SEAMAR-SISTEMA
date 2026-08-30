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
    const esTodasLasMonedas = moneda === "TODAS"
    const [valorizacionesRows]: any = await pool.query(
  esTodasLasMonedas
    ? `
  SELECT COALESCE(SUM(monto), 0) AS total
  FROM valorizaciones
  WHERE estado = 'APROBADO'
  `
    : `
  SELECT COALESCE(SUM(monto), 0) AS total
  FROM valorizaciones
  WHERE moneda = ?
    AND estado = 'APROBADO'
  `,
  esTodasLasMonedas ? [] : [moneda]
);

    // =========================
    // VALORIZACIONES PENDIENTES
    // =========================
    const [pendientesRows]: any = await pool.query(
  esTodasLasMonedas
    ? `
  SELECT COALESCE(SUM(monto), 0) AS total
  FROM valorizaciones
  WHERE estado IN ('BORRADOR', 'EN_REVISION', 'OBSERVADO')
  `
    : `
  SELECT COALESCE(SUM(monto), 0) AS total
  FROM valorizaciones
  WHERE moneda = ?
    AND estado IN ('BORRADOR', 'EN_REVISION', 'OBSERVADO')
  `,
  esTodasLasMonedas ? [] : [moneda]
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
    usuario_nombre,
    created_at
  FROM actividad_sistema
  ORDER BY created_at DESC
  LIMIT 5
`);

// =========================
// ALERTAS CRÍTICAS
// =========================
const [alertasRows]: any = await pool.query(`
  SELECT
    SUM(CASE WHEN estado = 'BORRADOR' AND TIMESTAMPDIFF(DAY, created_at, NOW()) >= 7 THEN 1 ELSE 0 END) AS borrador_7d,
    SUM(CASE WHEN estado = 'EN_REVISION' AND TIMESTAMPDIFF(DAY, COALESCE(updated_at, created_at), NOW()) >= 3 THEN 1 ELSE 0 END) AS revision_3d,
    SUM(CASE WHEN estado = 'OBSERVADO' AND TIMESTAMPDIFF(DAY, COALESCE(updated_at, created_at), NOW()) >= 5 THEN 1 ELSE 0 END) AS observado_5d
  FROM valorizaciones
`);

const alertasData = alertasRows[0];
const alerts: any[] = [];

if (alertasData.borrador_7d > 0) {
  alerts.push({
    id: "borrador",
    title: "Valorizaciones en borrador",
    description: `${alertasData.borrador_7d} valorizaciones han permanecido en borrador durante 7 días.`,
    estado: "pending",
    cantidad: alertasData.borrador_7d,
  });
}

if (alertasData.revision_3d > 0) {
  alerts.push({
    id: "revision",
    title: "Valorizaciones en revisión",
    description: `${alertasData.revision_3d} valorizaciones han permanecido en revisión durante 3 días.`,
    estado: "warning",
    cantidad: alertasData.revision_3d,
  });
}

if (alertasData.observado_5d > 0) {
  alerts.push({
    id: "observado",
    title: "Valorizaciones observadas",
    description: `${alertasData.observado_5d} valorizaciones continúan observadas desde hace 5 días.`,
    estado: "today",
    cantidad: alertasData.observado_5d,
  });
}

    // =========================
    // AÑOS DISPONIBLES
    // =========================
    const [yearsRows]: any = await pool.query(`
      SELECT DISTINCT anio
      FROM (
        SELECT YEAR(fecha_emision) AS anio FROM cuentas_por_cobrar
        UNION
        SELECT YEAR(fecha_emision) FROM cuentas_por_pagar
        UNION
        SELECT YEAR(fecha_ejecucion) FROM valorizaciones
      ) años
      WHERE anio IS NOT NULL
      ORDER BY anio DESC
    `);
    const availableYears = yearsRows.map((r: any) => r.anio);

    // =========================
    // MONEDAS CON VALORIZACIONES
    // =========================
    const [monedasRows]: any = await pool.query(`
      SELECT moneda
      FROM valorizaciones
      WHERE moneda IN ('SOLES', 'DOLARES')
      GROUP BY moneda
      ORDER BY MAX(fecha_ejecucion) DESC
    `);
    const availableMonedas = monedasRows.map((r: any) => r.moneda);

    // =========================
    // TOP CLIENTES POR INDICADOR
    // =========================
    const [topRows]: any = await pool.query(`
      SELECT
        c.id,
        c.razon_social AS nombre,
        COALESCE(cc.cxc, 0) AS cxc,
        COALESCE(vv.cantidad, 0) AS valorizaciones,
        COALESCE(cc.mora, 0) AS mora
      FROM clientes c
      -- En valorizaciones el campo "proveedor" almacena el nombre del cliente.
      -- Por ello el JOIN se realiza usando clientes.razon_social.
      LEFT JOIN (
        SELECT cliente_id,
               SUM(saldo) AS cxc,
               SUM(CASE WHEN fecha_vencimiento < CURDATE() AND estado IN ('PENDIENTE', 'FACTURADO', 'VENCIDO') THEN saldo ELSE 0 END) AS mora
        FROM cuentas_por_cobrar
        WHERE moneda = ?
          AND estado IN ('PENDIENTE', 'FACTURADO', 'VENCIDO')
        GROUP BY cliente_id
      ) cc ON c.id = cc.cliente_id
      LEFT JOIN (
        SELECT c2.id AS cliente_id,
               COUNT(*) AS cantidad
        FROM clientes c2
        INNER JOIN valorizaciones v ON c2.razon_social = v.proveedor
        GROUP BY c2.id
      ) vv ON c.id = vv.cliente_id
      WHERE cc.cliente_id IS NOT NULL OR vv.cliente_id IS NOT NULL
      ORDER BY cxc DESC
      LIMIT 5
    `, [moneda]);

    const topClients = topRows.map((row: any) => {
      const cxc = Number(row.cxc);
      const mora = Number(row.mora);
      let riesgo: string;
      if (mora === 0) {
        riesgo = "VERDE";
      } else if (mora / cxc < 0.2) {
        riesgo = "AMARILLO";
      } else {
        riesgo = "ROJO";
      }
      return {
        id: String(row.id),
        nombre: row.nombre,
        cxc,
        valorizaciones: Number(row.valorizaciones),
        mora,
        riesgo,
      };
    });

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
          description: esTodasLasMonedas ? "Total en todas las monedas" : "Total aprobado",
          plain: esTodasLasMonedas,
        },
        {
  id: "pending_valuations",
  value: Number(pendientesRows[0].total),
  description: esTodasLasMonedas ? "Total en todas las monedas" : "Total pendiente",
  plain: esTodasLasMonedas,
}
      ],

      alerts,
      recentActivity: actividadRows.map((actividad: any) => ({
  id: String(actividad.id),

  type: actividad.tipo,

  title: actividad.titulo,

  subtitle: actividad.subtitulo ?? "",

  usuarioNombre: actividad.usuario_nombre ?? null,

  createdAt: actividad.created_at,

})),
      topClients: topClients,
      availableYears,
      availableMonedas,
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
