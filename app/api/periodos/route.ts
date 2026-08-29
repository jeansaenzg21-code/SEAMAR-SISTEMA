import { NextRequest, NextResponse } from "next/server";
import { cerrarYArchivarPeriodo, listarPeriodos } from "@/lib/backups";
import { obtenerSesion } from "@/lib/session";

export async function GET() {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    if (sesion.rol !== "ADMINISTRADOR") return NextResponse.json({ success: false, message: "Acceso denegado" }, { status: 403 });

    const periodos = await listarPeriodos();

    return NextResponse.json({ success: true, periodos });
  } catch (error) {
    console.error("Error al listar periodos:", error);
    return NextResponse.json({ success: false, message: "Error al listar los periodos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    if (sesion.rol !== "ADMINISTRADOR") return NextResponse.json({ success: false, message: "Acceso denegado" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const anio = Number(body.anio);
    const mes = Number(body.mes);

    const resultado = await cerrarYArchivarPeriodo({
      anio,
      mes,
      usuarioId: sesion.id ?? null,
      usuarioNombre: sesion.nombre ?? null,
    });

    if (!resultado.ok) {
      return NextResponse.json({ success: false, message: resultado.error }, { status: 409 });
    }

    return NextResponse.json({ success: true, periodo: resultado.periodo, backup: resultado.backup });
  } catch (error: any) {
    console.error("Error al archivar periodo:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Error al archivar el periodo" },
      { status: 500 }
    );
  }
}