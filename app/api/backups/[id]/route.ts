import { NextRequest, NextResponse } from "next/server";
import { eliminarBackup, obtenerBackup } from "@/lib/backups";
import { obtenerSesion } from "@/lib/session";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    if (sesion.rol !== "ADMINISTRADOR") return NextResponse.json({ success: false, message: "Acceso denegado" }, { status: 403 });

    const { id } = await params;
    const backup = await obtenerBackup(Number(id));

    if (!backup) return NextResponse.json({ success: false, message: "El respaldo no existe" }, { status: 404 });

    return NextResponse.json({ success: true, backup });
  } catch (error) {
    console.error("Error al obtener backup:", error);
    return NextResponse.json({ success: false, message: "Error al obtener el respaldo" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    if (sesion.rol !== "ADMINISTRADOR") return NextResponse.json({ success: false, message: "Acceso denegado" }, { status: 403 });

    const { id } = await params;
    await eliminarBackup(Number(id), sesion.nombre);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error al eliminar backup:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Error al eliminar el respaldo" },
      { status: 500 }
    );
  }
}