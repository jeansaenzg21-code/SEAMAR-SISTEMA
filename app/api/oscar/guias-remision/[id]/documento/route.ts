import { NextResponse } from "next/server";
import { requerirSesionOscar } from "@/lib/oscar/auth";
import { obtenerGuiaRemision } from "@/lib/oscar/guias-remision-db";
import { descargarArchivo } from "@/lib/onedrive";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const guiaId = Number(id);
  if (!Number.isInteger(guiaId) || guiaId <= 0) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const guia = await obtenerGuiaRemision(auth.sesion.id, guiaId);
    if (!guia) {
      return NextResponse.json(
        { error: "Guía de Remisión no encontrada." },
        { status: 404 }
      );
    }

    if (!guia.onedriveItemId) {
      return NextResponse.json(
        { error: "La guía no tiene documento adjunto." },
        { status: 404 }
      );
    }

    const archivo = await descargarArchivo(guia.onedriveItemId);

    const tipo = guia.nombreArchivo?.toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : /\.png$/i.test(guia.nombreArchivo || "")
      ? "image/png"
      : "image/jpeg";

    return new NextResponse(archivo.buffer, {
      headers: {
        "Content-Type": tipo,
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          archivo.nombre
        )}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error: any) {
    console.error("[OSCAR] Error descargando guía de remisión:", error);

    if (error?.message?.includes("No se encontró el archivo")) {
      return NextResponse.json(
        { error: "El archivo ya no existe en el repositorio (OneDrive)." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Error al obtener el documento." },
      { status: 500 }
    );
  }
}