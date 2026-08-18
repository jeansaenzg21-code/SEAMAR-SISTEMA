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
import type { OrigenFactura } from "@/lib/oscar/types";

function textoSeguro(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  if (!t || t === "-" || t === "\u2014") return null;
  return t;
}

function numeroSeguro(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return null;
  if (n < -999999999 || n > 999999999) return null;
  return n;
}

function normalizarOrigen(v: unknown): OrigenFactura | null {
  const val = String(v || "").trim();
  if (val === "PDF_TEXTO" || val === "PDF_ESCANEADO" || val === "IMAGEN") return val;
  return null;
}

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
  const lineasRaw = Array.isArray(body.lineas) ? body.lineas : [];
  const estadoOcr = body.estadoOcr === "PENDIENTE" ? "PENDIENTE" : "REVISADO";
  const forzar = body.forzar === true;

  const lineas = lineasRaw.map((l: any) => ({
    codigo: textoSeguro(l?.codigo),
    cantidad: numeroSeguro(l?.cantidad),
    unidad: textoSeguro(l?.unidad),
    descripcion: textoSeguro(l?.descripcion),
    valorUnitario: numeroSeguro(l?.valorUnitario ?? l?.valor_unitario),
    descuento: numeroSeguro(l?.descuento),
    valorVenta: numeroSeguro(l?.valorVenta ?? l?.valor_venta),
  }));

  const input: GuardarFacturaInput = {
    cabecera: {
      rucEmisor: textoSeguro(cabecera.rucEmisor),
      razonSocialEmisor: textoSeguro(cabecera.razonSocialEmisor),
      rucCliente: textoSeguro(cabecera.rucCliente),
      razonSocialCliente: textoSeguro(cabecera.razonSocialCliente),
      numeroDocumento: textoSeguro(cabecera.numeroDocumento),
      fechaEmision: textoSeguro(cabecera.fechaEmision),
      fechaVencimiento: textoSeguro(cabecera.fechaVencimiento),
      moneda: textoSeguro(cabecera.moneda),
      condicionPago: textoSeguro(cabecera.condicionPago),
      ordenCompra: textoSeguro(cabecera.ordenCompra),
      guiaRemision: textoSeguro(cabecera.guiaRemision),
      subtotal: numeroSeguro(cabecera.subtotal),
      igv: numeroSeguro(cabecera.igv),
      total: numeroSeguro(cabecera.total),
    },
    lineas,
    origen: normalizarOrigen(body.origen),
    estadoOcr,
    nombreArchivo: textoSeguro(body.nombreArchivo),
    onedriveItemId: textoSeguro(body.onedriveItemId),
    onedriveWebUrl: textoSeguro(body.onedriveWebUrl),
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
