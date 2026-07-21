import { NextResponse } from "next/server";
import { Buffer } from "buffer";
import { obtenerImportador } from "@/lib/importadores";
import { obtenerSesion } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const empresa = formData.get("empresa") as string | null;
    const archivo = formData.get("archivo") as File | null;
    const valorizacionesStr = formData.get("valorizaciones") as string | null;

    if (!empresa) {
      return NextResponse.json(
        { success: false, error: "Debe seleccionar una empresa" },
        { status: 400 }
      );
    }

    if (!archivo) {
      return NextResponse.json(
        { success: false, error: "Debe seleccionar un archivo" },
        { status: 400 }
      );
    }

    const importador = obtenerImportador(empresa);
    if (!importador) {
      return NextResponse.json(
        { success: false, error: `No hay importador configurado para: ${empresa}` },
        { status: 400 }
      );
    }

    console.time("lectura_archivo")
    const arrayBuffer = await archivo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.timeEnd("lectura_archivo")

    // Fase 1: detectar valorizaciones disponibles en el archivo
    if (!valorizacionesStr) {
      const resultado = await importador.detectar(buffer, archivo.name);
      return NextResponse.json({
        success: true,
        items: resultado.items,
      });
    }

    // Fase 2: importar las valorizaciones seleccionadas
    const importDebugId = `IMPORT_ROUTE_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

console.time("total_importacion");

console.log("A");
const sesion = await obtenerSesion();

console.log("B");
const creadoPor = sesion?.nombre || sesion?.correo || "Sistema";

console.log("C");
const seleccion: string[] = JSON.parse(valorizacionesStr);

console.log("D");

console.log(`[${importDebugId}] Fase 2: importando valorizaciones`);

    console.log(`[${importDebugId}] Fase 2: importando valorizaciones`);
    console.log(`[${importDebugId}] empresa:`, empresa);
    console.log(`[${importDebugId}] archivo.name:`, archivo.name);
    console.log(`[${importDebugId}] seleccion (${seleccion.length} items):`, seleccion);
    console.log(`[${importDebugId}] creadoPor:`, creadoPor);

    const resultado = await importador.importar(
      buffer,
      archivo.name,
      seleccion,
      creadoPor
    );
    console.timeEnd("total_importacion")
    console.log(`[${importDebugId}] resultado importacion:`, JSON.stringify(resultado, null, 2));

    return NextResponse.json(resultado);

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}