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
  observacion,
  observation_status
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

observation_status =
  CASE
    WHEN ? = 'OBSERVADO'
    THEN 'pending'
    ELSE observation_status
  END,

    fecha_aprobacion =
  CASE
    WHEN ? = 'APROBADO'
    THEN NOW()
    ELSE fecha_aprobacion
  END,

observation_status =
  COALESCE(?, observation_status)

  WHERE id = ?
  `,
  [
  estado,
  estado,
  estado,
  estado,
  observacion,
  estado,
  observation_status,
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