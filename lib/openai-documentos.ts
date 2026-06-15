import OpenAI from "openai";
import { leerPdf } from "./pdf-reader";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function parsearJson(
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

  const textoPdf =
  await leerPdf(buffer);

  let ultimoError: any;

  for (
    let intento = 1;
    intento <= 3;
    intento++
  ) {

    try {

      const response =
  await openai.responses.create({

    model: "gpt-5-mini",

    input: `
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

- proyecto

- descripcionServicio

proyecto:
Extrae solamente el nombre corto del proyecto o trabajo ejecutado.

Ejemplo:
"MANTENIMIENTO DE TERMINALES MARITIMOS MULTIBOYAS Y MONOBOYAS"

descripcionServicio:
Extrae la descripción completa del servicio facturado.

Si es ORDEN_SERVICIO extrae:
- tipoDocumento
- proveedor
- ruc
- numeroOrdenServicio
- descripcionServicio
- montoReferencial
- fechaEmision (formato YYYY-MM-DD)

Si es SUNAT extrae:
- tipoDocumento
- empresa
- ruc
- periodo
- tributo
- fechaPago (formato YYYY-MM-DD)
- importePagado
- numeroOperacion
- banco

Si es RECIBO POR HONORARIOS extrae:
- tipoDocumento
- numeroRecibo
- persona
- ruc
- empresaCliente
- fechaEmision (formato YYYY-MM-DD)
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
- fechaPago (formato YYYY-MM-DD)
- montoPensiones
- montoRetribuciones
- numeroPlanilla

DOCUMENTO:

${textoPdf}
  `
            });

      return parsearJson(
  response.output_text ?? "{}"
);

    } catch (error: any) {

      ultimoError = error;

      console.log(
  `OpenAI intento ${intento} falló`
);

      if (error?.status === 429) {
  throw error;
}

if (error?.status !== 503) {
  throw error;
}

      if (intento < 3) {

        await new Promise(
  resolve =>
    setTimeout(
      resolve,
      60000
    )
);

      }

    }

  }

  throw ultimoError;

}