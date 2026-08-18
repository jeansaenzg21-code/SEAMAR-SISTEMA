import { NextRequest, NextResponse } from "next/server";
import { requerirSesionOscar } from "@/lib/oscar/auth";
import {
  insertarFactura,
  listarFacturasAgrupadas,
  verificarDuplicado,
} from "@/lib/oscar/facturas-db";
import type { GuardarFacturaInput } from "@/lib/oscar/facturas-db";
import { registrarActividad } from "@/lib/actividad";
import type { OrigenFactura } from "@/lib/oscar/types";

function textoSeguro(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const t = String(valor).trim();
  if (!t || t === "-" || t === "—") return null;
  return t;
}

function numeroSeguro(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(String(valor).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return null;
  if (n < -999999999 || n > 999999999) return null;
  return n;
}

function normalizarOrigen(valor: unknown): OrigenFactura | null {
  const v = String(valor || "").trim();
  if (v === "PDF_TEXTO" || v === "PDF_ESCANEADO" || v === "IMAGEN") return v;
  return null;
}

function validarCabecera(cab: any): string | null {
  if (!cab || typeof cab !== "object") return "La cabecera es obligatoria.";
  if (cab.rucEmisor && String(cab.rucEmisor).length !== 11) {
    return "El RUC del emisor debe tener 11 dígitos.";
  }
  if (cab.rucCliente && String(cab.rucCliente).length !== 11) {
    return "El RUC del cliente debe tener 11 dígitos.";
  }
  if (cab.fechaEmision && !/^\d{4}-\d{2}-\d{2}$/.test(String(cab.fechaEmision))) {
    return "La fecha de emisión debe tener formato YYYY-MM-DD.";
  }
  if (cab.fechaVencimiento && !/^\d{4}-\d{2}-\d{2}$/.test(String(cab.fechaVencimiento))) {
    return "La fecha de vencimiento debe tener formato YYYY-MM-DD.";
  }
  return null;
}

export async function GET() {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const facturas = await listarFacturasAgrupadas(auth.sesion.id);
    return NextResponse.json({ facturas });
  } catch (error) {
    console.error("[OSCAR] Error listando facturas:", error);
    return NextResponse.json(
      { error: "Error al listar las facturas." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Datos inválidos." },
      { status: 400 }
    );
  }

  const cabecera = body.cabecera || {};
  const lineasRaw = Array.isArray(body.lineas) ? body.lineas : [];
  const estadoOcr = body.estadoOcr === "PENDIENTE" ? "PENDIENTE" : "REVISADO";
  const forzar = body.forzar === true;

  const errorCabecera = validarCabecera(cabecera);
  if (errorCabecera) {
    return NextResponse.json({ error: errorCabecera }, { status: 400 });
  }

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
    console.log("[OSCAR-INSERT] Verificando duplicado...");
    const duplicado = await verificarDuplicado(
      auth.sesion.id,
      cabecera.rucEmisor || null,
      cabecera.numeroDocumento || null
    );

    if (duplicado.existe && !forzar) {
      console.log(`[OSCAR-INSERT] Duplicado detectado: ruc=${cabecera.rucEmisor} doc=${cabecera.numeroDocumento}`);
      return NextResponse.json(
        {
          error:
            "Ya existe una factura registrada con ese RUC de emisor y número de documento.",
          duplicado: true,
        },
        { status: 409 }
      );
    }

    console.log("[OSCAR-INSERT] Iniciando insertarFactura...");
    console.log("[OSCAR-INSERT] cabecera:", JSON.stringify(input.cabecera));
    console.log("[OSCAR-INSERT] lineas count:", input.lineas.length);
    console.log("[OSCAR-INSERT] origen:", input.origen, "| estadoOcr:", input.estadoOcr);

    const primerId = await insertarFactura(auth.sesion.id, input);

    console.log(`[OSCAR-INSERT] INSERT exitoso, id=${primerId}`);

    registrarActividad({
      tipo: "cxp",
      accion: "crear",
      titulo: `Factura ${cabecera.numeroDocumento || ""} registrada`,
      subtitulo: cabecera.razonSocialEmisor || cabecera.rucEmisor || "",
      usuarioNombre: auth.sesion.nombre,
      referenciaId: primerId,
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: primerId });
  } catch (error: any) {
    console.error("[OSCAR-INSERT] ERROR:", error?.message || error);
    console.error("[OSCAR-INSERT] STACK:", error?.stack);
    if (error?.code) console.error("[OSCAR-INSERT] MYSQL CODE:", error.code);
    if (error?.errno) console.error("[OSCAR-INSERT] MYSQL ERRNO:", error.errno);
    return NextResponse.json(
      { error: "Error al guardar la factura." },
      { status: 500 }
    );
  }
}
