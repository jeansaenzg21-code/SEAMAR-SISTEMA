import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      razon_social,
      ruc,
      estado,
      contacto_principal,
      correo,
      telefono,
      direccion,
    } = body;
    const [clienteExistente] = await pool.query(
  "SELECT id FROM clientes WHERE ruc = ?",
  [ruc]
);

if ((clienteExistente as any[]).length > 0) {
  return NextResponse.json(
    {
      success: false,
      message: "Ya existe un cliente registrado con ese RUC",
    },
    {
      status: 400,
    }
  );
}

    const [result] = await pool.query(
      `
      INSERT INTO clientes (
        razon_social,
        ruc,
        estado,
        contacto_principal,
        correo,
        telefono,
        direccion
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        razon_social,
        ruc,
        estado,
        contacto_principal,
        correo,
        telefono,
        direccion,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Cliente registrado correctamente",
      result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al registrar cliente",
      },
      {
        status: 500,
      }
    );
  }
}
export async function GET() {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM clientes"
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener clientes",
      },
      {
        status: 500,
      }
    );
  }
}