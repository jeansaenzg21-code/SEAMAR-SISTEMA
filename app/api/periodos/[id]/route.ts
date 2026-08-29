import { NextRequest, NextResponse } from "next/server";
import { reabrirPeriodo } from "@/lib/backups";
import { obtenerSesion } from "@/lib/session";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    if (sesion.rol !== "ADMINISTRADOR") return NextResponse.json({ success: false, message: "Acceso denegado" }, { status: 403 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (body.estado !== "ABIERTO") {
      return NextResponse.json({ success: false, message: "Solo se admite reabrir a estado ABIERTO" }, { status: 400 });
    }

    await reabrirPeriodo(Number(id), sesion.nombre);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error al reabrir periodo:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Error al reabrir el periodo" },
      { status: 500 }
    );
  }
}