import { NextRequest, NextResponse } from "next/server";
import { validarBackup } from "@/lib/backups";
import { obtenerSesion } from "@/lib/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    if (sesion.rol !== "ADMINISTRADOR") return NextResponse.json({ success: false, message: "Acceso denegado" }, { status: 403 });

    const { id } = await params;
    const resultado = await validarBackup(Number(id));

    return NextResponse.json({ success: true, ...resultado });
  } catch (error: any) {
    console.error("Error al validar backup:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Error al validar el respaldo" },
      { status: 500 }
    );
  }
}