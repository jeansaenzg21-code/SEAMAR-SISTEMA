import pool from "./mysql";
import { buscarOSPorNumero } from "./onedrive";

export async function guardarValorizacion(
  data: any
) {

  const os = await buscarOSPorNumero(
    data.numeroOrdenServicio
  );

  const codigo =
    `VAL-${Date.now()}`;

    
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [

      codigo,

      data.proveedor ?? null,
      data.ruc ?? null,
      data.negocioOperacion ?? null,

      data.numeroOrdenServicio ?? null,

      data.descripcion ?? null,

      data.monto ?? null,
      data.moneda ?? null,
      data.periodo ?? null,

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
