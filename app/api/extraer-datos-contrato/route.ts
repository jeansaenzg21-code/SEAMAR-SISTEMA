import { NextResponse } from "next/server"
import OpenAI from "openai"
import { leerPdf } from "@/lib/pdf-reader"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

function limpiarJson(texto: string) {
  return texto
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim()
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const archivo = formData.get("contrato") as File | null

    if (!archivo) {
      return NextResponse.json({
        success: false,
        message: "No se envió contrato",
      })
    }

    const buffer = Buffer.from(await archivo.arrayBuffer())

    let texto = ""

    if (archivo.name.toLowerCase().endsWith(".pdf")) {
      texto = await leerPdf(buffer)
    } else {
      texto = archivo.name
    }

    const textoLimitado = texto.slice(0, 60000)

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: `
Analiza este contrato.

Extrae SOLO estos datos importantes para registrar un proyecto o servicio:

1. tipo: debe ser "PROYECTO" o "SERVICIO"
2. nombre: nombre corto, profesional y claro del proyecto o servicio
3. descripcion: resumen breve de qué trata el contrato

Reglas:
- Si el contrato habla de mantenimiento, inspección, reparación, soporte, suministro puntual o actividad específica, usa SERVICIO.
- Si habla de una obra, implementación completa, desarrollo integral o ejecución de alcance grande, usa PROYECTO.
- El nombre no debe ser muy largo.
- No inventes datos.
- Responde SOLO JSON válido.
- Extrae el monto total contratado si aparece.
- Si la moneda es soles usa "PEN", si es dólares usa "USD".
- Las fechas deben estar en formato YYYY-MM-DD.
- Si no encuentras un dato usa null.
- Extrae el monto total contratado.
- Si ves "S/" usa "PEN".
- Si ves "$" o "USD" usa "USD".
- Las fechas deben ir en formato YYYY-MM-DD.
- Si hay plazo, fecha de inicio, vigencia o término, úsalo para fecha_inicio y fecha_fin.
- No pongas fechas dentro de descripcion si puedes separarlas.
- El campo monto debe ser SOLO el monto total del contrato, no texto.
- Busca valores como "monto total", "valor total", "importe total", "precio total", "contraprestación", "subtotal", "total contrato".
- Si el contrato muestra "S/ 1,234.56", devuelve 1234.56.
- Si el contrato muestra "US$ 1,234.56", devuelve 1234.56 y moneda "USD".
- No pongas el monto dentro de descripcion.
- Si hay subtotal, IGV y total, usa el TOTAL.

Formato:
{
  "tipo": "SERVICIO",
  "nombre": "",
  "descripcion": "",
  "monto": null,
  "moneda": "PEN",
  "fecha_inicio": null,
  "fecha_fin": null
}

Nombre del archivo:
${archivo.name}

Texto del contrato:
${textoLimitado}
      `,
    })

    const contenido =
      response.output_text || "{}"

    const json = JSON.parse(
      limpiarJson(contenido)
    )

    return NextResponse.json({
      success: true,
      data: json,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json({
      success: false,
      message: "Error al analizar contrato",
    })
  }
}