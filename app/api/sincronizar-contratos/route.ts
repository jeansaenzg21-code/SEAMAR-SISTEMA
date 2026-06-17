import { NextResponse } from "next/server";

import {
  listarDocumentos,
  descargarArchivo
} from "@/lib/onedrive";
import { procesarDocumento } from "@/lib/openai-documentos";

import {
  guardarContrato
} from "@/lib/valorizaciones";

export async function POST() {
  try {
    const data =
      await listarDocumentos();

    const archivos =
      data.value || [];

    let contratosRegistrados = 0;

    for (const archivo of archivos) {
      const archivoCompleto =
        await descargarArchivo(archivo.id);

      const json = await procesarDocumento(
  archivoCompleto.buffer,
  archivoCompleto.nombre
);

      console.log("JSON CONTRATO:", json);

      if (
        json.tipoDocumento?.toLowerCase() !== "contrato"
      ) {
        continue;
      }

      await guardarContrato(
        json,
        {
          nombre: archivoCompleto.nombre,
          onedriveId: archivoCompleto.itemId,
          url: archivoCompleto.webUrl
        }
      );

      contratosRegistrados++;
    }

    return NextResponse.json({
      success: true,
      encontrados: archivos.length,
      contratosRegistrados
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      {
        status: 500
      }
    );
  }
}