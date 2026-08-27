import { NextRequest, NextResponse } from "next/server"
import { obtenerSesion } from "@/lib/session"
import { extraerFacturaSeamar } from "@/lib/facturas-seamar"

const EXTENSIONES_VALIDAS = ["pdf", "jpg", "jpeg", "png"]
const MAX_TAMANO = 20 * 1024 * 1024

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion()
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 })
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || ""
  if (!EXTENSIONES_VALIDAS.includes(extension)) {
    return NextResponse.json({ error: "Solo se permiten PDF, JPG, JPEG o PNG." }, { status: 400 })
  }
  if (file.size === 0 || file.size > MAX_TAMANO) {
    return NextResponse.json({ error: "El archivo debe pesar entre 1 byte y 20 MB." }, { status: 400 })
  }

  try {
    const resultado = await extraerFacturaSeamar(
      file.name,
      Buffer.from(await file.arrayBuffer()),
    )
    return NextResponse.json({ ok: true, factura: resultado })
  } catch (error: any) {
    console.error("[SEAMAR-IMPORT] Error procesando factura:", error)
    return NextResponse.json(
      { error: error?.message || "No se pudo extraer la factura." },
      { status: 500 },
    )
  }
}
