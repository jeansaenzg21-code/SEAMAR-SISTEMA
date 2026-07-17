import { NextResponse } from "next/server"
import pool from "@/lib/mysql"
import bcrypt from "bcryptjs"
import { registrarActividad } from "@/lib/actividad"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { usuario, nombre, correo, cargo, rol, password } = body

    if (!usuario?.trim()) {
      return NextResponse.json(
        { success: false, message: "El nombre de usuario es obligatorio" },
        { status: 400 }
      )
    }

    if (!nombre?.trim()) {
      return NextResponse.json(
        { success: false, message: "El nombre es obligatorio" },
        { status: 400 }
      )
    }

    const rolValido = ["ADMINISTRADOR", "SUPERVISOR", "OPERADOR"].includes(rol)
    if (!rolValido) {
      return NextResponse.json(
        { success: false, message: "Rol no válido" },
        { status: 400 }
      )
    }

    const [duplicados]: any = await pool.query(
      "SELECT id FROM usuarios WHERE (usuario = ? OR correo = ?) AND id != ?",
      [usuario.trim(), correo.trim(), id]
    )

    if (duplicados.length > 0) {
      const dup = duplicados[0]
      const [existente]: any = await pool.query(
        "SELECT usuario, correo FROM usuarios WHERE id = ?",
        [dup.id]
      )
      const campo = existente[0].usuario === usuario.trim() ? "usuario" : "correo"
      return NextResponse.json(
        { success: false, message: `Ya existe otro usuario con ese ${campo}` },
        { status: 400 }
      )
    }

    if (password && password.length > 0) {
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, message: "La contraseña debe tener al menos 6 caracteres" },
          { status: 400 }
        )
      }

      const passwordHash = await bcrypt.hash(password, 10)

      await pool.query(
        `UPDATE usuarios SET usuario = ?, nombre = ?, correo = ?, cargo = ?, rol = ?, password = ? WHERE id = ?`,
        [usuario.trim(), nombre.trim(), correo.trim(), cargo?.trim() || null, rol, passwordHash, id]
      )
    } else {
      await pool.query(
        `UPDATE usuarios SET usuario = ?, nombre = ?, correo = ?, cargo = ?, rol = ? WHERE id = ?`,
        [usuario.trim(), nombre.trim(), correo.trim(), cargo?.trim() || null, rol, id]
      )
    }

    await registrarActividad({
      tipo: "configuracion",
      accion: "actualizar",
      titulo: `Usuario actualizado: ${nombre.trim()}`,
      subtitulo: `Rol: ${rol}`,
      referenciaId: Number(id),
    })

    return NextResponse.json({
      success: true,
      message: "Usuario actualizado correctamente",
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message: "Error al actualizar usuario",
      },
      { status: 500 }
    )
  }
}
