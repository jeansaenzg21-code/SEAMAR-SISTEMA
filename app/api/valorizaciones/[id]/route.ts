import { NextResponse } from "next/server";
import pool from "@/lib/mysql";
import { subirArchivoAOneDrive } from "@/lib/onedrive";
import { ONEDRIVE_FOLDERS } from "@/lib/onedrive-config";
import { getAccessToken } from "@/lib/msal";
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await req.formData();

const proveedor = String(formData.get("proveedor") || "");
const negocio_operacion = String(formData.get("negocio_operacion") || "");
const numero_orden_servicio = String(formData.get("numero_orden_servicio") || "");
const descripcion = String(formData.get("descripcion") || "");
const monto = Number(formData.get("monto") || 0);
const moneda = String(formData.get("moneda") || "PEN");
const periodo = String(formData.get("periodo") || "");
const fecha_ejecucion = String(formData.get("fecha_ejecucion") || "");
const encargado = String(formData.get("encargado") || "");

const documentos = formData.getAll("documentos") as unknown as File[];

const token = await getAccessToken();

    await pool.query(
      `
      UPDATE valorizaciones
      SET
        proveedor = ?,
        negocio_operacion = ?,
        numero_orden_servicio = ?,
        descripcion = ?,
        monto = ?,
        moneda = ?,
        periodo = ?,
        fecha_ejecucion = ?,
        encargado = ?
      WHERE id = ?
      `,
      [
        proveedor,
negocio_operacion,
numero_orden_servicio,
descripcion,
monto,
moneda,
periodo,
fecha_ejecucion,
encargado,
id,
      ]
    );

for (const documento of documentos as any[]) {
  const bytes = await documento.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const archivoSubido = await subirArchivoAOneDrive(
    documento.name,
    buffer,
    ONEDRIVE_FOLDERS.VALORIZACIONES,
    token
  );

  await pool.query(
    `
    INSERT INTO valorizacion_documentos
    (
      valorizacion_id,
      nombre,
      onedrive_id,
      url
    )
    VALUES (?, ?, ?, ?)
    `,
    [
      id,
      archivoSubido.nombre,
      archivoSubido.itemId,
      archivoSubido.webUrl,
    ]
  );
}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al actualizar valorización",
      },
      {
        status: 500,
      }
    );
  }
}