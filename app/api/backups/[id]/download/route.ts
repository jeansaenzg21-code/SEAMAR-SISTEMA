import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import fs from "fs";
import { obtenerBackup, obtenerConfigBackup, rutaSegura } from "@/lib/backups";
import { obtenerSesion } from "@/lib/session";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    if (sesion.rol !== "ADMINISTRADOR") return NextResponse.json({ success: false, message: "Acceso denegado" }, { status: 403 });

    const { id } = await params;
    const config = obtenerConfigBackup();
    const backup = await obtenerBackup(Number(id));

    if (!backup) return NextResponse.json({ success: false, message: "El respaldo no existe" }, { status: 404 });

    const ruta = rutaSegura(config, backup.ruta);
    const stat = fs.statSync(ruta, { throwIfNoEntry: false });
    if (!stat || !stat.isFile()) {
      return NextResponse.json({ success: false, message: "El archivo del respaldo no existe en el servidor" }, { status: 404 });
    }

    const stream = Readable.toWeb(fs.createReadStream(ruta));

    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="${backup.nombre_archivo}"`,
        "Content-Length": String(stat.size),
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Error al descargar backup:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Error al descargar el respaldo" },
      { status: 500 }
    );
  }
}