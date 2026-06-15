import { NextResponse } from "next/server";
import {
  listarDocumentos,
  descargarArchivo
} from "@/lib/onedrive";

import pool from "@/lib/mysql";

import {
  procesarPdf
} from "@/lib/openai-documentos";


export async function POST() {

  try {
const data =
  await listarDocumentos();

const archivos =
  data.value || [];

let nuevos = 0;
let clientesNoEncontrados = 0;
let proyectosNoEncontrados = 0;

for (const archivo of archivos) {

  const [rows]: any =
    await pool.query(
      `
      SELECT id
      FROM cuentas_por_cobrar
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
    const json =
  await procesarPdf(
    archivoCompleto.buffer
  );

console.log(
  "JSON EXTRAIDO:",
  json
);

if (
  json.tipoDocumento?.toLowerCase() ===
  "factura"
) {
const [existe]: any =
  await pool.query(
    `
    SELECT id
    FROM cuentas_por_cobrar
    WHERE numero_factura = ?
    `,
    [json.numeroFactura]
  );

if (existe.length > 0) {
  continue;
}

let clienteId = null;
let proyectoId = null;

if (json.rucCliente) {

  const [clientes]: any =
    await pool.query(
      `
      SELECT id
      FROM clientes
      WHERE ruc = ?
      LIMIT 1
      `,
      [json.rucCliente]
    );

  if (clientes.length > 0) {

    clienteId =
      clientes[0].id;

  } else {

    console.log(
  "Cliente no encontrado:",
  json.empresaCliente,
  json.rucCliente
);

clientesNoEncontrados++;

continue;

  }

}

if (json.proyecto) {

  const [proyectos]: any =
    await pool.query(
      `
      SELECT id
      FROM proyectos
      WHERE nombre = ?
      LIMIT 1
      `,
      [json.proyecto]
    );

  if (proyectos.length > 0) {

    proyectoId =
      proyectos[0].id;

  } else {

    console.log(
  "Proyecto no encontrado:",
  json.proyecto
);

proyectosNoEncontrados++;

  }

}

const [ultimo]: any =
  await pool.query(
    `
    SELECT codigo
    FROM cuentas_por_cobrar
    ORDER BY id DESC
    LIMIT 1
    `
  );

let correlativo = 1;

if (ultimo.length > 0) {

  const codigoAnterior =
    ultimo[0].codigo;

  if (
    codigoAnterior?.startsWith("CXC-")
  ) {

    const partes =
      codigoAnterior.split("-");

    correlativo =
      Number(partes[2]) + 1;

  }

}

const codigo =
  `CXC-${new Date().getFullYear()}-${String(correlativo).padStart(4, "0")}`;

await pool.query(
    `
    INSERT INTO cuentas_por_cobrar (

      codigo,

      cliente_id,

      proyecto_id,

      numero_factura,

      descripcion,

      monto,
      saldo,

      fecha_emision,
      fecha_vencimiento,

      estado,

      archivo_onedrive_id,
      archivo_nombre,
      archivo_url

    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [

      codigo,

      clienteId,

      proyectoId,

      json.numeroFactura,

      json.descripcionServicio,

      json.montoTotal,
      json.montoTotal,

      json.fechaEmision,

      json.fechaVencimiento,

      "PENDIENTE",

      archivoCompleto.itemId,

      archivoCompleto.nombre,

      archivoCompleto.webUrl

    ]
  );

  console.log(
    "Factura registrada:",
    json.numeroFactura
  );

  nuevos++;

}
}

return NextResponse.json({
  success: true,
  encontrados: archivos.length,
  nuevos,
  clientesNoEncontrados,
  proyectosNoEncontrados
});

  } catch (error: any) {

  console.error(error);

  if (error?.status === 429) {

    return NextResponse.json(
      {
        success: false,
        error:
          "Se alcanzó el límite diario de Gemini."
      },
      {
        status: 429
      }
    );

  }

  return NextResponse.json(
    {
      success: false
    },
    {
      status: 500
    }
  );

  }}