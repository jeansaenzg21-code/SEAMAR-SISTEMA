import { NextResponse } from "next/server";
import pool from "@/lib/mysql";
import {
  listarValorizaciones,
  descargarArchivo
} from "@/lib/onedrive";
import { guardarValorizacion } from "@/lib/valorizaciones";
import { registrarActividad } from "@/lib/actividad";
import { procesarDocumento } from "@/lib/openai-documentos";
import { leerValorizacionesExcel } from "@/lib/excel-reader";
import { obtenerSesion } from "@/lib/session";

function enviarProgreso(
  controller: ReadableStreamDefaultController,
  data: any
) {
  controller.enqueue(
    new TextEncoder().encode(
      `data: ${JSON.stringify(data)}\n\n`
    )
  );
}

export async function POST() {

  try {

    const sesion = await obtenerSesion();
    const creadoPor = sesion?.nombre;

    const archivos =
      await listarValorizaciones();

    const lista =
      archivos.value || [];

    let nuevos = 0;

    for (const archivo of lista) {

  const archivoCompleto =
  await descargarArchivo(
    archivo.id
  );

console.log(
  "Archivo descargado:",
  archivoCompleto.nombre
);

const esExcel =
  archivoCompleto.nombre.toLowerCase().endsWith(".xlsx") ||
  archivoCompleto.nombre.toLowerCase().endsWith(".xls");

if (esExcel) {
  const valorizacionesExcel =
    await leerValorizacionesExcel(
      archivoCompleto.buffer,
      archivoCompleto
    );

  for (const val of valorizacionesExcel) {
  const [existeCodigo]: any =
    await pool.query(
      `
      SELECT id
      FROM valorizaciones
      WHERE codigo = ?
      LIMIT 1
      `,
      [val.codigo]
    );
    
  if (existeCodigo.length > 0) {
    continue;
  }

  await guardarValorizacion(val, creadoPor);
  nuevos++;
}

  continue;
}
console.log("Procesando:", archivoCompleto.nombre);

const extension = archivoCompleto.nombre
  .toLowerCase()
  .split(".")
  .pop();

if (extension !== "pdf") {
  console.log("Archivo omitido:", archivoCompleto.nombre);
  continue;
}

const json = await procesarDocumento(
  archivoCompleto.buffer,
  archivoCompleto.nombre,
  "valorizacion"
);

console.log(json);

console.log("==================================");
console.log("ARCHIVO:", archivoCompleto.nombre);
console.log("TIPO:", json.tipoDocumento);
console.log("CLIENTE:", json.cliente);
console.log("PROYECTO:", json.proyecto);
console.log("==================================");

const esValorizacion =
  json.tipoDocumento?.toLowerCase() ===
  "valorizacion" ||

  json.tipoDocumento?.toLowerCase() ===
  "contrato" ||

  archivoCompleto.nombre
    .toLowerCase()
    .includes("valorización") ||

  archivoCompleto.nombre
    .toLowerCase()
    .includes("valorizacion");

if (esValorizacion) {

  json.archivoNombre =
    archivoCompleto.nombre;

  json.archivoOnedriveId =
    archivoCompleto.itemId;

  json.archivoUrl =
    archivoCompleto.webUrl;

  if (
  json.tipoDocumento?.toLowerCase() === "contrato" &&
  json.servicios?.length
) {

  for (const servicio of json.servicios) {

    await guardarValorizacion({
      creadoPor,

      proveedor:
  servicio.numeroRequerimiento
    ? json.cliente
    : json.proveedor,

      ruc:
  servicio.numeroRequerimiento
    ? json.rucCliente
    : json.rucProveedor,

      negocioOperacion: json.proyecto,

      numeroOrdenServicio:
  json.numeroOrdenCompra,

      numeroRequerimiento:
        servicio.numeroRequerimiento,

      descripcion:
        servicio.descripcion,

      monto:
        servicio.montoPactado,

      moneda:
        json.moneda,

      fechaEjecucion:
        servicio.fechaProgramada,

      archivoNombre:
        archivoCompleto.nombre,

      archivoOnedriveId:
        archivoCompleto.itemId,

      archivoUrl:
        archivoCompleto.webUrl

    });

    nuevos++;

  }

} else {

  await guardarValorizacion(json, creadoPor);
  nuevos++;

}

}
    }
    if (nuevos > 0) {
  await registrarActividad({
    tipo: "valorizacion",
    accion: "importacion",
    titulo: `Se registraron ${nuevos} valorizaciones`,
    subtitulo: "Sincronización con OneDrive",
  });
}

// ======================================================
// LIMPIAR ACTIVIDADES ANTIGUAS
// ======================================================

await pool.query(`
  DELETE
  FROM actividad_sistema
  WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
`);

    return NextResponse.json({
      success: true,
      encontrados: lista.length,
      nuevos
    });

  } catch (error: any) {

  console.error(
    "Falta de datos o error al procesar valorizaciones:",
    error
  );

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
export async function GET() {
  return POST();
}