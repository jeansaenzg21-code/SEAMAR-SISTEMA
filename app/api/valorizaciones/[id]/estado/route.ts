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

    const observacionFinal =
      observacion && observacion.trim() !== ""
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
        estado,
        estado,
        estado,
        estado,
        observacionFinal,
        estado,
        id,
      ]
    );

    if (estado === "OBSERVADO") {
      await pool.query(
        `
        INSERT INTO valorizacion_observaciones (
          valorizacion_id,
          observacion,
          tipo,
          estado
        )
        VALUES (?, ?, 'SISTEMA', 'PENDIENTE')
        `,
        [
          id,
          observacionFinal,
        ]
      );
    }

    return NextResponse.json({
      success: true,
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