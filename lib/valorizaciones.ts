import pool from "./mysql";
import { buscarOSPorNumero } from "./onedrive";
export async function guardarValorizacion(
  data: any,
  creadoPor?: string
) {

  const esRepsol =
  (data.proveedor || "")
    .toUpperCase()
    .includes("REPSOL");

const documentosCompletos =
  Number(data.documentosAdjuntos || 0) >= 4;

console.time("buscar_os_onedrive")
const os =
  esRepsol && documentosCompletos
    ? { name: null, id: null, webUrl: null }
    : await buscarOSPorNumero(
        data.numeroOrdenServicio
      );
console.timeEnd("buscar_os_onedrive")

console.log("HASH:", data.hashArchivo);

console.time("busqueda_duplicado")
      const [duplicado]: any = await pool.query(
  `
  SELECT id
  FROM valorizaciones
  WHERE hash_archivo = ?
  LIMIT 1
  `,
  [data.hashArchivo]
);
console.timeEnd("busqueda_duplicado")

console.log("DUPLICADO:", duplicado);

if (duplicado.length > 0) {
  console.log("La valorización ya existe. Se omite el registro.");
  return;
}

  const fechaBase =
  data.fechaValorizacion ||
  data.fechaEjecucion ||
  new Date().toISOString().slice(0, 10);

const anio =
  new Date(fechaBase).getFullYear();

let codigo = data.codigo;

if (!codigo) {

  const [rows]: any = await pool.query(
    `
    SELECT codigo
    FROM valorizaciones
    WHERE codigo LIKE ?
    ORDER BY id DESC
    LIMIT 1
    `,
    [
      `VAL-${anio}-%`
    ]
  );

  let correlativo = 1;

  if (rows.length > 0) {

    const ultimo = rows[0].codigo;

    const partes = ultimo.split("-");

    if (partes.length >= 3) {
      correlativo = Number(partes[2]) + 1;
    }

  }

  codigo =
    `VAL-${anio}-${String(correlativo).padStart(2, "0")}`;

}

  console.log("=== DATOS RECIBIDOS ===");
  console.log("RUC:", data.ruc);
  console.log("empresaCliente:", data.empresaCliente);
  console.log("proveedor:", data.proveedor);

  if (data.ruc) {
    console.time("busqueda_cliente_ruc")
    const [cliente]: any = await pool.query(
      `SELECT razon_social FROM clientes WHERE ruc = ? LIMIT 1`,
      [data.ruc]
    )
    console.log("Cliente encontrado:", cliente);
    console.timeEnd("busqueda_cliente_ruc")
    if (cliente.length > 0) {
      data.empresaCliente = cliente[0].razon_social
      data.proveedor = cliente[0].razon_social
    }
  }

console.time("insert_valorizacion_mysql")
  const [result]: any =
  await pool.query(
    `
    INSERT INTO valorizaciones (

      codigo,

      proveedor,
      ruc,
      negocio_operacion,

        numero_orden_servicio,

numero_requerimiento,

descripcion,

pu,

      monto,
      moneda,
      periodo,

      fecha_ejecucion,

      estado,

      creado_por,

archivo_nombre,
archivo_onedrive_id,
archivo_url,

respaldo_nombre,
      respaldo_onedrive_id,
      respaldo_url,

      
observaciones,
hash_archivo

)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [

      codigo,

      data.empresaCliente ??
data.proveedor ??
"SIN PROVEEDOR",
data.ruc || "",

data.proyecto ??
data.negocioOperacion ??
data.descripcion ??
"",

data.numeroOrdenServicio || "",

data.numeroRequerimiento || "",

data.descripcion || data.archivoNombre || "Valorización sin descripción",

Number(Number(data.pu || 0).toFixed(2)),

Number(
  Number(
    data.montoValorizado ??
    data.monto ??
    0
  ).toFixed(2)
),

data.moneda || "PEN",

data.periodo || "",

data.fechaValorizacion ??
data.fechaEjecucion ??
null,

      "BORRADOR",

      creadoPor ?? "Sistema",

data.archivoNombre ?? null,
data.archivoOnedriveId ?? null,
data.archivoUrl ?? null,

os?.name ?? null,
os?.id ?? null,
os?.webUrl ?? null,

os
  ? null
  : "Documentos incompletos",

data.hashArchivo

    ]
  );
console.timeEnd("insert_valorizacion_mysql")

  const valorizacionId =
  result.insertId;

if (esRepsol && !os) {

  await pool.query(
    `
    INSERT INTO valorizacion_observaciones (

      valorizacion_id,

      tipo,

      observacion,

      usuario

    )
    VALUES (?, ?, ?, ?)
    `,
    [
      valorizacionId,

      "SISTEMA",

      "Documentos incompletos para REPSOL",

      "Sistema"
    ]
  );

}

}
export async function guardarContrato(
  data: any,
  archivo?: {
    nombre?: string;
    onedriveId?: string;
    url?: string;
  }
) {
  const rucCliente =
    data.rucCliente ?? null;

  let clienteId = null;

  const [clientes]: any =
    await pool.query(
      `
      SELECT id
      FROM clientes
      WHERE ruc = ?
      LIMIT 1
      `,
      [rucCliente]
    );

  if (clientes.length > 0) {
    clienteId = clientes[0].id;
  }

  if (!clienteId) {
    return;
  }

  const nombreProyecto =
    data.proyecto ||
    data.descripcionProyecto ||
    "Proyecto sin nombre";

  const [proyectos]: any =
    await pool.query(
      `
      SELECT id
      FROM proyectos
      WHERE cliente_id = ?
      AND nombre = ?
      LIMIT 1
      `,
      [
        clienteId,
        nombreProyecto
      ]
    );

  let proyectoId = null;

  if (proyectos.length > 0) {
    proyectoId = proyectos[0].id;
  } else {
    const [result]: any =
      await pool.query(
        `
        INSERT INTO proyectos (
          cliente_id,
          nombre,
          descripcion,
          estado,
          fecha_inicio
        )
        VALUES (?, ?, ?, ?, CURDATE())
        `,
        [
          clienteId,
          nombreProyecto,
          data.descripcionProyecto ?? null,
          "EN_CURSO"
        ]
      );

    proyectoId = result.insertId;
  }

  const servicios =
    Array.isArray(data.servicios)
      ? data.servicios
      : [];

  for (const servicio of servicios) {
    await pool.query(
      `
      INSERT INTO proyecto_servicios (
        proyecto_id,
        nombre_servicio,
        descripcion,
        numero_oc,
        numero_requerimiento,
        fecha_programada,
        unidad_medida,
        cantidad,
        precio_unitario,
        monto_pactado,
        moneda,
        archivo_nombre,
        archivo_onedrive_id,
        archivo_url,
        estado
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        proyectoId,
        servicio.nombreServicio ?? "Servicio sin nombre",
        servicio.descripcion ?? null,
        data.numeroOrdenCompra ?? null,
        servicio.numeroRequerimiento ?? null,
        servicio.fechaProgramada ?? null,
        servicio.unidadMedida ?? null,
        servicio.cantidad ?? 1,
        servicio.precioUnitario ?? null,
        servicio.montoPactado ?? 0,
        data.moneda ?? "SOLES",
        archivo?.nombre ?? null,
        archivo?.onedriveId ?? null,
        archivo?.url ?? null,
        "PENDIENTE"
      ]
    );
  }
}
