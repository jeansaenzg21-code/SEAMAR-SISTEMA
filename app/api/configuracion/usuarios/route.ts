import { NextResponse } from "next/server"
import pool from "@/lib/mysql"
import bcrypt from "bcryptjs"
import { registrarActividad } from "@/lib/actividad"
import { obtenerSesion } from "@/lib/session"

export async function GET() {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, usuario, nombre, correo, cargo, rol, estado, ultimo_login, created_at, updated_at
       FROM usuarios
       ORDER BY id ASC`
    )

    return NextResponse.json(rows)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener usuarios",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
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

    if (!correo?.trim()) {
      return NextResponse.json(
        { success: false, message: "El correo es obligatorio" },
        { status: 400 }
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, message: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    const [duplicados]: any = await pool.query(
      "SELECT id FROM usuarios WHERE usuario = ? OR correo = ?",
      [usuario.trim(), correo.trim()]
    )

    if (duplicados.length > 0) {
      const dup = duplicados[0]
      const [existente]: any = await pool.query(
        "SELECT usuario, correo FROM usuarios WHERE id = ?",
        [dup.id]
      )
      const campo = existente[0].usuario === usuario.trim() ? "usuario" : "correo"
      return NextResponse.json(
        { success: false, message: `Ya existe un usuario con ese ${campo}` },
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

    const passwordHash = await bcrypt.hash(password, 10)

    const [result]: any = await pool.query(
      `INSERT INTO usuarios (usuario, nombre, correo, password, cargo, rol, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO')`,
      [usuario.trim(), nombre.trim(), correo.trim(), passwordHash, cargo?.trim() || null, rol]
    )

    const [nuevo]: any = await pool.query(
      `SELECT id, usuario, nombre, correo, cargo, rol, estado, ultimo_login, created_at, updated_at
       FROM usuarios WHERE id = ?`,
      [result.insertId]
    )

    const sesionCrear = await obtenerSesion()

    await registrarActividad({
      tipo: "configuracion",
      accion: "crear",
      titulo: `Usuario creado: ${nombre.trim()}`,
      subtitulo: `Rol: ${rol}`,
      usuarioNombre: sesionCrear?.nombre || null,
      referenciaId: result.insertId,
    })

    return NextResponse.json({
      success: true,
      usuario: nuevo[0],
      message: "Usuario creado correctamente",
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message: "Error al crear usuario",
      },
      { status: 500 }
    )
  }
}
