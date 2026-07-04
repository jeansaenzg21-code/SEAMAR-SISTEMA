import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [resultado]: any = await pool.query(
      `
      DELETE FROM valorizacion_documentos
      WHERE id = ?
      `,
      [id]
    );

    if (resultado.affectedRows === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Documento no encontrado",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Documento eliminado correctamente",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al eliminar documento",
      },
      {
        status: 500,
      }
    );
  }
}