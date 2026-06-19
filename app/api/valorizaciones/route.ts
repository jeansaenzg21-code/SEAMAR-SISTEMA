import { NextResponse } from "next/server";
import pool from "@/lib/mysql";
import { procesarDocumento } from "@/lib/openai-documentos";

export async function GET() {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        v.*,

        p.nombre AS proyecto_nombre,
        p.tipo AS proyecto_tipo,

        vp.nombre AS valorizacion_pactada_nombre,
        vp.cantidad AS valorizacion_pactada_cantidad,
        vp.monto AS valorizacion_pactada_monto,

        (
          SELECT vo.observacion
          FROM valorizacion_observaciones vo
          WHERE
            vo.valorizacion_id = v.id
            AND vo.tipo = 'SISTEMA'
          ORDER BY vo.id DESC
          LIMIT 1
        ) AS observacion_sistema

      FROM valorizaciones v

      LEFT JOIN proyectos p
        ON p.id = v.negocio_operacion

      LEFT JOIN valorizaciones_pactadas vp
        ON vp.id = v.valorizacion_pactada_id

      ORDER BY v.id DESC
      `
    )

    return NextResponse.json(rows)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener valorizaciones",
      },
      {
        status: 500,
      }
    )
  }
}