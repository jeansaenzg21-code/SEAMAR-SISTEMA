import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      tipo,
      cliente_id,
      proveedor_id,
      proyecto_id,
      servicio,
      documento_tipo,
      documento_numero,
      monto,
      fecha_emision,
      fecha_vencimiento,
      estado,
    } = body;

    const [result] = await pool.query(
      `
      INSERT INTO movimientos (
        tipo,
        cliente_id,
        proveedor_id,
        proyecto_id,
        servicio,
        documento_tipo,
        documento_numero,
        monto,
        fecha_emision,
        fecha_vencimiento,
        estado
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        tipo,
        cliente_id || null,
        proveedor_id || null,
        proyecto_id || null,
        servicio || null,
        documento_tipo || null,
        documento_numero || null,
        monto,
        fecha_emision || null,
        fecha_vencimiento || null,
        estado || "PENDIENTE",
      ]
    );

    return NextResponse.json({
      success: true,
      result,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al registrar movimiento",
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
      "SELECT * FROM movimientos ORDER BY id DESC"
    );

    return NextResponse.json(rows);

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}