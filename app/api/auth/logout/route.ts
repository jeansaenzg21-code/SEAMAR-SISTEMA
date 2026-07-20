import { NextResponse } from "next/server";
import { cerrarSesion } from "@/lib/session";

export async function POST() {
  try {
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
