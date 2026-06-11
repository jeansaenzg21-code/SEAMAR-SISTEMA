import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
})

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
export async function procesarPdf(
  buffer: Buffer
) {

  const base64 =
    buffer.toString("base64");

  const response =
    await ai.models.generateContent({

      model: "gemini-2.5-flash",

      contents: [

        {
          text: `
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

  return parsearJsonGemini(
    response.text ?? "{}"
  );

}