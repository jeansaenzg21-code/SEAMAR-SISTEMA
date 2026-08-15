import { NextRequest, NextResponse } from "next/server";
import { requerirSesionOscar } from "@/lib/oscar/auth";
import {
  listarFacturasAgrupadas,
  obtenerGrupoPorLinea,
} from "@/lib/oscar/facturas-db";
import { buildFacturasOscarExcel } from "@/lib/oscar/facturas-excel";
import { excelResponse } from "@/lib/excel-export";

const MONEDAS_VALIDAS = ["SOLES", "DOLARES"];

function fechaHoy(): string {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, "0");
  const d = String(hoy.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(request: NextRequest) {
  const auth = await requerirSesionOscar();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const moneda = searchParams.get("moneda");
    const grupoId = searchParams.get("grupoId");

    const monedaFiltro =
      moneda && MONEDAS_VALIDAS.includes(moneda.toUpperCase())
        ? moneda.toUpperCase()
        : null;

    let facturas;
    let filename: string;

    if (grupoId) {
      const grupo = await obtenerGrupoPorLinea(auth.sesion.id, Number(grupoId));
      if (!grupo) {
        return NextResponse.json(
          { error: "Factura no encontrada." },
          { status: 404 }
        );
      }
      facturas = [grupo];
      const num = grupo.cabecera.numeroDocumento?.replace(/[\\/:*?"<>|]/g, "-");
      filename = `Factura ${num || grupoId} - ${fechaHoy()}.xlsx`;
    } else {
      facturas = await listarFacturasAgrupadas(auth.sesion.id, monedaFiltro);

      if (monedaFiltro && facturas.length === 0) {
        const label = monedaFiltro === "DOLARES" ? "dólares" : "soles";
        return NextResponse.json(
          { error: `No hay facturas registradas en ${label}.` },
          { status: 404 }
        );
      }

      const sufijo =
        monedaFiltro === "DOLARES"
          ? " - DOLARES"
          : monedaFiltro === "SOLES"
          ? " - SOLES"
          : "";
      filename = `Registro de facturas${sufijo} - ${fechaHoy()}.xlsx`;
    }

    const buffer = await buildFacturasOscarExcel(facturas);
    return excelResponse(buffer, filename);
  } catch (error) {
    console.error("[OSCAR] Error exportando facturas:", error);
    return NextResponse.json(
      { error: "Error al exportar las facturas." },
      { status: 500 }
    );
  }
}
