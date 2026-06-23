import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await req.json();

    const { estado, observacion } = body;

    if (body.observation_status === "resolved") {
  await pool.query(
    `
    UPDATE valorizacion_observaciones
    SET
      estado = 'RESUELTA',
      fecha_resolucion = NOW()
    WHERE valorizacion_id = ?
      AND estado = 'EN_PROGRESO'
    `,
    [id]
  );

  await pool.query(
    `
    UPDATE valorizaciones
    SET
      estado = 'EN_REVISION',
      fecha_revision = NOW()
    WHERE id = ?
    `,
    [id]
  );

  return NextResponse.json({
    success: true,
  });
}

if (body.observation_status === "in_progress") {
  await pool.query(
    `
    UPDATE valorizacion_observaciones
    SET
      estado = 'EN_PROGRESO',
      fecha_en_progreso = NOW()
    WHERE valorizacion_id = ?
      AND estado = 'PENDIENTE'
    `,
    [id]
  );

  return NextResponse.json({
    success: true,
  });
}
    if (!estado) {
  await pool.query(
    `
    UPDATE valorizaciones
    SET
      proveedor = ?,
      negocio_operacion = ?,
      numero_orden_servicio = ?,
      descripcion = ?,
      monto = ?,
      moneda = ?,
      periodo = ?,
      fecha_ejecucion = ?,
      encargado = ?
    WHERE id = ?
    `,
    [
      body.proveedor,
      body.negocio_operacion,
      body.numero_orden_servicio,
      body.descripcion,
      body.monto,
      body.moneda,
      body.periodo,
      body.fecha_ejecucion,
      body.encargado,
      id,
    ]
  );

  return NextResponse.json({
    success: true,
  });
}

    let estadoFinal = estado;

    const observacionesSistema: string[] = [];

    if (estado === "EN_REVISION") {
      const [rows]: any = await pool.query(
        `
        SELECT
  v.numero_orden_servicio,
  COUNT(vd.id) AS documentos_adjuntos
FROM valorizaciones v
LEFT JOIN valorizacion_documentos vd
  ON vd.valorizacion_id = v.id
WHERE v.id = ?
GROUP BY v.id, v.numero_orden_servicio
LIMIT 1
        `,
        [id]
      );

      const valorizacion = rows[0];

      if (!valorizacion?.numero_orden_servicio) {
        observacionesSistema.push(
          "Orden de servicio no fue encontrada"
        );
      }

      if (Number(valorizacion?.documentos_adjuntos || 0) === 0) {
  observacionesSistema.push(
    "No se encontraron documentos adjuntos"
  );
}

      if (observacionesSistema.length > 0) {
        estadoFinal = "OBSERVADO";
      }
    }

    const observacionFinal =
      observacionesSistema.length > 0
        ? observacionesSistema.join("\n")
        : observacion && observacion.trim() !== ""
          ? observacion
          : "Orden de servicio no fue encontrada";

    await pool.query(
      `
      UPDATE valorizaciones
      SET
        estado = ?,

        fecha_revision =
          CASE
            WHEN ? = 'EN_REVISION'
            THEN NOW()
            ELSE fecha_revision
          END,

        fecha_observacion =
          CASE
            WHEN ? = 'OBSERVADO'
            THEN NOW()
            ELSE fecha_observacion
          END,

        observaciones =
          CASE
            WHEN ? = 'OBSERVADO'
            THEN ?
            ELSE observaciones
          END,

        fecha_aprobacion =
  CASE
    WHEN ? = 'APROBADO'
    THEN NOW()
    ELSE fecha_aprobacion
  END,

dias_para_aprobar =
  CASE
    WHEN ? = 'APROBADO'
    THEN TIMESTAMPDIFF(DAY, created_at, NOW())
    ELSE dias_para_aprobar
  END

      WHERE id = ?
      `,
      [
  estadoFinal,
  estadoFinal,
  estadoFinal,
  estadoFinal,
  observacionFinal,
  estadoFinal,
  estadoFinal,
  id,
]
    );

    if (estadoFinal === "OBSERVADO") {
      for (const obs of observacionFinal.split("\n")) {
        const [observacionesExistentes]: any = await pool.query(
          `
          SELECT id
          FROM valorizacion_observaciones
          WHERE valorizacion_id = ?
            AND tipo = 'SISTEMA'
            AND observacion = ?
            AND estado = 'PENDIENTE'
          LIMIT 1
          `,
          [id, obs]
        );

        if (observacionesExistentes.length === 0) {
          await pool.query(
            `
            INSERT INTO valorizacion_observaciones (
              valorizacion_id,
              observacion,
              tipo,
              usuario,
              estado
            )
            VALUES (?, ?, 'SISTEMA', 'Sistema', 'PENDIENTE')
            `,
            [id, obs]
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      estado: estadoFinal,
      observaciones: observacionFinal,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}