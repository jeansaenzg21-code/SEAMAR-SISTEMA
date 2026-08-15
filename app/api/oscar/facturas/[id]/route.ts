import { NextRequest, NextResponse } from "next/server";
import { requerirSesionOscar } from "@/lib/oscar/auth";
import {
  actualizarFactura,
  eliminarFactura,
  obtenerGrupoPorLinea,
  verificarDuplicado,
} from "@/lib/oscar/facturas-db";
import type { GuardarFacturaInput } from "@/lib/oscar/facturas-db";
import { registrarActividad } from "@/lib/actividad";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const lineaId = Number(id);
  if (!Number.isInteger(lineaId) || lineaId <= 0) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const factura = await obtenerGrupoPorLinea(auth.sesion.id, lineaId);
    if (!factura) {
      return NextResponse.json(
        { error: "Factura no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ factura });
  } catch (error) {
    console.error("[OSCAR] Error obteniendo factura:", error);
    return NextResponse.json(
      { error: "Error al obtener la factura." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const lineaId = Number(id);
  if (!Number.isInteger(lineaId) || lineaId <= 0) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const cabecera = body.cabecera || {};
  const lineas = Array.isArray(body.lineas) ? body.lineas : [];
  const estadoOcr = body.estadoOcr === "PENDIENTE" ? "PENDIENTE" : "REVISADO";
  const forzar = body.forzar === true;

  const input: GuardarFacturaInput = {
    cabecera,
    lineas,
    origen: body.origen || null,
    estadoOcr,
    nombreArchivo: body.nombreArchivo || null,
    onedriveItemId: body.onedriveItemId || null,
    onedriveWebUrl: body.onedriveWebUrl || null,
  };

  try {
    const duplicado = await verificarDuplicado(
      auth.sesion.id,
      cabecera.rucEmisor || null,
      cabecera.numeroDocumento || null,
      lineaId
    );

    if (duplicado.existe && !forzar) {
      return NextResponse.json(
        {
          error:
            "Ya existe otra factura registrada con ese RUC de emisor y número de documento.",
          duplicado: true,
        },
        { status: 409 }
      );
    }

    await actualizarFactura(auth.sesion.id, lineaId, input);

    registrarActividad({
      tipo: "cxp",
      accion: "actualizar",
      titulo: `Factura ${cabecera.numeroDocumento || ""} actualizada`,
      subtitulo: cabecera.razonSocialEmisor || cabecera.rucEmisor || "",
      usuarioNombre: auth.sesion.nombre,
      referenciaId: lineaId,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[OSCAR] Error actualizando factura:", error);
    const mensaje =
      error?.message === "Factura no encontrada"
        ? error.message
        : "Error al actualizar la factura.";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const lineaId = Number(id);
  if (!Number.isInteger(lineaId) || lineaId <= 0) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const factura = await obtenerGrupoPorLinea(auth.sesion.id, lineaId);
    if (!factura) {
      return NextResponse.json(
        { error: "Factura no encontrada." },
        { status: 404 }
      );
    }

    await eliminarFactura(auth.sesion.id, lineaId);

    registrarActividad({
      tipo: "cxp",
      accion: "eliminar",
      titulo: `Factura ${factura.cabecera.numeroDocumento || ""} eliminada`,
      subtitulo: factura.cabecera.razonSocialEmisor || factura.cabecera.rucEmisor || "",
      usuarioNombre: auth.sesion.nombre,
      referenciaId: lineaId,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[OSCAR] Error eliminando factura:", error);
    return NextResponse.json(
      { error: "Error al eliminar la factura." },
      { status: 500 }
    );
  }
}
