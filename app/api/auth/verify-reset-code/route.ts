import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function POST(req: Request) {
  try {
    const { codigo } = await req.json();

    if (!codigo?.trim() || codigo.length !== 6) {
      return NextResponse.json(
        { error: "Código inválido." },
        { status: 400 }
      );
    }

    // Marcar como usado cualquier código expirado del mismo usuario para
    // evitar múltiples intentos con códigos vencidos
    await pool.query(
      "UPDATE password_resets SET usado = 1 WHERE expira_en < NOW() AND usado = 0"
    );

    const [rows]: any = await pool.query(
      `SELECT id, usuario_id
       FROM password_resets
       WHERE codigo = ?
         AND usado = 0
         AND expira_en > NOW()
       LIMIT 1`,
      [codigo.trim()]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Código inválido o expirado." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, resetId: rows[0].id });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
