import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function GET() {

  try {

    const [rows] = await pool.query(`
  SELECT
    cxc.*,
    c.razon_social AS cliente,
    p.nombre AS proyecto
  FROM cuentas_por_cobrar cxc
  LEFT JOIN clientes c
    ON cxc.cliente_id = c.id
  LEFT JOIN proyectos p
    ON cxc.proyecto_id = p.id
  ORDER BY cxc.id DESC
`);

    return NextResponse.json(rows);

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        success: false
      },
      {
        status: 500
      }
    );

  }

}

export async function POST(
  request: Request
) {

  try {

    const body =
      await request.json();

    const {

      cliente_id,
      proyecto_id,
      valorizacion_id,

      numero_factura,

      descripcion,

      monto,

      fecha_emision,
      fecha_vencimiento

    } = body;

    const codigo =
      `CXC-${Date.now()}`;

      
const [existente]: any = await pool.query(
  `
  SELECT id
  FROM cuentas_por_cobrar
  WHERE numero_factura = ?
  LIMIT 1
  `,
  [numero_factura]
)

if (existente.length > 0) {
  return NextResponse.json(
    {
      success: false,
      message: "La factura ya existe"
    },
    {
      status: 400
    }
  )
}
    const [result] =
    
      await pool.query(
        `
        
        INSERT INTO cuentas_por_cobrar (

          codigo,

          cliente_id,
          proyecto_id,
          valorizacion_id,

          numero_factura,

          descripcion,

          monto,
          saldo,

          fecha_emision,
          fecha_vencimiento,

          estado

        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [

          codigo,

          cliente_id || null,
          proyecto_id || null,
          valorizacion_id || null,

          numero_factura || null,

          descripcion || null,

          monto,

          monto,

          fecha_emision || null,
          fecha_vencimiento || null,

          "PENDIENTE"

        ]
      );

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        success: false
      },
      {
        status: 500
      }
    );

  }

}