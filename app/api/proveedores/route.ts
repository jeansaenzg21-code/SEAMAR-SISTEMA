import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

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
    const [proveedorExistente] = await pool.query(
  "SELECT id FROM proveedores WHERE ruc = ?",
  [ruc]
);

if ((proveedorExistente as any[]).length > 0) {
  return NextResponse.json(
    {
      success: false,
      message: "Ya existe un proveedor registrado con ese RUC",
    },
    {
      status: 400,
    }
  );
}

    const [result] = await pool.query(
      `
      INSERT INTO proveedores (
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
      message: "Proveedor registrado correctamente",
      result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al registrar proveedor",
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
      "SELECT * FROM proveedores"
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener proveedores",
      },
      {
        status: 500,
      }
    );
  }
}