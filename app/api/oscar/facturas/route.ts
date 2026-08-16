import { NextRequest, NextResponse } from "next/server";
import { requerirSesionOscar } from "@/lib/oscar/auth";
import {
  insertarFactura,
  listarFacturasAgrupadas,
  verificarDuplicado,
} from "@/lib/oscar/facturas-db";
import type { GuardarFacturaInput } from "@/lib/oscar/facturas-db";
import { registrarActividad } from "@/lib/actividad";

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
      cabecera.numeroDocumento || null
    );

    if (duplicado.existe && !forzar) {
      return NextResponse.json(
        {
          error:
            "Ya existe una factura registrada con ese RUC de emisor y número de documento.",
          duplicado: true,
        },
        { status: 409 }
      );
    }

    console.log("[EXTRACCION] resultado estructurado antes del INSERT:");
    console.log(JSON.stringify(input, null, 2));

    const primerId = await insertarFactura(auth.sesion.id, input);

    registrarActividad({
      tipo: "cxp",
      accion: "crear",
      titulo: `Factura ${cabecera.numeroDocumento || ""} registrada`,
      subtitulo: cabecera.razonSocialEmisor || cabecera.rucEmisor || "",
      usuarioNombre: auth.sesion.nombre,
      referenciaId: primerId,
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: primerId });
  } catch (error) {
    console.error("[OSCAR] Error guardando factura:", error);
    return NextResponse.json(
      { error: "Error al guardar la factura." },
      { status: 500 }
    );
  }
}
