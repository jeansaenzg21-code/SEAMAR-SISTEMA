import { NextResponse } from "next/server";
import pool from "@/lib/mysql";
import { subirDocumentoRespaldoAOneDrive } from "@/lib/onedrive";
import { getAccessToken } from "@/lib/msal";
import { obtenerSesion } from "@/lib/session";
import { monedaO } from "@/lib/moneda";
import { verificarPeriodoRegistrable } from "@/lib/backups";
import { existeDocumentoValorizacion } from "@/lib/valorizacion-documentos";




export async function GET() {
  console.log("API VALORIZACIONES FUNCIONANDO");
  try {
    const [rows] = await pool.query<any>(
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
        (
          SELECT COUNT(*)
          FROM valorizacion_documentos vd
          WHERE vd.valorizacion_id = v.id
        ) AS documentos_adjuntos,
  (
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', vd.id,
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

    console.log("VALORIZACIONES API - enviado_revision_por del primer registro:", rows[0]?.enviado_revision_por);

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


/** Máximo correlativo (número final del código) para una empresa y año. */
async function maxCorrelativo(proveedor: string, anio: number): Promise<number> {
  const [rows]: any = await pool.query(
    `SELECT codigo FROM valorizaciones WHERE proveedor = ? AND codigo LIKE ?`,
    [proveedor, `VAL-${anio}-%`]
  )

  let max = 0

  for (const fila of rows) {
    const partes = String(fila.codigo).split("-")
    const numero = Number(partes[partes.length - 1])
    if (!isNaN(numero)) max = Math.max(max, numero)
  }

  return max
}

export async function POST(request: Request) {
  try {

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
      monedaO(formData.get("moneda"), "SOLES")

    const periodo =
      String(formData.get("periodo") || "")

    const fecha_ejecucion =
      String(formData.get("fecha_ejecucion") || "")

    const encargado =
      String(formData.get("encargado") || "")

    const periodoAbierto = await verificarPeriodoRegistrable(fecha_ejecucion || null)
    if (!periodoAbierto.permitido) {
      return NextResponse.json({ success: false, message: periodoAbierto.motivo }, { status: 409 })
    }

    const anio =
  (() => {
    const d = fecha_ejecucion ? new Date(fecha_ejecucion) : new Date()
    return !isNaN(d.getTime()) ? d.getFullYear() : new Date().getFullYear()
  })()

  let correlativo =
  (await maxCorrelativo(proveedor, anio)) + 1

  let codigo =
  `VAL-${anio}-${String(correlativo).padStart(3, "0")}`

  let result: any

  for (let intento = 0; intento < 100; intento++) {

    try {
      ;[result] = await pool.query(
        `
        INSERT INTO valorizaciones (
          codigo,
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          codigo,
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
      break
    } catch (error: any) {
      if (error?.errno === 1062) {
        correlativo += 1
        codigo = `VAL-${anio}-${String(correlativo).padStart(3, "0")}`
        continue
      }
      throw error
    }
  }

  const valorizacionId =
  result.insertId


  if (documentos.length > 0) {

  let token: string | null = null

  try {
    token = await getAccessToken()
  } catch (error) {
    console.error("No se pudo obtener token de OneDrive:", error)
    token = null
  }

  const subidos: Array<{ nombre: string; onedrive_id: string; url: string }> = []
  const fallidos: Array<{ nombre: string }> = []

  if (token) {
    const resultados = await Promise.all(
      documentos.map(async (documento) => {
        try {
          const bytes = await documento.arrayBuffer()

          const buffer = Buffer.from(bytes)

          const archivoSubido =
        await subirDocumentoRespaldoAOneDrive(
          documento.name,
          buffer,
          token
        )

          return {
            ok: true as const,
            nombre: archivoSubido.nombre,
            onedrive_id: archivoSubido.itemId,
            url: archivoSubido.webUrl,
          }
        } catch (error) {
          console.error(
            `No se pudo subir "${documento.name}" a OneDrive:`,
            error
          )
          return { ok: false as const, nombre: documento.name }
        }
      })
    )

    for (const resultado of resultados) {
      if (resultado.ok) {
        subidos.push(resultado)
      } else {
        fallidos.push(resultado)
      }
    }
  } else {
    for (const documento of documentos) {
      fallidos.push({ nombre: documento.name })
    }
  }

  for (const documento of subidos) {
    const yaExiste = await existeDocumentoValorizacion(
      valorizacionId,
      documento.nombre,
      documento.onedrive_id
    );
    if (yaExiste) continue;

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
  documento.nombre,
  documento.onedrive_id,
  documento.url,
]
    )
  }

    return NextResponse.json({
      success: true,
      documentos: subidos.length,
      documentosFallidos: fallidos.map((f) => f.nombre),
      mensaje:
        fallidos.length > 0
          ? `Valorización registrada, pero no se pudieron subir los documentos a OneDrive: ${fallidos
              .map((f) => f.nombre)
              .join(", ")}`
          : undefined,
    })
  }

    return NextResponse.json({
      success: true,
      documentos: 0,
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