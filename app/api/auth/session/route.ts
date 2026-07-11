import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/session";

export async function GET() {
  const sesion = await obtenerSesion();

  if (!sesion) {
    return NextResponse.json(
      { error: "No autenticado" },
      { status: 401 }
    );
  }

  return NextResponse.json(sesion);
}