import { NextRequest, NextResponse } from "next/server";
import { restaurarBackup } from "@/lib/backups";
import { obtenerSesion } from "@/lib/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    if (sesion.rol !== "ADMINISTRADOR") return NextResponse.json({ success: false, message: "Acceso denegado" }, { status: 403 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const resultado = await restaurarBackup({
      id: Number(id),
      usuarioId: sesion.id ?? null,
      usuarioNombre: sesion.nombre ?? null,
      confirmacion: body.confirmacion || "",
    });

    return NextResponse.json({ success: resultado.ok, ...resultado });
  } catch (error: any) {
    console.error("Error al restaurar backup:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Error al restaurar el respaldo" },
      { status: 400 }
    );
  }
}