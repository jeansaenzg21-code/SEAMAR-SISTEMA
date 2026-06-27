import pool from "./mysql";
import { buscarOSPorNumero } from "./onedrive";
import { procesarDocumento } from "@/lib/openai-documentos";

export async function guardarValorizacion(
  data: any
) {

  const os = await buscarOSPorNumero(
    data.numeroOrdenServicio
  );

  const codigo =
  data.codigo || `VAL-${Date.now()}`;

    
  const [result]: any =
  await pool.query(
    `
    INSERT INTO valorizaciones (

      codigo,

      proveedor,
      ruc,
      negocio_operacion,

      numero_orden_servicio,

      descripcion,
      pu,

      monto,
      moneda,
      periodo,

      fecha_ejecucion,

      estado,

archivo_nombre,
archivo_onedrive_id,
archivo_url,

respaldo_nombre,
      respaldo_onedrive_id,
      respaldo_url,

      observaciones

    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [

      codigo,

      data.proveedor || "SIN PROVEEDOR",
data.ruc || "",
data.negocioOperacion || "",

data.numeroOrdenServicio || "",

data.descripcion || data.archivoNombre || "Valorización sin descripción",

Number(Number(data.pu || 0).toFixed(2)),

Number(Number(data.monto || 0).toFixed(2)),
data.moneda || "PEN",
data.periodo || "",

      data.fechaEjecucion
  ? data.fechaEjecucion
  : null,

      "BORRADOR",

data.archivoNombre ?? null,
data.archivoOnedriveId ?? null,
data.archivoUrl ?? null,

os?.name ?? null,
      os?.id ?? null,
      os?.webUrl ?? null,

      os
        ? null
        : "Orden de servicio no encontrada"

    ]
  );

  const valorizacionId =
  result.insertId;

if (!os) {

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

      "Orden de servicio no encontrada",

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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
