import { NextResponse } from "next/server";
import pool from "@/lib/mysql";
import {
  listarValorizaciones,
  descargarArchivo
} from "@/lib/onedrive";
import { guardarValorizacion } from "@/lib/valorizaciones";

import { procesarPdf } from "@/lib/gemini-documentos";



export async function POST() {

  try {

    const archivos =
      await listarValorizaciones();

    const lista =
      archivos.value || [];

    let nuevos = 0;

    for (const archivo of lista) {

  const [rows]: any =
    await pool.query(
      `
      SELECT id
      FROM valorizaciones
      WHERE archivo_onedrive_id = ?
      `,
      [archivo.id]
    );

  if (rows.length > 0) {
    continue;
  }

  const archivoCompleto =
  await descargarArchivo(
    archivo.id
  );

console.log(
  "Archivo descargado:",
  archivoCompleto.nombre
);

const json =
  await procesarPdf(
    archivoCompleto.buffer
  );

console.log(json);

if (
  json.tipoDocumento?.toLowerCase() ===
  "valorizacion"
) {

  json.archivoNombre =
    archivoCompleto.nombre;

  json.archivoOnedriveId =
    archivoCompleto.itemId;

  json.archivoUrl =
    archivoCompleto.webUrl;

  await guardarValorizacion(
    json
  );

  nuevos++;

}
    }
    return NextResponse.json({
      success: true,
      encontrados: lista.length,
      nuevos
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        success: false
      },
      {
        status: 500
      }
    );

  }

}
export async function GET() {
  return POST();
}