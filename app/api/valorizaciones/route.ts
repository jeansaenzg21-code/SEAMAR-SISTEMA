import { NextResponse } from "next/server";
import pool from "@/lib/mysql";
import { procesarDocumento } from "@/lib/openai-documentos";

export async function GET() {
  try {
    const [rows] = await pool.query(
  `
  SELECT

    v.*,

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

  ORDER BY v.id DESC
  `
);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener valorizaciones",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      proveedor,
      ruc,
      negocio_operacion,
      numero_orden_servicio,
      descripcion,
      monto,
      moneda,
      periodo,
      fecha_ejecucion,

      encargado,

      archivo_nombre,
      archivo_onedrive_id,
      archivo_url,

      respaldo_nombre,
      respaldo_onedrive_id,
      respaldo_url,

      pdf_a,
      pdf_b,
      excel_a,
      excel_b,
    } = body;

    const codigo = `VAL-${Date.now()}`;

    const [result] = await pool.query(
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
        encargado,
        archivo_nombre,
        archivo_onedrive_id,
        archivo_url,
        respaldo_nombre,
        respaldo_onedrive_id,
        respaldo_url,
        pdf_a,
        pdf_b,
        excel_a,
        excel_b
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
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
        "BORRADOR",
        encargado,
        archivo_nombre,
        archivo_onedrive_id,
        archivo_url,
        respaldo_nombre,
        respaldo_onedrive_id,
        respaldo_url,
        pdf_a || null,
        pdf_b || null,
        excel_a || null,
        excel_b || null,
      ]
    );

    const insertResult = result as any;
    const valorizacionId = insertResult.insertId;

    const observacionesSistema: string[] = [];

    if (!pdf_a) {
      observacionesSistema.push("Falta documento PDF A");
    }

    if (!pdf_b) {
      observacionesSistema.push("Falta documento PDF B");
    }

    if (!excel_a) {
      observacionesSistema.push("Falta documento Excel A");
    }

    if (!excel_b) {
      observacionesSistema.push("Falta documento Excel B");
    }

    if (observacionesSistema.length > 0) {
      for (const obs of observacionesSistema) {
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
          [valorizacionId, obs]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Valorización registrada correctamente",
      result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al registrar valorización",
      },
      {
        status: 500,
      }
    );
  }
}