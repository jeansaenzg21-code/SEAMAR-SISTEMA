import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {

  try {

    const { id } = await params;

    const body =
      await req.json();

    const {
  estado,
  observacion
} = body;

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

  observacion,

  estado,

  id
]
);

    return NextResponse.json({
      success: true
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        success: false
      },
      {
        status: 500
      }
    );

  }

}