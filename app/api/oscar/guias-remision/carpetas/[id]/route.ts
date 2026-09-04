import { NextRequest, NextResponse } from "next/server";
import { requerirSesionOscar } from "@/lib/oscar/auth";
import {
  eliminarCarpeta,
  renombrarCarpeta,
} from "@/lib/oscar/guias-remision-db";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: idRaw } = await context.params;
  const carpetaId = Number(idRaw);
  if (!Number.isInteger(carpetaId)) {
    return NextResponse.json({ error: "Carpeta inválida." }, { status: 400 });
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
    await renombrarCarpeta(auth.sesion.id, carpetaId, nombre);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[OSCAR] Error renombrando carpeta:", error);
    return NextResponse.json(
      { error: "Error al renombrar la carpeta." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: idRaw } = await context.params;
  const carpetaId = Number(idRaw);
  if (!Number.isInteger(carpetaId)) {
    return NextResponse.json({ error: "Carpeta inválida." }, { status: 400 });
  }

  try {
    await eliminarCarpeta(auth.sesion.id, carpetaId);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[OSCAR] Error eliminando carpeta:", error);
    return NextResponse.json(
      { error: "Error al eliminar la carpeta." },
      { status: 500 }
    );
  }
}
