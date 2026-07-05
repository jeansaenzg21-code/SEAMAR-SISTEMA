import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await pool.getConnection();

  try {
    const id = (await params).id;

    // 1. Cabecera
    const [cabecera]: any = await connection.query(
      `SELECT * FROM conciliaciones_bancarias WHERE id = ?`,
      [id]
    );

    if (!cabecera.length) {
      return NextResponse.json(
        { success: false, error: "Conciliación no encontrada" },
        { status: 404 }
      );
    }

    // 2. Movimientos
    const [movimientos]: any = await connection.query(
      `SELECT * FROM conciliacion_movimientos WHERE conciliacion_id = ?`,
      [id]
    );

    // 3. Coincidencias
    const [coincidencias]: any =
  await connection.query(
    `
    SELECT
  cmc.id                  AS coincidencia_id,
  cmc.movimiento_id,
  cmc.documento_id,
  cmc.origen,
  cmc.score,
  cmc.tipo,
  cm.id                   AS movimiento_real_id
FROM conciliacion_movimiento_coincidencias cmc
JOIN conciliacion_movimientos cm
  ON cmc.movimiento_id = cm.id
WHERE cm.conciliacion_id = ?
    `,
    [id]
  );
for (const coincidencia of coincidencias) {

  if (
    coincidencia.origen ===
    "CUENTA_POR_PAGAR"
  ) {

    const [doc]: any =
      await connection.query(
        `
        SELECT
          cxp.id,
          cxp.numero_documento,
          cxp.descripcion,
          cxp.monto,
          cxp.fecha_emision,
          p.nombre AS proyecto,
          v.razon_social AS proveedor
        FROM cuentas_por_pagar cxp
        LEFT JOIN proveedores v
          ON v.id = cxp.proveedor_id
        LEFT JOIN proyectos p
          ON p.id = cxp.proyecto_id
        WHERE cxp.id = ?
        `,
        [coincidencia.documento_id]
      );

    if (doc.length) {

      coincidencia.id =
        String(doc[0].id);

      coincidencia.proveedor =
        doc[0].proveedor;

      coincidencia.proyecto =
        doc[0].proyecto;

      coincidencia.documento =
        doc[0].numero_documento;

      coincidencia.descripcion =
        doc[0].descripcion;

      coincidencia.fecha =
        doc[0].fecha_emision;

      coincidencia.monto =
        Number(doc[0].monto);

    }

  }

  if (
    coincidencia.origen ===
    "CUENTA_POR_COBRAR"
  ) {

    const [doc]: any =
      await connection.query(
        `
        SELECT
          cxc.id,
          cxc.numero_factura,
          cxc.descripcion,
          cxc.monto,
          cxc.fecha_emision,
          p.nombre AS proyecto,
          c.razon_social AS cliente
        FROM cuentas_por_cobrar cxc
        LEFT JOIN clientes c
          ON c.id = cxc.cliente_id
        LEFT JOIN proyectos p
          ON p.id = cxc.proyecto_id
        WHERE cxc.id = ?
        `,
        [coincidencia.documento_id]
      );

    if (doc.length) {

      coincidencia.id =
        String(doc[0].id);

      coincidencia.cliente =
        doc[0].cliente;

      coincidencia.proyecto =
        doc[0].proyecto;

      coincidencia.documento =
        doc[0].numero_factura;

      coincidencia.descripcion =
        doc[0].descripcion;

      coincidencia.fecha =
        doc[0].fecha_emision;

      coincidencia.monto =
        Number(doc[0].monto);

    }

  }

}
console.log(
  "MOVIMIENTOS DB:",
  movimientos.length
);

console.log(
  "COINCIDENCIAS DB:",
  coincidencias.length
);

return NextResponse.json({
  success: true,
  cabecera: cabecera[0],
  movimientos,
  coincidencias,
});

} catch (error: any) {

  console.error(error);

  return NextResponse.json(
    {
      success: false,
      error: error.message
    },
    {
      status: 500
    }
  );

} finally {

  connection.release();

}

}