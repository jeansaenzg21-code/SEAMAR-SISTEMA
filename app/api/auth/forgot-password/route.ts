import { NextResponse } from "next/server";
import pool from "@/lib/mysql";
import { enviarCorreo } from "@/lib/outlook";

export async function POST(req: Request) {
  try {
    const { correo } = await req.json();

    if (!correo?.trim()) {
      return NextResponse.json(
        { error: "El correo es obligatorio." },
        { status: 400 }
      );
    }

    const [empresaRows]: any = await pool.query("SELECT nombre_comercial FROM empresa LIMIT 1")
    const empresaNombre = empresaRows[0]?.nombre_comercial || ""

    const [rows]: any = await pool.query(
      "SELECT id, nombre, correo FROM usuarios WHERE correo = ? AND estado = 'ACTIVO' LIMIT 1",
      [correo.trim()]
    );

    const usuario = rows.length > 0 ? rows[0] : null;

    if (!usuario) {
      // Mensaje genérico por seguridad — nunca revelar si el correo existe
      return NextResponse.json({
        ok: true,
        mensaje: "Si el correo está registrado, recibirás un código de verificación.",
      });
    }

    // Invalidar códigos anteriores no usados
    await pool.query(
      "UPDATE password_resets SET usado = 1 WHERE usuario_id = ? AND usado = 0",
      [usuario.id]
    );

    const codigo = String(Math.floor(100000 + Math.random() * 900000));

    const expiraEn = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      "INSERT INTO password_resets (usuario_id, codigo, expira_en) VALUES (?, ?, ?)",
      [usuario.id, codigo, expiraEn]
    );

    const contenido = `
      <p>Hola <strong>${usuario.nombre}</strong>.</p>
      <p>Has solicitado recuperar tu contraseña.</p>
      <p>Tu código de verificación es:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px;text-align:center;padding:12px;background:#f4f4f4;border-radius:8px;">${codigo}</p>
      <p>Este código expirará en 10 minutos.</p>
      <p>Si no realizaste esta solicitud, ignora este correo.</p>
    `;

    await enviarCorreo(
      `Recuperación de contraseña${empresaNombre ? ` - ${empresaNombre}` : ""}`,
      contenido,
      usuario.correo
    );

    return NextResponse.json({
      ok: true,
      mensaje: "Si el correo está registrado, recibirás un código de verificación.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
