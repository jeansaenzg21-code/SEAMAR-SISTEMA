import { NextRequest, NextResponse } from "next/server";
import { requerirSesionOscar } from "@/lib/oscar/auth";
import { asignarGuiaCarpeta } from "@/lib/oscar/guias-remision-db";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: idRaw } = await context.params;
  const guiaId = Number(idRaw);
  if (!Number.isInteger(guiaId)) {
    return NextResponse.json({ error: "Guía inválida." }, { status: 400 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const carpetaId =
    body?.carpetaId === null ||
    body?.carpetaId === undefined ||
    body?.carpetaId === ""
      ? null
      : Number(body.carpetaId);
  if (carpetaId !== null && !Number.isInteger(carpetaId)) {
    return NextResponse.json({ error: "Carpeta inválida." }, { status: 400 });
  }

  try {
    await asignarGuiaCarpeta(auth.sesion.id, guiaId, carpetaId);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[OSCAR] Error asignando carpeta:", error);
    return NextResponse.json(
      { error: error?.message || "Error al asignar la carpeta." },
      { status: 500 }
    );
  }
}
