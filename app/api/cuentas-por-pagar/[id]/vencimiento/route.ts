import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/mysql";
import { obtenerSesion } from "@/lib/session";
import { registrarActividad } from "@/lib/actividad";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const fecha = String(body.fecha_vencimiento || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return NextResponse.json({ success: false, message: "Fecha de vencimiento inválida." }, { status: 400 });
    }

    const [rows]: any = await pool.query(
      `SELECT id, vencimiento_origen, numero_documento FROM cuentas_por_pagar WHERE id = ? LIMIT 1`,
      [Number(id)]
    );

    if (!rows?.[0]) {
      return NextResponse.json({ success: false, message: "La cuenta no existe." }, { status: 404 });
    }

    if (rows[0].vencimiento_origen === "FACTURA") {
      return NextResponse.json(
        {
          success: false,
          message: "La fecha de vencimiento fue extraída directamente de la factura y no se puede editar.",
        },
        { status: 403 }
      );
    }

    await pool.query(
      `UPDATE cuentas_por_pagar SET fecha_vencimiento = ?, vencimiento_origen = 'MANUAL' WHERE id = ?`,
      [fecha, Number(id)]
    );

    registrarActividad({
      tipo: "cxp",
      accion: "actualizar",
      titulo: `Vencimiento actualizado: ${rows[0].numero_documento || "CxP #" + id}`,
      subtitulo: `Nueva fecha de vencimiento: ${fecha}`,
      usuarioNombre: sesion.nombre,
      referenciaId: Number(id),
    }).catch(() => {});

    return NextResponse.json({ success: true, fecha_vencimiento: fecha });
  } catch (error) {
    console.error("Error al actualizar vencimiento (CxP):", error);
    return NextResponse.json({ success: false, message: "Error al actualizar la fecha de vencimiento" }, { status: 500 });
  }
}