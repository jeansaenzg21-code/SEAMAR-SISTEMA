import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { leerExcel } from "@/lib/excel-reader";
import pool from "@/lib/mysql";
import { buscarOSPorNumero } from "@/lib/onedrive";
import { guardarValorizacion } from "@/lib/valorizaciones";

export const runtime = "nodejs";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});
function parsearJsonGemini(
  texto: string
) {

  const limpio =
    texto
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

  return JSON.parse(limpio);

}

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

const buffer = Buffer.from(bytes);

const base64 = buffer.toString("base64");
    console.log(
  "GEMINI KEY:",
  process.env.GEMINI_API_KEY?.slice(0, 10)
)

if (
  file.name.toLowerCase().endsWith(".xlsx") ||
  file.name.toLowerCase().endsWith(".xls")
) {

  const contenidoExcel =
    await leerExcel(buffer);

  const response =
    await ai.models.generateContent({

      model: "gemini-2.5-flash",

      contents: `
Analiza este archivo Excel.

Puede ser:
- valorizacion
- orden_servicio
- factura
- sunat
- afp
- recibo_honorarios

Devuelve SOLO JSON válido.

Si es valorizacion extrae:
- tipoDocumento
- proveedor
- ruc
- negocioOperacion
- numeroOrdenServicio
- descripcion
- monto
- moneda
- periodo
- fechaEjecucion (formato YYYY-MM-DD)

${contenidoExcel}
`

    });
try {

  const json =
  parsearJsonGemini(
    response.text ?? "{}"
  );

  if (
    json.tipoDocumento?.toLowerCase() ===
    "valorizacion"
  ) {

    await guardarValorizacion(json);

  }

} catch (e) {

  console.error(
    "Error procesando valorización",
    e
  );

}
  return NextResponse.json({
    success: true,
    data: response.text
  });

}
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
            - valorizacion
            - orden_servicio


            Devuelve SOLO JSON válido.
            Si es VALORIZACION extrae:
- tipoDocumento
- proveedor
- ruc
- negocioOperacion
- numeroOrdenServicio
- descripcion
- monto
- moneda
- periodo
- fechaEjecucion (formato YYYY-MM-DD)
            
            Si es ORDEN_SERVICIO extrae:
- tipoDocumento
- proveedor
- ruc
- numeroOrdenServicio
- descripcionServicio
- montoReferencial
- fechaEmision

            Si es FACTURA extrae:
            - tipoDocumento
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

    try {

  const json =
    parsearJsonGemini(
      response.text ?? "{}"
    );

  if (
    json.tipoDocumento?.toLowerCase() ===
    "valorizacion"
  ) {

    await guardarValorizacion(json);

  }

} catch (e) {

  console.error(
    "Error procesando valorización",
    e
  );

}

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