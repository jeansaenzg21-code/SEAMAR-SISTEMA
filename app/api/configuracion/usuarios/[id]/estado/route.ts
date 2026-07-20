import { NextResponse } from "next/server"
import pool from "@/lib/mysql"
import { registrarActividad } from "@/lib/actividad"
import { obtenerSesion } from "@/lib/session"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { estado } = await request.json()

    if (!["ACTIVO", "INACTIVO"].includes(estado)) {
      return NextResponse.json(
        { success: false, message: "Estado no válido" },
        { status: 400 }
      )
    }

    const [rows]: any = await pool.query(
      "SELECT nombre FROM usuarios WHERE id = ?",
      [id]
    )

    await pool.query(
      "UPDATE usuarios SET estado = ? WHERE id = ?",
      [estado, id]
    )

    const nombreUsuario = rows.length > 0 ? rows[0].nombre : `ID ${id}`

    const sesionEstado = await obtenerSesion()

    await registrarActividad({
      tipo: "configuracion",
      accion: estado === "ACTIVO" ? "activar" : "desactivar",
      titulo: `Usuario ${estado === "ACTIVO" ? "activado" : "desactivado"}: ${nombreUsuario}`,
      usuarioNombre: sesionEstado?.nombre || null,
      referenciaId: Number(id),
    })

    return NextResponse.json({
      success: true,
      message: "Estado actualizado correctamente",
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message: "Error al actualizar estado del usuario",
      },
      { status: 500 }
    )
  }
}
