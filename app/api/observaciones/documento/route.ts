import { NextResponse } from "next/server"
import { subirDocumentoRespaldoAOneDrive } from "@/lib/onedrive"
import { getAccessToken } from "@/lib/msal"
import pool from "@/lib/mysql"

export async function POST(req: Request) {
  const debugId = `OBS_UPLOAD_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const valorizacionId = formData.get("valorizacionId")

    console.log(`[${debugId}] INICIO POST /api/observaciones/documento`);
    console.log(`[${debugId}] file.name:`, file?.name);
    console.log(`[${debugId}] file.size:`, file?.size);
    console.log(`[${debugId}] valorizacionId:`, valorizacionId);

    if (!file) {
      return NextResponse.json({ error: "No existe archivo" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    console.log(`[${debugId}] buffer.length:`, buffer.length);

    const token = await getAccessToken()
    console.log(`[${debugId}] token (primeros 20):`, token?.slice(0, 20) + "...");

    const nombreArchivo = `Observacion-${valorizacionId}-${file.name}`;
    console.log(`[${debugId}] nombreArchivo a subir:`, nombreArchivo);

    const resultado = await subirDocumentoRespaldoAOneDrive(
      nombreArchivo,
      buffer,
      token
    )
    console.log(`[${debugId}] subida exitosa:`, JSON.stringify(resultado, null, 2));

    const [insertResult]: any = await pool.query(
      `INSERT INTO valorizacion_documentos (valorizacion_id, nombre, onedrive_id, url) VALUES (?, ?, ?, ?)`,
      [valorizacionId, resultado.nombre, resultado.itemId, resultado.webUrl]
    )

    const [valInfo]: any = await pool.query(
      `SELECT proveedor, (SELECT COUNT(*) FROM valorizacion_documentos WHERE valorizacion_id = ?) AS total_docs FROM valorizaciones WHERE id = ? LIMIT 1`,
      [valorizacionId, valorizacionId]
    )

    if (valInfo.length > 0) {
      const proveedor = String(valInfo[0].proveedor || '').toUpperCase()
      const esRepsol = proveedor.includes('REPSOL')
      const documentosRequeridos = esRepsol ? 4 : 3
      if (Number(valInfo[0].total_docs) >= documentosRequeridos) {
        await pool.query(
          `UPDATE valorizacion_observaciones SET estado = 'RESUELTA', fecha_resolucion = NOW() WHERE valorizacion_id = ? AND tipo = 'SISTEMA' AND estado = 'PENDIENTE' AND observacion LIKE ?`,
          [valorizacionId, 'Documentos incompletos%']
        )
      }
    }

    return NextResponse.json({
      ok: true,
      id: insertResult.insertId,
      nombre: resultado.nombre,
      url: resultado.webUrl,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Error subiendo archivo" }, { status: 500 })
  }
}
