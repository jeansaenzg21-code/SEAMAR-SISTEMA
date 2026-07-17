import { NextResponse } from "next/server";
import { obtenerSesion, cerrarSesion } from "@/lib/session";
import { registrarActividad } from "@/lib/actividad";

export async function POST() {
  try {
    const sesion = await obtenerSesion();

    if (!sesion) {
      return NextResponse.json({ ok: true });
    }

    await registrarActividad({
      tipo: "logout",
      accion: "cerrar_sesion",
      titulo: `${sesion.nombre} cerró sesión.`,
    });

    await cerrarSesion();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al cerrar sesión." },
      { status: 500 }
    );
  }
}
