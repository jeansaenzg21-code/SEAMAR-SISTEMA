import { NextResponse } from "next/server"
import pool from "@/lib/mysql"
import { obtenerSesion } from "@/lib/session"
import { registrarActividad } from "@/lib/actividad"

export async function GET() {
  try {
    const sesion = await obtenerSesion()

    if (!sesion) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const [rows]: any = await pool.query(
      "SELECT tema FROM usuarios WHERE id = ?",
      [sesion.id]
    )

    const tema = rows.length > 0 ? rows[0].tema : "OSCURO"

    return NextResponse.json({ tema })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { success: false, message: "Error al obtener tema" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const sesion = await obtenerSesion()

    if (!sesion) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const body = await request.json()
    const { tema } = body

    if (!["CLARO", "OSCURO"].includes(tema)) {
      return NextResponse.json(
        { success: false, message: "Tema no válido" },
        { status: 400 }
      )
    }

    await pool.query(
      "UPDATE usuarios SET tema = ? WHERE id = ?",
      [tema, sesion.id]
    )

    const nombreActivo = tema === "CLARO" ? "modo claro" : "modo oscuro"

    await registrarActividad({
      tipo: "configuracion",
      accion: "actualizar",
      titulo: `${sesion.nombre} cambió el tema del sistema a ${nombreActivo}.`,
      referenciaId: sesion.id,
    })

    return NextResponse.json({
      success: true,
      message: "Tema actualizado correctamente",
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { success: false, message: "Error al actualizar tema" },
      { status: 500 }
    )
  }
}
