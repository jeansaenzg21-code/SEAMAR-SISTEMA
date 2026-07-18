  import { NextResponse } from "next/server";
  import pool from "@/lib/mysql";
  import { obtenerSesion } from "@/lib/session";

 export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
    try {

     const { id } = await params;

const body = await req.json();
console.log(body);

const { estado, observacion } = body;

const esAprobacion = estado === "APROBADO";

const sesion = await obtenerSesion();

if (
  esAprobacion &&
  (
    !sesion ||
    (
      sesion.rol !== "ADMINISTRADOR" &&
      sesion.rol !== "SUPERVISOR"
    )
  )
) {
  return NextResponse.json(
    {
      error: "No tiene permisos para aprobar valorizaciones."
    },
    {
      status: 403
    }
  );
}

     if (body.observation_status === "resolved") {

  console.log("ENTRO A RESOLVED", id, body);

  

  await pool.query(
  `
  UPDATE valorizacion_observaciones
  SET
    estado = 'RESUELTA',
    fecha_resolucion = NOW()
  WHERE valorizacion_id = ?
  AND estado <> 'RESUELTA'
  `,
  [id]
);




  await pool.query(
    `
    UPDATE valorizaciones
    SET
      estado = 'EN_REVISION',
      fecha_revision = NOW(),
      enviado_revision_por = ?
    WHERE id = ?
    `,
    [sesion?.nombre || sesion?.correo || "Sistema", id]
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
        AND estado <> 'RESUELTA'
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

      let enviadoRevisionPor = null;
let aprobadoPor = null;
let observadoPor = null;



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

  const [clienteRows]: any = await pool.query(
    `
    SELECT proveedor
    FROM valorizaciones
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  const proveedor = String(
    clienteRows[0]?.proveedor || ""
  ).toUpperCase();

  const esRepsol = proveedor.includes("REPSOL");
  const documentosRequeridos = esRepsol ? 4 : 3;

  if (Number(valorizacion?.documentos_adjuntos || 0) < documentosRequeridos) {
  observacionesSistema.push(
    `Documentos incompletos para ${esRepsol ? "REPSOL" : "TDP"}`
  );
}

if (observacionesSistema.length > 0) {
  estadoFinal = "OBSERVADO";
}

      }

if (estado === "EN_REVISION") {
  enviadoRevisionPor =
    sesion?.nombre || sesion?.correo || "Sistema";
}

if (estadoFinal === "APROBADO") {
  aprobadoPor =
    sesion?.nombre || sesion?.correo || "Sistema";
}

if (estadoFinal === "OBSERVADO") {
  observadoPor =
    sesion?.nombre || sesion?.correo || "Sistema";
}







      const observacionFinal =
        observacionesSistema.length > 0
          ? observacionesSistema.join("\n")
          : observacion && observacion.trim() !== ""
            ? observacion
            : "";

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

fecha_fin =
  CASE
    WHEN ? = 'APROBADO'
    THEN NOW()
    ELSE fecha_fin
  END,

dias_para_aprobar =
  CASE
      WHEN ? = 'APROBADO'
      THEN TIMESTAMPDIFF(DAY, created_at, NOW())
      ELSE dias_para_aprobar
    END

    ,

enviado_revision_por =
  CASE
    WHEN ? = 'EN_REVISION'
    THEN ?
    ELSE enviado_revision_por
  END,

aprobado_por =
  CASE
    WHEN ? = 'APROBADO'
    THEN ?
    ELSE aprobado_por
  END,

observado_por =
  CASE
    WHEN ? = 'OBSERVADO'
    THEN ?
    ELSE observado_por
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
  estadoFinal,

  estado,
  enviadoRevisionPor,

  estadoFinal,
  aprobadoPor,

  estadoFinal,
  observadoPor,

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
     console.error("ERROR COMPLETO:", error);

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