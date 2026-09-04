import { NextRequest, NextResponse } from "next/server";
import { requerirSesionOscar } from "@/lib/oscar/auth";
import {
  cargarBienes,
  listarGuiasRemision,
} from "@/lib/oscar/guias-remision-db";
import { buildGuiasRemisionExcel } from "@/lib/oscar/guias-remision-excel";
import { excelResponse } from "@/lib/excel-export";
import type { FiltroCarpetaGuia, GuiaRemisionOscar } from "@/lib/oscar/guias-remision-types";

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
    const carpetaRaw = searchParams.get("carpeta");

    let carpeta: FiltroCarpetaGuia = "TODAS";
    if (carpetaRaw === "SIN_CARPETA") carpeta = "SIN_CARPETA";
    else if (carpetaRaw && /^\d+$/.test(carpetaRaw)) carpeta = Number(carpetaRaw);

    const { guias: guiasBase } = await listarGuiasRemision(auth.sesion.id, {
      carpeta,
      porPagina: 0,
    });

    // Cargar bienes de cada guía
    const guias: GuiaRemisionOscar[] = await Promise.all(
      guiasBase.map(async (g) => ({
        ...g,
        bienes: g.bienes.length > 0 ? g.bienes : await cargarBienes(g.id),
      }))
    );

    if (guias.length === 0) {
      return NextResponse.json(
        { error: "No hay guías de remisión para exportar." },
        { status: 404 }
      );
    }

    const sufijo =
      carpeta === "TODAS"
        ? ""
        : carpeta === "SIN_CARPETA"
        ? " - SIN CARPETA"
        : " - CARPETA";
    const filename = `Registro de guías de remisión${sufijo} - ${fechaHoy()}.xlsx`;

    const buffer = await buildGuiasRemisionExcel(guias);
    return excelResponse(buffer, filename);
  } catch (error) {
    console.error("[OSCAR] Error exportando guías:", error);
    return NextResponse.json(
      { error: "Error al exportar las guías." },
      { status: 500 }
    );
  }
}
