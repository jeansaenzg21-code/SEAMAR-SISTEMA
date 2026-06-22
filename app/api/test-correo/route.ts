import { NextResponse } from "next/server";
import { enviarCorreo } from "@/lib/outlook";

export async function GET() {

  try {

    console.log("INICIANDO ENVIO");

    await enviarCorreo(
      "Prueba Outlook SEAMAR",
      "<h1>Correo de prueba</h1>"
    );

    console.log("CORREO ENVIADO");

    return NextResponse.json({
      success: true
    });

  } catch (error: any) {

    console.error(
      "ERROR OUTLOOK:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: String(error)
      },
      {
        status: 500
      }
    );

  }

}