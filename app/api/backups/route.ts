import { NextRequest, NextResponse } from "next/server";
import {
  ejecutarBackup,
  listarBackups,
  obtenerConfigBackup,
  obtenerResumenRespaldo,
  recuperarBackupsInterrumpidos,
  type TipoBackup,
} from "@/lib/backups";
import { obtenerSesion } from "@/lib/session";

function usuarioSesion(sesion: any) {
  return {
    id: sesion?.id ?? null,
    nombre: sesion?.nombre ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    if (sesion.rol !== "ADMINISTRADOR") return NextResponse.json({ success: false, message: "Acceso denegado" }, { status: 403 });

    const config = obtenerConfigBackup();
    await recuperarBackupsInterrumpidos(config);

    const tipo = request.nextUrl.searchParams.get("tipo") || undefined;
    const estado = request.nextUrl.searchParams.get("estado") || undefined;
    const conResumen = request.nextUrl.searchParams.get("resumen") === "1";

    const backups = await listarBackups({ tipo, estado });

    const resumen = conResumen ? await obtenerResumenRespaldo() : null;

    return NextResponse.json({ success: true, backups, resumen });
  } catch (error) {
    console.error("Error al listar backups:", error);
    return NextResponse.json({ success: false, message: "Error al listar los respaldos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    if (sesion.rol !== "ADMINISTRADOR") return NextResponse.json({ success: false, message: "Acceso denegado" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const tiposPermitidos: TipoBackup[] = ["manual", "daily", "weekly", "monthly", "archivo"];
    const tipo = body.tipo;

    if (!tiposPermitidos.includes(tipo)) {
      return NextResponse.json({ success: false, message: `Tipo inválido. Usa: ${tiposPermitidos.join(" | ")}` }, { status: 400 });
    }

    const usuario = usuarioSesion(sesion);
    const resultado = await ejecutarBackup(tipo, {
      motivo: body.motivo || (tipo === "archivo" ? "Respaldo archivado" : `Respaldo manual (${tipo})`),
      usuarioId: usuario.id,
      usuarioNombre: usuario.nombre,
    });

    if (!resultado.ok) {
      return NextResponse.json({ success: false, message: resultado.error, backupId: resultado.id }, { status: 500 });
    }

    return NextResponse.json({ success: true, backupId: resultado.id, nombre: resultado.nombre, ruta: resultado.ruta });
  } catch (error: any) {
    console.error("Error al crear backup:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Error al crear el respaldo" },
      { status: 500 }
    );
  }
}