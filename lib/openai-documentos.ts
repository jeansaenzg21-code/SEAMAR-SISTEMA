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
- valorizacion
- orden_servicio
- otro

Si el documento no corresponde claramente a ninguno de los tipos definidos,
responde únicamente:

{
  "tipoDocumento": "otro"
}

No inventes campos.
No supongas información.

Devuelve SOLO JSON válido.
No uses markdown.
No expliques nada.
Todas las fechas deben devolverse en formato YYYY-MM-DD.
Si no existe una fecha, devolver null.

Todos los montos deben devolverse como número.

Ejemplos válidos:
23000
23000.50

No incluir:
"S/"
"USD"
","
texto adicional

Si no existe un monto, devolver null.

IMPORTANTE:

Para FACTURA determinar:

- destino

Valores posibles:

- COBRAR
- PAGAR

Nunca devolver null.
Siempre devolver COBRAR o PAGAR. 

Reglas:

COBRAR:
Cuando SEAMAR DIVERS INTERNATIONAL S.A.C.
es quien emite el documento.

PAGAR:
Cuando SEAMAR DIVERS INTERNATIONAL S.A.C.
es quien recibe el documento.

Para determinar destino:

COBRAR:
SEAMAR DIVERS INTERNATIONAL S.A.C.
es la empresa emisora.

PAGAR:
SEAMAR DIVERS INTERNATIONAL S.A.C.
es la empresa cliente o receptora.

Verificar razon social, ruc y contexto del documento.

No asumir únicamente por coincidencia parcial del nombre.

Priorizar siempre el RUC y la razón social completa.

No determinar destino únicamente porque aparezca la palabra "SEAMAR" en una descripción o texto del documento.

Si no es posible identificar con certeza el destino,
priorizar la razón social y RUC de:

- empresaEmisora
- empresaCliente

antes que cualquier descripción del servicio.

Para VALORIZACION responde exactamente con esta estructura:
{
  "tipoDocumento": "valorizacion",
  "proveedor": null,
  "ruc": null,
  "negocioOperacion": null,
  "numeroOrdenServicio": null,
  "descripcion": null,
  "monto": null,
  "moneda": null,
  "periodo": null,
  "fechaEjecucion": null
}

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

Reglas para numeroOrdenServicio:
- En documentos de VALORIZACIÓN, busca la columna o etiqueta:
  "N° de Orden de Servicio (OS)", "Orden de Servicio", "OS", "O/S".
- Si cerca de esa etiqueta aparece un número, ese número es numeroOrdenServicio.
- En tablas, si aparece una fila con valores como:
  "34643 23,000.00 27-Feb-26",
  el primer número antes del monto es la Orden de Servicio.
- No confundas numeroOrdenServicio con monto, fecha o factura.
- Si aparece "34643" asociado a "N° de Orden de Servicio (OS)", devuelve "34643".
- Devuelve solo el número/código, sin texto adicional.
- Si no existe, devuelve null.

IMPORTANTE:
En el documento de valorización, el número de Orden de Servicio puede aparecer como primer valor de la fila de datos.

Ejemplo real:
"34643 23,000.00 27-Feb-26"

En ese caso:
- numeroOrdenServicio = "34643"
- monto = 23000
- NO tomes 34643 como número de factura.
- NO devuelvas numeroOrdenServicio como null si existe ese número en la fila.

Si es FACTURA extrae:

- destino

- entidadPrincipal

Reglas:

Si destino = COBRAR:
devolver empresaCliente.

Si destino = PAGAR:
devolver empresaEmisora.

Nunca devolver null.

Si no puede determinar entidadPrincipal,
usar empresaCliente o empresaEmisora
según corresponda al destino.

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

Ejemplo de respuesta para FACTURA:

{
  "destino": "COBRAR",
  "entidadPrincipal": "REFINERIA LA PAMPILLA S.A.A.",
  "tipoDocumento": "factura",
  "numeroFactura": "E001-13",
  "empresaEmisora": "SEAMAR DIVERS INTERNATIONAL S.A.C.",
  "rucEmisor": "20611842458",
  "empresaCliente": "REFINERIA LA PAMPILLA S.A.A.",
  "rucCliente": "20259829594",
  "fechaEmision": "2024-12-20",
  "fechaVencimiento": "2025-01-19",
  "subtotal": 353693.37,
  "igv": 63664.81,
  "montoTotal": 417358.18,
  "detraccion": 50083,
  "ordenCompra": "4501549555",
  "proyecto": "MANTENIMIENTO DE TERMINALES MARITIMOS MULTIBOYAS Y MONOBOYAS",
  "descripcionServicio": "..."
}

proyecto:
Extrae solamente el nombre corto del proyecto o trabajo ejecutado.

Ejemplo:
"MANTENIMIENTO DE TERMINALES MARITIMOS MULTIBOYAS Y MONOBOYAS"

descripcionServicio:
Extrae la descripción completa del servicio facturado.

Para ORDEN_SERVICIO responde exactamente con esta estructura:

{
  "tipoDocumento": "orden_servicio",
  "proveedor": null,
  "ruc": null,
  "numeroOrdenServicio": null,
  "descripcionServicio": null,
  "montoReferencial": null,
  "fechaEmision": null
}

Si es ORDEN_SERVICIO extrae:
- tipoDocumento
- proveedor
- ruc
- numeroOrdenServicio
- descripcionServicio
- montoReferencial
- fechaEmision (formato YYYY-MM-DD)


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