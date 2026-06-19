import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    await pool.query(
      `
      UPDATE valorizaciones
      SET
        proveedor = ?,
        negocio_operacion = ?,
        numero_orden_servicio = ?,
        descripcion = ?,
        monto = ?,
        moneda = ?,
        periodo = ?,
        fecha_ejecucion = ?,
        encargado = ?
      WHERE id = ?
      `,
      [
        body.proveedor,
        body.negocio_operacion,
        body.numero_orden_servicio,
        body.descripcion,
        body.monto,
        body.moneda,
        body.periodo,
        body.fecha_ejecucion,
        body.encargado,
        id,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al actualizar valorización",
      },
      {
        status: 500,
      }
    );
  }
}