import { NextResponse } from "next/server";
import pool from "@/lib/mysql";
import bcrypt from "bcryptjs";
import { crearSesion } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Complete todos los campos." },
        { status: 400 }
      );
    }

    const [rows]: any = await pool.query(
      `
      SELECT *
      FROM usuarios
      WHERE usuario = ?
        AND estado = 'ACTIVO'
      LIMIT 1
      `,
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 401 }
      );
    }

    const user = rows[0];

    console.log("[LOGIN] Usuario encontrado:", user.usuario);
    console.log("[LOGIN] Hash almacenado longitud:", user.password?.length || 0);
    console.log("[LOGIN] Hash almacenado prefijo:", user.password?.substring(0, 7) || "vacio");

    const passwordValida = await bcrypt.compare(password, user.password);

    console.log("[LOGIN] Resultado bcrypt.compare:", passwordValida);

    if (!passwordValida) {
      return NextResponse.json(
        { error: "Contraseña incorrecta." },
        { status: 401 }
      );
    }

    await pool.query(
      `
      UPDATE usuarios
      SET ultimo_login = NOW()
      WHERE id = ?
      `,
      [user.id]
    );

    await crearSesion({
  id: user.id,
  nombre: user.nombre,
  usuario: user.usuario,
  rol: user.rol,
  tema: user.tema,
  cargo: user.cargo ?? null,
  avatar: user.avatar ?? null,
});

    return NextResponse.json({
      ok: true,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol,
      },
      tema: user.tema,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
