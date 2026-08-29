import { NextRequest, NextResponse } from "next/server";
import { aplicarRetencion, obtenerConfigBackup } from "@/lib/backups";
import { obtenerSesion } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    if (sesion.rol !== "ADMINISTRADOR") return NextResponse.json({ success: false, message: "Acceso denegado" }, { status: 403 });

    const config = obtenerConfigBackup();
    const eliminados = await aplicarRetencion(config, sesion.nombre);

    return NextResponse.json({ success: true, eliminados });
  } catch (error: any) {
    console.error("Error al aplicar retención:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Error al aplicar la retención" },
      { status: 500 }
    );
  }
}