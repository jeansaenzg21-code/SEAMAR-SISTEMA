import { NextResponse } from "next/server";
import pool from "@/lib/mysql";
import { listarDocumentos } from "@/lib/onedrive";

export async function POST() {

  const data =
    await listarDocumentos();

  const archivos =
    data.value || [];

  const archivosNuevos = [];

  for (const archivo of archivos) {

    const [cxc]: any =
      await pool.query(
        `
        SELECT id
        FROM cuentas_por_cobrar
        WHERE archivo_onedrive_id = ?
        `,
        [archivo.id]
      );

    const [cxp]: any =
      await pool.query(
        `
        SELECT id
        FROM cuentas_por_pagar
        WHERE archivo_url = ?
        `,
        [archivo.webUrl]
      );

    if (
      cxc.length === 0 &&
      cxp.length === 0
    ) {
      archivosNuevos.push(archivo);
    }

  }

  const [sync]: any =
    await pool.query(
      `
      INSERT INTO sincronizaciones (
        estado,
        mensaje,
        total_documentos
      )
      VALUES (
        'PROCESANDO',
        'Iniciando sincronización',
        ?
      )
      `,
      [
        archivosNuevos.length
      ]
    );

  return NextResponse.json({
    success: true,
    sincronizacionId:
      sync.insertId,
    totalDocumentos:
      archivosNuevos.length
  });

}