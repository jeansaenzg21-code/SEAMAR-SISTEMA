import { NextResponse } from "next/server";
import pool from "@/lib/mysql";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { resetId, password, confirmarPassword } = await req.json();

    if (!resetId) {
      return NextResponse.json(
        { error: "Solicitud inválida." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    if (password !== confirmarPassword) {
      return NextResponse.json(
        { error: "Las contraseñas no coinciden." },
        { status: 400 }
      );
    }

    const [rows]: any = await pool.query(
      `SELECT id, usuario_id
       FROM password_resets
       WHERE id = ?
         AND usado = 0
         AND expira_en > NOW()
       LIMIT 1`,
      [resetId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "El código ya expiró o ya fue utilizado." },
        { status: 400 }
      );
    }

    const reset = rows[0];

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      "UPDATE usuarios SET password = ? WHERE id = ?",
      [passwordHash, reset.usuario_id]
    );

    await pool.query(
      "UPDATE password_resets SET usado = 1 WHERE id = ?",
      [resetId]
    );

    return NextResponse.json({
      ok: true,
      mensaje: "Contraseña actualizada correctamente.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
