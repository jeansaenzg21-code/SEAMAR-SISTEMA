import { NextRequest, NextResponse } from "next/server";
import { requerirSesionOscar } from "@/lib/oscar/auth";
import {
  actualizarGuiaRemision,
  eliminarGuiaRemision,
  normalizarSerieNumero,
  obtenerGuiaRemision,
  verificarGuiaDuplicada,
} from "@/lib/oscar/guias-remision-db";
import type {
  BienGuiaRemision,
  EstadoGuiaRemision,
  GuardarGuiaRemisionInput,
} from "@/lib/oscar/guias-remision-types";
import { registrarActividad } from "@/lib/actividad";

// =============================================================================
// Helpers de validación
// =============================================================================

function textoSeguro(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const t = String(valor).trim();
  if (!t || t === "-" || t === "\u2014") return null;
  return t;
}

function numeroSeguro(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(String(valor).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return null;
  if (n < -999999999 || n > 999999999) return null;
  return n;
}

function fechaSegura(valor: unknown): string | null {
  const t = textoSeguro(valor);
  if (!t) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

function validarGuia(guia: any): string | null {
  if (!guia || typeof guia !== "object") return "Los datos de la guía son obligatorios.";

  if (guia.serie && !/^[A-Za-z0-9]+$/.test(String(guia.serie))) {
    return "La serie de la guía solo puede contener letras y números.";
  }

  if (guia.numero && !/^\d+$/.test(String(guia.numero))) {
    return "El número de la guía debe contener solo dígitos.";
  }

  if (guia.rucCliente && String(guia.rucCliente).length !== 11) {
    return "El RUC del cliente debe tener 11 dígitos.";
  }

  if (
    guia.fechaInicioTraslado &&
    !/^\d{4}-\d{2}-\d{2}$/.test(String(guia.fechaInicioTraslado))
  ) {
    return "La fecha de inicio de traslado debe tener formato YYYY-MM-DD.";
  }

  return null;
}

function mapearBien(bien: any): BienGuiaRemision {
  return {
    codigoBien: textoSeguro(bien?.codigoBien ?? bien?.codigo_bien),
    descripcion: textoSeguro(bien?.descripcion),
    marca: textoSeguro(bien?.marca),
    modelo: textoSeguro(bien?.modelo),
    serie: textoSeguro(bien?.serie),
    ref: textoSeguro(bien?.ref),
    unidadMedida: textoSeguro(bien?.unidadMedida ?? bien?.unidad_medida),
    cantidad: numeroSeguro(bien?.cantidad),
    accesorios: textoSeguro(bien?.accesorios),
    nroParte: textoSeguro(bien?.nroParte ?? bien?.nro_parte),
    lote: textoSeguro(bien?.lote),
    expira: normalizarFechaExpira(bien?.expira),
  };
}

function normalizarFechaExpira(fecha: unknown): string | null {
  const t = textoSeguro(fecha);
  if (!t) return null;
  const m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  return null;
}

function construirInput(body: any): {
  input: Omit<GuardarGuiaRemisionInput, "estado">;
  estado: EstadoGuiaRemision;
  forzar: boolean;
  serie: string | null;
  numero: string | null;
} | {
  error: string;
} {
  const guiaRaw = body.guia || {};
  const bienesRaw = Array.isArray(body.bienes) ? body.bienes : [];

  const errorGuia = validarGuia(guiaRaw);
  if (errorGuia) return { error: errorGuia };

  const { serie, numero } = normalizarSerieNumero({
    serie: textoSeguro(guiaRaw.serie),
    numero: textoSeguro(guiaRaw.numero),
    fechaInicioTraslado: null,
    motivoTraslado: null,
    destinatario: null,
    rucCliente: null,
    direccion: null,
  });

  const guia = {
    serie,
    numero,
    fechaInicioTraslado: fechaSegura(guiaRaw.fechaInicioTraslado),
    motivoTraslado: textoSeguro(guiaRaw.motivoTraslado),
    destinatario: textoSeguro(guiaRaw.destinatario),
    rucCliente: textoSeguro(guiaRaw.rucCliente),
    direccion: textoSeguro(guiaRaw.direccion),
  };

  const bienes = bienesRaw
    .filter((b: any) => b && typeof b === "object")
    .map(mapearBien)
    .filter(
      (b: any) => b.descripcion || b.codigoBien || b.cantidad !== null
    );

  const estado: EstadoGuiaRemision =
    body.estado === "REVISADO" ? "REVISADO" : "PENDIENTE";
  const forzar = body.forzar === true;

  return {
    input: {
      guia,
      bienes,
      carpetaId:
        body.carpetaId === null ||
        body.carpetaId === undefined ||
        body.carpetaId === "" ||
        !Number.isFinite(Number(body.carpetaId))
          ? null
          : Number(body.carpetaId),
      nombreArchivo: textoSeguro(body.nombreArchivo),
      onedriveItemId: textoSeguro(body.onedriveItemId),
      onedriveWebUrl: textoSeguro(body.onedriveWebUrl),
      hashArchivo: textoSeguro(body.hashArchivo),
    },
    estado,
    forzar,
    serie,
    numero,
  };
}

// =============================================================================
// GET — detalle de una guía
// =============================================================================

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const guiaId = Number(id);
  if (!Number.isInteger(guiaId) || guiaId <= 0) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const guia = await obtenerGuiaRemision(auth.sesion.id, guiaId);
    if (!guia) {
      return NextResponse.json(
        { error: "Guía de Remisión no encontrada." },
        { status: 404 }
      );
    }
    return NextResponse.json({ guia });
  } catch (error) {
    console.error("[OSCAR] Error obteniendo guía de remisión:", error);
    return NextResponse.json(
      { error: "Error al obtener la guía de remisión." },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH — actualizar una guía
// =============================================================================

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const guiaId = Number(id);
  if (!Number.isInteger(guiaId) || guiaId <= 0) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const construido = construirInput(body);
  if ("error" in construido) {
    return NextResponse.json({ error: construido.error }, { status: 400 });
  }

  const { input, estado, forzar, serie, numero } = construido;

  try {
    const existente = await obtenerGuiaRemision(auth.sesion.id, guiaId);
    if (!existente) {
      return NextResponse.json(
        { error: "Guía de Remisión no encontrada." },
        { status: 404 }
      );
    }

    const duplicado = await verificarGuiaDuplicada(
      auth.sesion.id,
      serie,
      numero,
      guiaId
    );

    if (duplicado.existe && !forzar) {
      return NextResponse.json(
        {
          error: "Esta Guía de Remisión ya está registrada.",
          duplicado: true,
        },
        { status: 409 }
      );
    }

    await actualizarGuiaRemision(auth.sesion.id, guiaId, {
      ...input,
      estado,
    });

    registrarActividad({
      tipo: "cxp",
      accion: "actualizar",
      titulo: `Guía de Remisión ${serie ? `${serie}-` : ""}${numero || ""} actualizada`,
      subtitulo: input.guia.destinatario || input.guia.rucCliente || "",
      usuarioNombre: auth.sesion.nombre,
      referenciaId: guiaId,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[OSCAR] Error actualizando guía de remisión:", error);
    const mensaje =
      error?.message === "Guía de Remisión no encontrada"
        ? error.message
        : "Error al actualizar la guía de remisión.";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}

// =============================================================================
// DELETE — eliminar una guía
// =============================================================================

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const guiaId = Number(id);
  if (!Number.isInteger(guiaId) || guiaId <= 0) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const existente = await obtenerGuiaRemision(auth.sesion.id, guiaId);
    if (!existente) {
      return NextResponse.json(
        { error: "Guía de Remisión no encontrada." },
        { status: 404 }
      );
    }

    await eliminarGuiaRemision(auth.sesion.id, guiaId);

    registrarActividad({
      tipo: "cxp",
      accion: "eliminar",
      titulo: `Guía de Remisión ${existente.guia.serie ? `${existente.guia.serie}-` : ""}${existente.guia.numero || ""} eliminada`,
      subtitulo: existente.guia.destinatario || existente.guia.rucCliente || "",
      usuarioNombre: auth.sesion.nombre,
      referenciaId: guiaId,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[OSCAR] Error eliminando guía de remisión:", error);
    return NextResponse.json(
      { error: "Error al eliminar la guía de remisión." },
      { status: 500 }
    );
  }
}