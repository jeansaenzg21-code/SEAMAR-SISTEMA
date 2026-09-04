import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requerirSesionOscar } from "@/lib/oscar/auth";
import { extraerGuiaRemisionOscar } from "@/lib/oscar/extraer-guia-remision";
import { verificarHashGuia } from "@/lib/oscar/guias-remision-db";
import { subirFacturaOscarAOneDrive } from "@/lib/onedrive";

const MAX_TAMANO_MB = 20;
const MAX_TAMANO_BYTES = MAX_TAMANO_MB * 1024 * 1024;

const EXTENSIONES_VALIDAS = ["pdf", "jpg", "jpeg", "png"];

export async function POST(request: NextRequest) {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer la petición." },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json(
      { error: "No se recibió ningún archivo." },
      { status: 400 }
    );
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!EXTENSIONES_VALIDAS.includes(extension)) {
    return NextResponse.json(
      { error: "Solo se permiten archivos PDF, JPG, JPEG o PNG." },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length === 0) {
    return NextResponse.json(
      { error: "El archivo está vacío." },
      { status: 400 }
    );
  }

  if (buffer.length > MAX_TAMANO_BYTES) {
    return NextResponse.json(
      {
        error: `El archivo excede el tamaño máximo de ${MAX_TAMANO_MB}MB.`,
      },
      { status: 400 }
    );
  }

  const esImagen = ["jpg", "jpeg", "png"].includes(extension);

  try {
    // Evita procesar (y pagar a OpenAI) un documento ya registrado.
    const hashArchivo = crypto
      .createHash("sha256")
      .update(buffer)
      .digest("hex");

    const duplicadoHash = await verificarHashGuia(auth.sesion.id, hashArchivo);
    if (duplicadoHash.existe) {
      return NextResponse.json(
        {
          error: "Esta Guía de Remisión ya está registrada.",
          duplicado: true,
        },
        { status: 409 }
      );
    }

    const archivo = await subirFacturaOscarAOneDrive(file.name, buffer);

    const extraccion = await extraerGuiaRemisionOscar(
      buffer,
      file.name,
      esImagen
    );

    if (!extraccion.guias.length) {
      return NextResponse.json(
        {
          error:
            "No se pudo identificar ninguna Guía de Remisión en el documento. Verifica que sea una guía de remisión válida.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      origen: extraccion.origen,
      hashArchivo: extraccion.hashArchivo,
      guias: extraccion.guias,
      archivo: {
        nombre: archivo.nombre,
        itemId: archivo.itemId,
        webUrl: archivo.webUrl,
      },
    });
  } catch (error: any) {
    console.error("[OSCAR] Error en upload de guía de remisión:", error);

    const mensaje =
      error?.message ||
      "Ocurrió un error al procesar la Guía de Remisión. Verifica que el documento sea legible.";

    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}