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

    let estadoFinal = estado;

    const observacionesSistema: string[] = [];

    if (estado === "EN_REVISION") {
      const [rows]: any = await pool.query(
        `
        SELECT
          numero_orden_servicio,
          pdf_a,
          pdf_b,
          excel_a,
          excel_b
        FROM valorizaciones
        WHERE id = ?
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

      if (!valorizacion?.pdf_a) {
        observacionesSistema.push(
          "Falta documento PDF A"
        );
      }

      if (!valorizacion?.pdf_b) {
        observacionesSistema.push(
          "Falta documento PDF B"
        );
      }

      if (!valorizacion?.excel_a) {
        observacionesSistema.push(
          "Falta documento Excel A"
        );
      }

      if (!valorizacion?.excel_b) {
        observacionesSistema.push(
          "Falta documento Excel B"
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