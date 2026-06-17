import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { leerExcel } from "@/lib/excel-reader";
import pool from "@/lib/mysql";
import { buscarOSPorNumero } from "@/lib/onedrive";
import { guardarValorizacion, guardarContrato } from "@/lib/valorizaciones";
import { procesarDocumento } from "@/lib/openai-documentos";

export const runtime = "nodejs";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

function convertirFechaMysql(
  fecha?: string | null
) {

  if (!fecha) return null;

  const partes =
    fecha.split("/");

  if (partes.length !== 3)
    return fecha;

  const [dia, mes, anio] =
    partes;

  return `${anio}-${mes}-${dia}`;

}

async function guardarDocumento(
  json: any,
  file: File
) {

  try {

    const [rows]: any =
      await pool.query(
        `
        SELECT id
        FROM documentos
        WHERE nombre_archivo = ?
        `,
        [file.name]
      );

    if (rows.length > 0) {

      console.log(
        "Documento ya procesado:",
        file.name
      );

      return;

    }

    await pool.query(
      `
      INSERT INTO documentos (

        nombre_archivo,

        tipo_documento,

        empresa_detectada,

        fecha_documento,

        fecha_vencimiento,

        monto,

        estado_procesamiento

      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [

        file.name,

        json.tipoDocumento || null,

        json.empresaEmisora ||
        json.proveedor ||
        json.empresa ||
        null,

        convertirFechaMysql(
  json.fechaEmision ||
  json.fechaPago
),

        convertirFechaMysql(
  json.fechaVencimiento
),

        json.montoTotal ||
        json.monto ||
        json.importePagado ||
        null,

        "PROCESADO"

      ]
    );

  } catch (error) {

    console.error(
      "Error guardando documento",
      error
    );

  }

}

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

  await guardarDocumento(
  json,
  file
);

  if (
  json.tipoDocumento?.toLowerCase() ===
  "valorizacion"
) {

  await guardarValorizacion(json);

}

if (
  json.tipoDocumento?.toLowerCase() ===
  "contrato"
) {

  await guardarContrato(
    json,
    {
      nombre: file.name
    }
  );

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
            - contrato


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



           Para CONTRATO u ORDEN DE COMPRA responde exactamente con esta estructura:
{
  "tipoDocumento": "contrato",
  "cliente": null,
  "rucCliente": null,
  "proveedor": null,
  "rucProveedor": null,
  "numeroContrato": null,
  "numeroOrdenCompra": null,
  "proyecto": null,
  "descripcionProyecto": null,
  "moneda": null,
  "terminoPago": null,
  "fechaEmision": null,
  "subtotal": null,
  "igv": null,
  "total": null,
  "servicios": [
    {
      "nombreServicio": null,
      "descripcion": null,
      "numeroRequerimiento": null,
      "fechaProgramada": null,
      "unidadMedida": null,
      "cantidad": null,
      "precioUnitario": null,
      "montoPactado": null
    }
  ]
}

Si es CONTRATO u ORDEN DE COMPRA extrae:
- cliente
- rucCliente
- proveedor
- rucProveedor
- numeroContrato
- numeroOrdenCompra
- proyecto
- descripcionProyecto
- moneda
- terminoPago
- fechaEmision
- subtotal
- igv
- total
- servicios

Reglas para detectar CONTRATO:
- Si el documento dice "Contrato", "Contrato Marco", "Número Contrato", "Orden Compra", "Orden de Compra", "N° OC", o tiene líneas de servicios con precio unitario y valor total, clasifícalo como "contrato".
- Una Orden de Compra también debe devolverse como tipoDocumento: "contrato" si contiene precios pactados, fechas de entrega o líneas valorizables.

Reglas para servicios:
- Cada línea de la tabla de la orden de compra debe ser un objeto dentro de "servicios".
- nombreServicio debe ser el nombre corto del servicio.
- descripcion debe conservar la descripción completa de la línea.
- fechaProgramada debe estar en formato YYYY-MM-DD.
- cantidad debe ser número.
- precioUnitario debe ser número.
- montoPactado debe ser el valor total de esa línea.
- numeroRequerimiento debe salir de la columna "Número Requer." si existe.
- unidadMedida debe salir de "UM" si existe.

Reglas para proyecto:
- Si aparece "Proyecto", usa ese valor.
- Si el valor de Proyecto es muy general, usa también la descripción principal del servicio para formar un nombre de proyecto entendible.
- Ejemplo: si aparece "TDP - Terminales del Peru" y el servicio dice "SERVICIO DE MANTENIMIENTO GENERAL DE AMARRADERO", el proyecto puede ser "MANTENIMIENTO GENERAL DE AMARRADERO".

Reglas para número de OC:
- Si aparece "N° OC 34647", devuelve numeroOrdenCompra = "34647".
- No confundas numeroOrdenCompra con número de requerimiento.
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

    await guardarDocumento(
  json,
  file
);

  if (
  json.tipoDocumento?.toLowerCase() ===
  "contrato"
) {

  await guardarContrato(
    json,
    {
      nombre: file.name
    }
  );

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

  if (error?.status === 503) {

    return NextResponse.json(
      {
        success: false,
        error:
          "Gemini está temporalmente ocupado. Intente nuevamente en unos segundos."
      },
      {
        status: 503
      }
    );

  }

  return NextResponse.json(
    {
      success: false,
      error: error.message
    },
    {
      status: 500
    }
  );

}

}