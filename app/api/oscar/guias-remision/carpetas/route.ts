import { NextRequest, NextResponse } from "next/server";
import { requerirSesionOscar } from "@/lib/oscar/auth";
import { crearCarpeta, listarCarpetas } from "@/lib/oscar/guias-remision-db";

export async function GET() {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const carpetas = await listarCarpetas(auth.sesion.id);
    return NextResponse.json({ carpetas });
  } catch (error) {
    console.error("[OSCAR] Error listando carpetas:", error);
    return NextResponse.json(
      { error: "Error al listar las carpetas." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const nombre = String(body?.nombre || "").trim().slice(0, 150);
  if (!nombre) {
    return NextResponse.json(
      { error: "El nombre de la carpeta es obligatorio." },
      { status: 400 }
    );
  }

  try {
    const id = await crearCarpeta(auth.sesion.id, nombre);
    return NextResponse.json({ ok: true, id });
  } catch (error: any) {
    console.error("[OSCAR] Error creando carpeta:", error);
    return NextResponse.json(
      { error: "Error al crear la carpeta." },
      { status: 500 }
    );
  }
}
