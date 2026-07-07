import { NextResponse } from "next/server";
import pool from "@/lib/mysql";
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
      WHERE correo = ?
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

    // Temporal (luego usaremos bcrypt)
    if (user.password !== password) {
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
});

    return NextResponse.json({
      ok: true,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol,
      },
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}