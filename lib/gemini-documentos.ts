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

  let ultimoError: any;

  for (
    let intento = 1;
    intento <= 3;
    intento++
  ) {

    try {

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
                mimeType:
                  "application/pdf",
                data: base64
              }
            }

          ]

        });

      return parsearJsonGemini(
        response.text ?? "{}"
      );

    } catch (error: any) {

      ultimoError = error;

      console.log(
        `Gemini intento ${intento} falló`
      );

      if (
        error?.status !== 503
      ) {
        throw error;
      }

      if (intento < 3) {

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              3000
            )
        );

      }

    }

  }

  throw ultimoError;

}