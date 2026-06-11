import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function GET() {
  try {
    const [rows] = await pool.query(
  `
  SELECT

    v.*,

    (
      SELECT vo.observacion
      FROM valorizacion_observaciones vo
      WHERE
        vo.valorizacion_id = v.id
        AND vo.tipo = 'SISTEMA'
      ORDER BY vo.id DESC
      LIMIT 1
    ) AS observacion_sistema

  FROM valorizaciones v

  ORDER BY v.id DESC
  `
);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener valorizaciones",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
  proveedor,
  ruc,
  negocio_operacion,
  numero_orden_servicio,
  descripcion,
  monto,
  moneda,
  periodo,
  fecha_ejecucion,

  encargado,

  archivo_nombre,
  archivo_onedrive_id,
  archivo_url,

  respaldo_nombre,
  respaldo_onedrive_id,
  respaldo_url,

} = body;

    const codigo = `VAL-${Date.now()}`;

   const [result] = await pool.query(
  `
  INSERT INTO valorizaciones (

    codigo,

    proveedor,
    ruc,
    negocio_operacion,

    numero_orden_servicio,

    descripcion,

    monto,
    moneda,
    periodo,

    fecha_ejecucion,

    estado,

    encargado,

    archivo_nombre,
    archivo_onedrive_id,
    archivo_url,

    respaldo_nombre,
    respaldo_onedrive_id,
    respaldo_url

  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  [

    codigo,

    proveedor,
    ruc,
    negocio_operacion,

    numero_orden_servicio,

    descripcion,

    monto,
    moneda,
    periodo,

    fecha_ejecucion,

    "BORRADOR",

    encargado,

    archivo_nombre,
    archivo_onedrive_id,
    archivo_url,

    respaldo_nombre,
    respaldo_onedrive_id,
    respaldo_url

  ]
);


    return NextResponse.json({
      success: true,
      message: "Valorización registrada correctamente",
      result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al registrar valorización",
      },
      {
        status: 500,
      }
    );
  }
}