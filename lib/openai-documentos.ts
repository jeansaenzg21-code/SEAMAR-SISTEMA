import OpenAI from "openai";
import { leerPdf } from "./pdf-reader";
import * as XLSX from "xlsx";

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
function leerExcel(
  buffer: Buffer
) {

  const workbook =
    XLSX.read(buffer, {
      type: "buffer"
    });

  let texto = "";

  for (
    const sheetName of workbook.SheetNames
  ) {

    const sheet =
      workbook.Sheets[sheetName];

    const filas =
      XLSX.utils.sheet_to_json(
        sheet,
        {
          header: 1,
          defval: ""
        }
      );

    texto +=
      `\nHOJA: ${sheetName}\n`;

    texto += filas
      .map(
        (fila: any) =>
          fila.join(" | ")
      )
      .join("\n");

  }

  return texto;

}
export async function procesarDocumento(
  buffer: Buffer,
  nombreArchivo: string
) {

  const esExcel =
    nombreArchivo.endsWith(".xlsx") ||
    nombreArchivo.endsWith(".xls") ||
    nombreArchivo.endsWith(".csv");

  const textoDocumento =
    esExcel
      ? leerExcel(buffer)
      : await leerPdf(buffer);

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
<<<<<<< HEAD
- contrato
=======
- otro

Si el documento no corresponde claramente a ninguno de los tipos definidos,
responde únicamente:

{
  "tipoDocumento": "otro"
}

No inventes campos.
No supongas información.
>>>>>>> e8c745088dea28e4bb6af27cc836f067af128ecd

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
- fechaEjecucion

También considera como VALORIZACION:
- Archivos Excel o tablas con valorizaciones.
- Documentos que tengan columnas como:
  "Orden de Servicio", "OS", "O/S", "N° OS",
  "Descripción", "Servicio", "Monto", "Importe",
  "Periodo", "Fecha", "Fecha de ejecución".
- Reportes donde cada fila representa una valorización o servicio valorizado.

Reglas para Excel de valorizaciones:
- Si el documento viene de Excel, analiza filas y columnas aunque estén desordenadas.
- Usa los encabezados para identificar los campos.
- Si una fila contiene una valorización, extrae los datos de esa fila.
- Si hay varias filas, toma la valorización principal o la primera fila válida con monto y descripción.
- No inventes datos.
- Si un campo no existe, devuelve null.

Mapeo de columnas posibles:
- proveedor: "Proveedor", "Razón Social", "Empresa", "Contratista"
- ruc: "RUC", "RUC Proveedor", "RUC Empresa"
- negocioOperacion: "Negocio", "Operación", "Unidad", "Área", "Sede"
- numeroOrdenServicio: "Orden de Servicio", "N° Orden de Servicio", "OS", "O/S", "N° OS", "Nro OS"
- descripcion: "Descripción", "Servicio", "Concepto", "Detalle", "Trabajo ejecutado", "Actividad"
- monto: "Monto", "Importe", "Total", "Valor", "Subtotal", "Monto valorizado"
- moneda: "Moneda", "Currency", "Soles", "USD"
- periodo: "Periodo", "Mes", "Semana", "Valorización del mes"
- fechaEjecucion: "Fecha ejecución", "Fecha de ejecución", "Fecha", "Fecha fin", "Fecha valorización"

Reglas para numeroOrdenServicio:
- Busca etiquetas como:
  "N° de Orden de Servicio (OS)", "Orden de Servicio", "OS", "O/S", "N° OS".
- Devuelve solo el número o código, sin texto adicional.
- No confundas numeroOrdenServicio con monto, factura, RUC, fecha o número de fila.
- Si aparece una fila como:
  "34643 23,000.00 27-Feb-26"
  entonces:
  numeroOrdenServicio = "34643"
  monto = 23000
  fechaEjecucion = "2026-02-27"
- Si existe un código asociado a OS, nunca devuelvas null.

Reglas para monto:
- Devuelve número, no texto.
- Quita comas, símbolos y moneda.
- Ejemplo: "S/ 23,000.00" => 23000
- Ejemplo: "$ 1,500.50" => 1500.5

Reglas para moneda:
- Si aparece "S/", "SOLES", "PEN" devuelve "SOLES".
- Si aparece "$", "USD", "DOLARES" devuelve "DOLARES".
- Si no aparece, devuelve null.

Reglas para fechaEjecucion:
- Devuelve formato YYYY-MM-DD.
- Convierte fechas como "27-Feb-26" a "2026-02-27".
- Si solo hay periodo o mes, deja fechaEjecucion en null.

Reglas para periodo:
- Si aparece mes y año, devuelve algo como "FEBRERO 2026".
- Si aparece "2026-02", devuelve "FEBRERO 2026".
- Si no existe, devuelve null.

Reglas importantes:
- Si el archivo parece una tabla de valorizaciones, clasifícalo como "valorizacion".
- No clasifiques como factura solo porque hay monto.
- No clasifiques como contrato solo porque hay servicios.
- Una valorización normalmente confirma trabajos ejecutados, montos valorizados, periodo, OS o servicio.

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

<<<<<<< HEAD
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
=======
>>>>>>> e8c745088dea28e4bb6af27cc836f067af128ecd

DOCUMENTO:

${textoDocumento}
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