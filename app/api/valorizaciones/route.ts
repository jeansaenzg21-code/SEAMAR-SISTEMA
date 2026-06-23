import { NextResponse } from "next/server";
import pool from "@/lib/mysql";
import { subirDocumentoAOneDrive } from "@/lib/onedrive";


export async function GET() {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        v.*,
        p.nombre AS proyecto_nombre,
        p.tipo AS proyecto_tipo,
        (
  SELECT COUNT(*)
  FROM valorizacion_documentos vd
  WHERE vd.valorizacion_id = v.id
) AS documentos_adjuntos,
        (
  SELECT vo.observacion
  FROM valorizacion_observaciones vo
  WHERE
    vo.valorizacion_id = v.id
    AND vo.tipo = 'SISTEMA'
  ORDER BY vo.id DESC
  LIMIT 1
) AS observacion_sistema,

(
  SELECT vo.estado
  FROM valorizacion_observaciones vo
  WHERE
    vo.valorizacion_id = v.id
    AND vo.tipo = 'SISTEMA'
  ORDER BY vo.id DESC
  LIMIT 1
) AS estado_observacion
      FROM valorizaciones v
      LEFT JOIN proyectos p
        ON p.id = v.negocio_operacion
      ORDER BY v.id DESC
      ` 
    )

    return NextResponse.json(rows)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Error al obtener valorizaciones",
      },
      { status: 500 }
    )
  }
}


export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    const documentos =
      formData.getAll("documentos") as File[]

    const proveedor =
      String(formData.get("proveedor") || "")

    const negocio_operacion =
      String(formData.get("negocio_operacion") || "")

    const numero_orden_servicio =
      String(formData.get("numero_orden_servicio") || "")

    const descripcion =
      String(formData.get("descripcion") || "")

    const monto =
      Number(formData.get("monto") || 0)

    const moneda =
      String(formData.get("moneda") || "PEN")

    const periodo =
      String(formData.get("periodo") || "")

    const fecha_ejecucion =
      String(formData.get("fecha_ejecucion") || "")

    const encargado =
      String(formData.get("encargado") || "")

    const [result]: any =
  await pool.query(
      `
      INSERT INTO valorizaciones (
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
        estado,
        archivo_nombre,
        respaldo_nombre
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        proveedor,
        null,
        negocio_operacion,
        numero_orden_servicio,
        descripcion,
        monto,
        moneda,
        periodo || null,
        fecha_ejecucion || null,
        encargado,
        "BORRADOR",
        documentos.map((doc) => doc.name).join(", "),
        documentos.map((doc) => doc.name).join(", "),
      ]
    )

    const valorizacionId =
  result.insertId

for (const documento of documentos) {
  try {
    const bytes =
      await documento.arrayBuffer()

    const buffer =
      Buffer.from(bytes)

    const archivoSubido =
      await subirDocumentoAOneDrive(
        `${valorizacionId}-${documento.name}`,
        buffer
      )

    await pool.query(
      `
      INSERT INTO valorizacion_documentos (
        valorizacion_id,
        nombre,
        onedrive_id,
        url
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        valorizacionId,
        archivoSubido.nombre,
        archivoSubido.itemId,
        archivoSubido.webUrl,
      ]
    )
  } catch (error) {
    console.error(
      "No se pudo subir a OneDrive:",
      error
    )

    await pool.query(
      `
      INSERT INTO valorizacion_documentos (
        valorizacion_id,
        nombre,
        onedrive_id,
        url
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        valorizacionId,
        documento.name,
        null,
        null,
      ]
    )
  }
}

    return NextResponse.json({
      success: true,
      documentos: documentos.length,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message: "Error al registrar valorización",
      },
      { status: 500 }
    )
  }
}