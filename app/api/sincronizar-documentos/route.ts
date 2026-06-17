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

  const archivosNuevos = [];

for (const archivo of archivos) {

  const [cxc]: any =
    await pool.query(
      `
      SELECT id
      FROM cuentas_por_cobrar
      WHERE archivo_onedrive_id = ?
      `,
      [archivo.id]
    );

  const [cxp]: any =
    await pool.query(
      `
      SELECT id
      FROM cuentas_por_pagar
      WHERE archivo_url = ?
      `,
      [archivo.webUrl]
    );

  if (
    cxc.length === 0 &&
    cxp.length === 0
  ) {
    archivosNuevos.push(archivo);
  }

}

  const [sync]: any =
await pool.query(
`
INSERT INTO sincronizaciones (
  estado,
  mensaje
)
VALUES (
  'PROCESANDO',
  'Iniciando sincronización'
)
`
);

const sincronizacionId =
sync.insertId;

let nuevos = 0;
let clientesNoEncontrados = 0;
let proyectosNoEncontrados = 0;
let proveedoresNoEncontrados = 0;
let nuevasCxc = 0;
let nuevasCxp = 0;

let procesados = 0;

await pool.query(
`
UPDATE sincronizaciones
SET
  total_documentos = ?
WHERE id = ?
`,
[
  archivosNuevos.length,
  sincronizacionId
]
);

for (const archivo of archivosNuevos) {

  


  const archivoCompleto =
    await descargarArchivo(
      archivo.id
    );
    const json =
  await procesarPdf(
    archivoCompleto.buffer
  );

  procesados++;

await pool.query(
`
UPDATE sincronizaciones
SET
  procesados = ?,
  mensaje = ?
WHERE id = ?
`,
[
  procesados,
  archivo.name,
  sincronizacionId
]
);

console.log(
  "JSON EXTRAIDO:",
  json
);

if (
  json.tipoDocumento?.toLowerCase() ===
  "factura"
) {

  if (json.destino === "COBRAR") {

    // TODO:
    // pegar aquí toda tu lógica actual de CxC
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

  nuevasCxc++;

await pool.query(
`
UPDATE sincronizaciones
SET
  cuentas_cobrar = ?
WHERE id = ?
`,
[
  nuevasCxc,
  sincronizacionId
]
);

  }

  else if (json.destino === "PAGAR") {

    // TODO:
    // nueva lógica CxP

    const [existe]: any =
  await pool.query(
    `
    SELECT id
    FROM cuentas_por_pagar
    WHERE numero_documento = ?
    `,
    [json.numeroFactura]
  );

if (existe.length > 0) {
  continue;
}

let proveedorId = null;

if (json.rucEmisor) {

  const [proveedores]: any =
    await pool.query(
      `
      SELECT id
      FROM proveedores
      WHERE ruc = ?
      LIMIT 1
      `,
      [json.rucEmisor]
    );

  if (proveedores.length > 0) {

    proveedorId =
      proveedores[0].id;

  } else {

    console.log(
  "Proveedor no encontrado:",
  json.empresaEmisora,
  json.rucEmisor
);

proveedoresNoEncontrados++;

continue;

  }

}

let proyectoId = null;

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

  }

}

const [ultimo]: any =
  await pool.query(
    `
    SELECT codigo
    FROM cuentas_por_pagar
    ORDER BY id DESC
    LIMIT 1
    `
  );

let correlativo = 1;

if (ultimo.length > 0) {

  const codigoAnterior =
    ultimo[0].codigo;

  if (
    codigoAnterior?.startsWith("CXP-")
  ) {

    correlativo =
      Number(
        codigoAnterior.split("-")[2]
      ) + 1;

  }

}

const codigo =
  `CXP-${new Date().getFullYear()}-${String(correlativo).padStart(4, "0")}`;

  await pool.query(
  `
  INSERT INTO cuentas_por_pagar (

    codigo,
    proveedor_id,
    proyecto_id,

    tipo_documento,
    numero_documento,

    descripcion,

    monto,
    saldo,

    fecha_emision,
    fecha_vencimiento,

    estado,

    archivo_url

  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  [

    codigo,

    proveedorId,

    proyectoId,

    "FACTURA",

    json.numeroFactura,

    json.descripcionServicio,

    json.montoTotal,
    json.montoTotal,

    json.fechaEmision,

    json.fechaVencimiento,

    "PENDIENTE",

    archivoCompleto.webUrl

  ]
);

console.log(
  "Factura por pagar registrada:",
  json.numeroFactura
);

nuevos++;

nuevasCxp++;

await pool.query(
`
UPDATE sincronizaciones
SET
  cuentas_pagar = ?
WHERE id = ?
`,
[
  nuevasCxp,
  sincronizacionId
]
);
  }

}
}

await pool.query(
`
UPDATE sincronizaciones
SET
  estado = 'COMPLETADO',
  fecha_fin = NOW(),
  mensaje = 'Sincronización completada',
  clientes_no_encontrados = ?,
  proveedores_no_encontrados = ?,
  proyectos_no_encontrados = ?
WHERE id = ?
`,
[
  clientesNoEncontrados,
  proveedoresNoEncontrados,
  proyectosNoEncontrados,
  sincronizacionId
]
);

return NextResponse.json({
  success: true,

  sincronizacionId,

  documentosProcesados:
    archivosNuevos.length,

  cuentasPorCobrarGeneradas: nuevasCxc,

  cuentasPorPagarGeneradas: nuevasCxp,

  clientesNoEncontrados,

  proveedoresNoEncontrados,

  proyectosNoEncontrados
});

  } catch (error: any) {

  console.error(error);

  if (error?.status === 429) {

  

    return NextResponse.json(
      {
        success: false,
        error:
          "Se alcanzó el límite diario de OpenAi."
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