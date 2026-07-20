import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/mysql";
import { generarEnlacePreview } from "@/lib/onedrive";

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { success: false, message: "documentId es requerido" },
        { status: 400 }
      );
    }

    const [rows]: any = await pool.query(
      `SELECT onedrive_id FROM valorizacion_documentos WHERE id = ?`,
      [documentId]
    );

    if (!rows.length) {
      return NextResponse.json(
        { success: false, message: "Documento no encontrado" },
        { status: 404 }
      );
    }

    const { onedrive_id } = rows[0];

    if (!onedrive_id) {
      return NextResponse.json(
        { success: false, message: "El documento no tiene un ID de OneDrive" },
        { status: 400 }
      );
    }

    const previewUrl = await generarEnlacePreview(onedrive_id);

    return NextResponse.json({ success: true, previewUrl });
  } catch (error) {
    console.error("Error al generar vista previa:", error);
    return NextResponse.json(
      { success: false, message: "Error al generar vista previa del documento" },
      { status: 500 }
    );
  }
}
