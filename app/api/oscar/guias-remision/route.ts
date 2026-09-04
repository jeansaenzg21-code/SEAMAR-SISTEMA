import { NextRequest, NextResponse } from "next/server";
import { requerirSesionOscar } from "@/lib/oscar/auth";
import {
  insertarGuiaRemision,
  listarGuiasRemision,
  normalizarSerieNumero,
  verificarGuiaDuplicada,
} from "@/lib/oscar/guias-remision-db";
import type {
  BienGuiaRemision,
  EstadoGuiaRemision,
  FiltroCarpetaGuia,
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
  };
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
// GET — listar guías de remisión
// =============================================================================

export async function GET(request: NextRequest) {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const pagina = Number(searchParams.get("pagina") ?? "1");
    const porPaginaRaw = searchParams.get("porPagina");
    const porPagina = porPaginaRaw ? Number(porPaginaRaw) : 0;
    const estadoRaw = searchParams.get("estado");
    const busqueda = searchParams.get("busqueda") || undefined;
    const carpetaRaw = searchParams.get("carpeta");

    let carpeta: FiltroCarpetaGuia | undefined;
    if (carpetaRaw === "SIN_CARPETA") carpeta = "SIN_CARPETA";
    else if (carpetaRaw && /^\d+$/.test(carpetaRaw)) carpeta = Number(carpetaRaw);

    const resultado = await listarGuiasRemision(auth.sesion.id, {
      pagina: Number.isFinite(pagina) ? pagina : 1,
      porPagina: Number.isFinite(porPagina) ? porPagina : 0,
      estado:
        estadoRaw === "PENDIENTE" || estadoRaw === "REVISADO"
          ? estadoRaw
          : null,
      busqueda,
      carpeta,
    });
    return NextResponse.json(resultado);
  } catch (error) {
    console.error("[OSCAR] Error listando guías de remisión:", error);
    return NextResponse.json(
      { error: "Error al listar las guías de remisión." },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST — registrar una guía de remisión
// =============================================================================

export async function POST(request: NextRequest) {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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
    const duplicado = await verificarGuiaDuplicada(
      auth.sesion.id,
      serie,
      numero
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

    const guiaId = await insertarGuiaRemision(auth.sesion.id, {
      ...input,
      estado,
    });

    registrarActividad({
      tipo: "cxp",
      accion: "crear",
      titulo: `Guía de Remisión ${serie ? `${serie}-` : ""}${numero || ""} registrada`,
      subtitulo: input.guia.destinatario || input.guia.rucCliente || "",
      usuarioNombre: auth.sesion.nombre,
      referenciaId: guiaId,
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: guiaId });
  } catch (error: any) {
    console.error("[OSCAR] Error guardando guía de remisión:", error);
    return NextResponse.json(
      { error: "Error al guardar la guía de remisión." },
      { status: 500 }
    );
  }
}