import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(req: Request) {

  try {

    const formData = await req.formData();

    const file = formData.get("file") as File;

    if (!file) {

      return NextResponse.json({
        success: false,
        error: "No se recibió archivo"
      });

    }

    // Convertir archivo a base64
    const bytes = await file.arrayBuffer();

    const base64 = Buffer.from(bytes).toString("base64");
    console.log(
  "GEMINI KEY:",
  process.env.GEMINI_API_KEY?.slice(0, 10)
)

    // Gemini analiza PDF
    const response = await ai.models.generateContent({

      model: "gemini-2.5-flash",

      contents: [

        {
          text:
            `
            Analiza este documento financiero peruano.

            Primero detecta el tipo de documento.

            Los tipos posibles son:
            - factura
            - sunat
            - recibo_honorarios
            - afp


            Devuelve SOLO JSON válido.
            Si es FACTURA extrae:
            -ipoDocumento
            - numeroFactura
            - empresaEmisora
            - rucEmisor
            - empresaCliente
            - rucCliente
            - fechaEmision
            - fechaVencimiento
            - subtotal
            - igv
            - montoTotal
            - detraccion
            - ordenCompra
            - descripcionServicio

            Si es SUNAT extrae:
            - tipoDocumento
            - empresa
            - ruc
            - periodo
            - tributo
            - fechaPago
            - importePagado
            - numeroOperacion
            - banco

           Si es RECIBO POR HONORARIOS extrae:
           - tipoDocumento
           - numeroRecibo
           - persona
           - ruc
           - empresaCliente
           - fechaEmision
           - concepto
           - monto
           - retencion
           - montoNeto

           Si es AFP extrae:
           - tipoDocumento
           - afp
           - empresa
           - ruc
           - periodo
           - fechaPago
           - montoPensiones
           - montoRetribuciones
           - numeroPlanilla
            `
        },

        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64
          }
        }

      ]

    });

    return NextResponse.json({

      success: true,

      data: response.text

    });

  } catch (error: any) {

    console.error(error);

    return NextResponse.json({
      success: false,
      error: error.message
    });

  }

}