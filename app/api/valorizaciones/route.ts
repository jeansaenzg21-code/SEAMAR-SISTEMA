import { NextResponse } from "next/server";
import pool from "@/lib/mysql";
import { subirDocumentoRespaldoAOneDrive } from "@/lib/onedrive";
import { Buffer } from "buffer";
import { getAccessToken } from "@/lib/msal";
import { obtenerSesion } from "@/lib/session";




export async function GET() {
  console.log("API VALORIZACIONES FUNCIONANDO");
  try {
    const [rows] = await pool.query(
      `
      SELECT
       CASE
    WHEN v.numero_requerimiento IS NOT NULL
      AND v.numero_requerimiento != ''
    THEN 'TERMINALES DEL PERU'
    ELSE c.razon_social
  END AS client,
        v.*,
        p.nombre AS proyecto_nombre,
        p.tipo AS proyecto_tipo,
        v.creado_por,
v.enviado_revision_por,
v.aprobado_por,
v.observado_por,
        (
          SELECT COUNT(*)
          FROM valorizacion_documentos vd
          WHERE vd.valorizacion_id = v.id
        ) AS documentos_adjuntos,
         (
 SELECT JSON_ARRAYAGG(
   JSON_OBJECT(
     'nombre', vd.nombre,
     'url', vd.url
   )
 )
 FROM valorizacion_documentos vd
 WHERE vd.valorizacion_id = v.id
) AS documentos,
        (
          SELECT vo.observacion
          FROM valorizacion_observaciones vo
          WHERE vo.valorizacion_id = v.id
          ORDER BY vo.id DESC
          LIMIT 1
        ) AS observacion_sistema,
        (
          SELECT vo.estado
          FROM valorizacion_observaciones vo
          WHERE vo.valorizacion_id = v.id
          ORDER BY vo.id DESC
          LIMIT 1
        ) AS estado_observacion
      FROM valorizaciones v
      LEFT JOIN proyectos p
ON p.id = v.proyecto_id

LEFT JOIN clientes c
ON c.id = p.cliente_id
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

    const token = await getAccessToken();
    const sesion = await obtenerSesion();
    const formData = await request.formData()

    const documentos =
      formData.getAll("documentos") as File[]


    const proveedor =
      String(formData.get("proveedor") || "")

    const negocio_operacion =
      String(formData.get("negocio_operacion") || "")

      const proyecto_id =
  formData.get("proyecto_id")
    ? Number(formData.get("proyecto_id"))
    : null

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
        proyecto_id,
        numero_orden_servicio,
        descripcion,
        monto,
        moneda,
        periodo,
        fecha_ejecucion,
        encargado,
        estado,
        creado_por,
        archivo_nombre,
        respaldo_nombre
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        proveedor,
        null,
        negocio_operacion,
        proyecto_id,
        numero_orden_servicio,
        descripcion,
        monto,
        moneda,
        periodo || null,
        fecha_ejecucion || null,
        encargado,
        "BORRADOR",
        sesion?.nombre || sesion?.correo || "Sistema",
        documentos.map((doc) => doc.name).join(", "),
        documentos.map((doc) => doc.name).join(", "),
      ]
    )

    const valorizacionId =
  result.insertId


for (const documento of documentos) {

  try {

    const bytes = await documento.arrayBuffer()

    const buffer = Buffer.from(bytes)

    const archivoSubido =
  await subirDocumentoRespaldoAOneDrive(
    documento.name,
    buffer,
    token
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

console.log(
  "ENTRO AL CATCH"
)

    console.error(
      "No se pudo subir a OneDrive:",
      error
    )

    throw error
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