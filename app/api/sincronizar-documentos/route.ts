import { NextResponse } from "next/server";
import {
  listarDocumentos,
  descargarArchivo
} from "@/lib/onedrive";

import pool from "@/lib/mysql";
import { NextRequest } from "next/server";
import {
  procesarDocumento
} from "@/lib/openai-documentos";
import { enviarCorreo } from "@/lib/outlook";

import { registrarActividad } from "@/lib/actividad";

const TAMANO_LOTE = 10;

export async function POST(
  request: NextRequest
) {
const body =
  await request.json();

const sincronizacionId =
  body.sincronizacionId;
  try {
const data =
  await listarDocumentos();

const archivos =
  data.value || [];

// ---- Carga única de IDs/URLs existentes para detectar duplicados en memoria ----
const [filasCxc]: any =
  await pool.query(
    `
    SELECT archivo_onedrive_id
    FROM cuentas_por_cobrar
    WHERE archivo_onedrive_id IS NOT NULL
    `
  );

const [filasCxp]: any =
  await pool.query(
    `
    SELECT archivo_url
    FROM cuentas_por_pagar
    WHERE archivo_url IS NOT NULL
    `
  );

const cuentasCobrarExistentes =
  new Set<string>(
    filasCxc.map((fila: any) => fila.archivo_onedrive_id)
  );

const cuentasPagarExistentes =
  new Set<string>(
    filasCxp.map((fila: any) => fila.archivo_url)
  );

  const archivosNuevos = [];

for (const archivo of archivos) {

  const yaExisteComoCxc =
    cuentasCobrarExistentes.has(archivo.id);

  const yaExisteComoCxp =
    cuentasPagarExistentes.has(archivo.webUrl);

  if (
    !yaExisteComoCxc &&
    !yaExisteComoCxp
  ) {
    archivosNuevos.push(archivo);
  }

}

  

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

// ---- Correlativos calculados UNA SOLA VEZ antes del loop ----
const [ultimoCxc]: any =
  await pool.query(
    `
    SELECT codigo
    FROM cuentas_por_cobrar
    ORDER BY id DESC
    LIMIT 1
    `
  );

let correlativoCxc = 1;

if (ultimoCxc.length > 0) {
  const codigoAnterior = ultimoCxc[0].codigo;
  if (codigoAnterior?.startsWith("CXC-")) {
    const partes = codigoAnterior.split("-");
    correlativoCxc = Number(partes[2]) + 1;
  }
}

const [ultimoCxp]: any =
  await pool.query(
    `
    SELECT codigo
    FROM cuentas_por_pagar
    ORDER BY id DESC
    LIMIT 1
    `
  );

let correlativoCxp = 1;

if (ultimoCxp.length > 0) {
  const codigoAnterior = ultimoCxp[0].codigo;
  if (codigoAnterior?.startsWith("CXP-")) {
    correlativoCxp = Number(codigoAnterior.split("-")[2]) + 1;
  }
}

// ---- Cachés en memoria para evitar consultas duplicadas ----
const clientesCache = new Map<string, number | null>();
const proveedoresCache = new Map<string, number | null>();
const proyectosCache = new Map<string, number | null>();

const UPDATE_CADA_N_DOCUMENTOS = 25;

// ---- Lógica de procesamiento de un archivo individual (sin cambios de negocio) ----
const procesarArchivo = async (archivo: any) => {
  try {

  const archivoCompleto =
    await descargarArchivo(
      archivo.id
    );
    const json =
  await procesarDocumento(
    archivoCompleto.buffer,
    archivo.name,
    "factura"
  );

  const RUC_SEAMAR =
  "20611842458";

const rucEmisor =
  String(
    json.rucEmisor || ""
  )
  .replace(/\D/g, "");

const rucCliente =
  String(
    json.rucCliente || ""
  )
  .replace(/\D/g, "");

const empresaEmisora =
  String(
    json.empresaEmisora || ""
  )
  .toUpperCase();

const empresaCliente =
  String(
    json.empresaCliente || ""
  )
  .toUpperCase();

  const entidadPrincipal =
  String(
    json.entidadPrincipal || ""
  )
  .toUpperCase();

const esDocumentoBancario =

  empresaEmisora.includes("BANCO") ||

  entidadPrincipal.includes("BANCO") ||

  empresaEmisora.includes("BCP") ||

  entidadPrincipal.includes("BCP") ||

  empresaEmisora.includes("BBVA") ||

  entidadPrincipal.includes("BBVA") ||

  empresaEmisora.includes("INTERBANK") ||

  entidadPrincipal.includes("INTERBANK") ||

  empresaEmisora.includes("SCOTIABANK") ||

  entidadPrincipal.includes("SCOTIABANK");

if (esDocumentoBancario) {

  json.destino = "PAGAR";

}

else if (
  rucCliente.includes(RUC_SEAMAR) ||
  empresaCliente.includes("SEAMAR")
) {

  json.destino = "PAGAR";

}

else if (
  rucEmisor.includes(RUC_SEAMAR) ||
  empresaEmisora.includes("SEAMAR")
) {

  json.destino = "COBRAR";

}

  procesados++;

if (
  procesados % UPDATE_CADA_N_DOCUMENTOS === 0 ||
  procesados === archivosNuevos.length
) {

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

}

console.log(
  "JSON EXTRAIDO:",
  json
);

const esFactura =

json.numeroFactura &&

json.montoTotal &&

(
json.destino === "PAGAR" ||
json.destino === "COBRAR"
);

if (!esFactura) {

  console.log(
    "[NO REGISTRADA]",
    archivo.name,
    {
      numeroFactura: json.numeroFactura,
      montoTotal: json.montoTotal,
      destino: json.destino
    }
  );

}

if (esFactura) {

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

console.log(
  "[DUPLICADA]",
  json.numeroFactura
);

return;
}

let clienteId = null;
let proyectoId = null;

if (json.rucCliente) {

  if (clientesCache.has(json.rucCliente)) {

    clienteId = clientesCache.get(json.rucCliente)!;

  } else {

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
        "Creando cliente automáticamente:",
        json.empresaCliente
      );

      const [nuevoCliente]: any =
        await pool.query(
          `
          INSERT INTO clientes (
            razon_social,
            ruc,
            estado
          )
          VALUES (?, ?, ?)
          `,
          [
            json.empresaCliente,
            json.rucCliente,
            "ACTIVO"
          ]
        );

      clienteId =
        nuevoCliente.insertId;

    }

    clientesCache.set(json.rucCliente, clienteId);

  }

}

if (json.proyecto) {

  if (proyectosCache.has(json.proyecto)) {

    proyectoId = proyectosCache.get(json.proyecto)!;

    if (proyectoId === null) {
      proyectosNoEncontrados++;
    }

  } else {

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

    proyectosCache.set(json.proyecto, proyectoId);

  }

}

const codigo =
  `CXC-${new Date().getFullYear()}-${String(correlativoCxc).padStart(4, "0")}`;

correlativoCxc++;

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

console.log(
  "[DUPLICADA]",
  json.numeroFactura
);

return;
}

let proveedorId = null;

if (json.rucEmisor) {

  // ---- PASO 1: búsqueda/creación por RUC ----

  if (proveedoresCache.has(json.rucEmisor)) {

    proveedorId = proveedoresCache.get(json.rucEmisor)!;

  } else {

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

      console.log(
        "[PROVEEDOR POR RUC]",
        json.rucEmisor,
        proveedorId
      );

    } else {

    console.log(
      "Creando proveedor automáticamente:",
      json.empresaEmisora
    );

    const [nuevoProveedor]: any =
      await pool.query(
        `
        INSERT INTO proveedores (
          razon_social,
          ruc,
          estado
        )
        VALUES (?, ?, ?)
        `,
        [
          json.empresaEmisora,
          json.rucEmisor,
          "ACTIVO"
        ]
      );

    proveedorId =
      nuevoProveedor.insertId;

    console.log(
      "[PROVEEDOR CREADO]",
      json.rucEmisor,
      proveedorId
    );

  }

  proveedoresCache.set(json.rucEmisor, proveedorId);

  }

} else if (json.empresaEmisora) {

  // ---- PASO 2: sin RUC, fallback por razón social ----

  const claveCache =
    `nombre:${json.empresaEmisora}`;

  if (proveedoresCache.has(claveCache)) {

    proveedorId = proveedoresCache.get(claveCache)!;

  } else {

    const [proveedoresPorNombre]: any =
      await pool.query(
        `
        SELECT id
        FROM proveedores
        WHERE razon_social = ?
        LIMIT 1
        `,
        [json.empresaEmisora]
      );

    if (proveedoresPorNombre.length > 0) {

      proveedorId =
        proveedoresPorNombre[0].id;

      console.log(
        "[PROVEEDOR POR NOMBRE]",
        json.empresaEmisora,
        proveedorId
      );

    } else {

      console.log(
        "Creando proveedor automáticamente (sin RUC):",
        json.empresaEmisora
      );

      const [nuevoProveedorSinRuc]: any =
        await pool.query(
          `
          INSERT INTO proveedores (
            razon_social,
            ruc,
            estado
          )
          VALUES (?, ?, ?)
          `,
          [
            json.empresaEmisora,
            null,
            "ACTIVO"
          ]
        );

      proveedorId =
        nuevoProveedorSinRuc.insertId;

      console.log(
        "[PROVEEDOR CREADO]",
        json.empresaEmisora,
        proveedorId
      );

    }

    proveedoresCache.set(claveCache, proveedorId);

  }

} else {

  console.log(
    "[PROVEEDOR NO ENCONTRADO]",
    archivo.name
  );

}

let proyectoId = null;

if (json.proyecto) {

  if (proyectosCache.has(json.proyecto)) {

    proyectoId = proyectosCache.get(json.proyecto)!;

  } else {

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

    proyectosCache.set(json.proyecto, proyectoId);

  }

}

const codigo =
  `CXP-${new Date().getFullYear()}-${String(correlativoCxp).padStart(4, "0")}`;

correlativoCxp++;

  await pool.query(
  `
  INSERT INTO cuentas_por_pagar (

  codigo,
  proveedor_id,
  proyecto_id,

  numero_documento,

  descripcion,

  monto,
  moneda,
  saldo,

  fecha_emision,
  fecha_vencimiento,

  detraccion,
  forma_pago,
  categorizacion,

  estado,

  archivo_url

)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  [
  codigo,

  proveedorId,

  proyectoId,

  json.numeroFactura,

  json.descripcionServicio,

  json.montoTotal,

json.moneda ?? "SOLES",

json.montoTotal,

json.fechaEmision,

  json.fechaVencimiento,

  json.detraccion,

  json.formaPago,

  json.categorizacion,

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

  }

}

  } catch (error) {

    console.error(
      "[ERROR ARCHIVO]",
      archivo.name,
      error
    );

  }

};

// ---- Procesamiento por lotes en paralelo ----
for (let i = 0; i < archivosNuevos.length; i += TAMANO_LOTE) {

  const lote =
    archivosNuevos.slice(i, i + TAMANO_LOTE);

  await Promise.all(
    lote.map((archivo) => procesarArchivo(archivo))
  );

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
  proyectos_no_encontrados = ?,
  cuentas_cobrar = ?,
  cuentas_pagar = ?,
  procesados = ?
WHERE id = ?
`,
[
  clientesNoEncontrados,
  proveedoresNoEncontrados,
  proyectosNoEncontrados,
  nuevasCxc,
  nuevasCxp,
  procesados,
  sincronizacionId
]
);
// ======================================================
// ACTIVIDADES DEL SISTEMA
// ======================================================

if (nuevasCxc > 0) {
  await registrarActividad({
    tipo: "cxc",
    accion: "importacion",
    titulo: `Se registraron ${nuevasCxc} cuentas por cobrar`,
    subtitulo: "Sincronización con OneDrive",
  });
}

if (nuevasCxp > 0) {
  await registrarActividad({
    tipo: "cxp",
    accion: "importacion",
    titulo: `Se registraron ${nuevasCxp} cuentas por pagar`,
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


const asunto =
  "SEAMAR - Sincronización completada";

const html = `
<h2>Resumen de sincronización</h2>

<p><strong>Documentos procesados:</strong> ${archivosNuevos.length}</p>

<p><strong>Cuentas por cobrar:</strong> ${nuevasCxc}</p>

<p><strong>Cuentas por pagar:</strong> ${nuevasCxp}</p>

<p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
`;

await enviarCorreo(
  asunto,
  html
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