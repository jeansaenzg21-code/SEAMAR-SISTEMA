import { NextRequest, NextResponse } from "next/server";
import { eliminarArchivo } from "@/lib/onedrive";
import { registrarEventoSincronizacion, resolverEventoPendiente } from "@/lib/sync-events";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sincronizacionId = Number(id);

    const body = await request.json();

    const archivoId = String(body?.archivoId || "");
    const decision = String(body?.decision || "");
    const numeroDocumento = String(body?.numeroDocumento || archivoId);
    const motivo = body?.motivo ? String(body.motivo) : null;

    if (!archivoId || (decision !== "descartar" && decision !== "conservar")) {
      return NextResponse.json(
        { success: false, error: "Solicitud inválida" },
        { status: 400 }
      );
    }

    resolverEventoPendiente(sincronizacionId, archivoId);

    if (decision === "descartar") {
      try {
        await eliminarArchivo(archivoId);

        registrarEventoSincronizacion(sincronizacionId, {
          nivel: "info",
          tipo: "descartado",
          mensaje: `Documento ${numeroDocumento} eliminado de OneDrive.`,
          numeroDocumento,
          motivo: motivo ?? "Documento no soportado.",
          archivoId,
          estado: null,
        });

        return NextResponse.json({ success: true, eliminado: true });
      } catch (error) {
        console.error(
          `[DECIDIR-DESCARTE] Error eliminando "${numeroDocumento}":`,
          error
        );

        registrarEventoSincronizacion(sincronizacionId, {
          nivel: "error",
          tipo: "error",
          mensaje:
            `No se pudo eliminar el documento ${numeroDocumento} de OneDrive.\n` +
            `Se conserva y será revisado en una próxima sincronización.`,
          numeroDocumento,
          motivo,
          archivoId,
          estado: null,
        });

        return NextResponse.json({
          success: false,
          eliminado: false,
          error: "No se pudo eliminar el documento de OneDrive",
        });
      }
    }

    registrarEventoSincronizacion(sincronizacionId, {
      nivel: "info",
      tipo: "conservado",
      mensaje:
        `Documento ${numeroDocumento} conservado.\n` +
        `Será revisado en una próxima sincronización.`,
      numeroDocumento,
      motivo,
      archivoId,
      estado: null,
    });

    return NextResponse.json({ success: true, conservado: true });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
