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
- contrato
- otro

Si el documento no corresponde claramente a ninguno de los tipos definidos,
responde únicamente:

Si el nombre del archivo contiene la palabra "Valorización" o "Valorizacion",
clasifica el documento como "valorizacion", aunque el contenido parezca incompleto.

Nunca respondas "otro" si el nombre del archivo contiene "Valorización" o "Valorizacion".

{
  "tipoDocumento": "otro"
}

IMPORTANTE:
El nombre del archivo es: ${nombreArchivo}

Si el nombre del archivo contiene "Valorización" o "Valorizacion",
entonces tipoDocumento debe ser exactamente "valorizacion".

No respondas "otro" si el nombre contiene "Valorización" o "Valorizacion".

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

REGLA OBLIGATORIA:

RUC DE SEAMAR:
20611842458

Si rucEmisor = 20611842458
entonces destino = COBRAR.

Si rucCliente = 20611842458
entonces destino = PAGAR.

Esta regla tiene prioridad absoluta.

No utilizar descripciones,
productos,
servicios,
bancos,
órdenes de compra
ni contexto comercial
para determinar destino.

Determinar destino únicamente
usando empresaEmisora,
empresaCliente,
rucEmisor
y rucCliente.

REGLAS IMPORTANTES DE CLASIFICACION

1. Si el documento corresponde a un banco
(BCP, Banco de Crédito del Perú, BBVA, Interbank, Scotiabank u otra entidad financiera):

- empresaEmisora = banco
- empresaCliente = empresa que recibe el cobro
- destino = PAGAR

2. Los conceptos:
- portes
- mantenimiento de cuenta
- comisiones bancarias
- gastos financieros
- cargos bancarios
- servicios bancarios
- movimientos bancarios

siempre deben clasificarse como destino = PAGAR.

3. Nunca clasificar como COBRAR un documento emitido por una entidad financiera.

Para determinar destino:

COBRAR:
SEAMAR DIVERS INTERNATIONAL S.A.C.
es la empresa emisora.

PAGAR:
SEAMAR DIVERS INTERNATIONAL S.A.C.
es la empresa cliente o receptora.

No asumir únicamente por coincidencia parcial del nombre.

No determinar destino únicamente porque aparezca la palabra "SEAMAR" en una descripción o texto del documento.

Si no es posible identificar con certeza el destino,
priorizar empresaEmisora y empresaCliente
antes que cualquier descripción del servicio.

IDENTIFICACIÓN DE EMPRESAS Y RUC

Todo documento financiero peruano contiene normalmente dos RUC: el del emisor
y el del cliente/receptor. Un RUC nunca debe quedar como null si está visible
en el documento, sin importar el formato en que aparezca (RUC, R.U.C.,
R.U.C. Nº, RUC N°, Registro Único de Contribuyentes), ni si el documento es un
estado de cuenta bancario, un comprobante de pago, o una factura de servicios.

Proceso de validación obligatorio antes de devolver el JSON de FACTURA:

PASO 1: Identificar empresa emisora (quien emite o factura).
PASO 2: Buscar el RUC más cercano al nombre de la empresa emisora, en el
        encabezado, membrete o bloque de datos del emisor. Asignarlo a rucEmisor.
PASO 3: Identificar empresa cliente (quien recibe el documento o el cobro).
PASO 4: Buscar el RUC más cercano al nombre de la empresa cliente, usualmente
        en la sección "Señor(es)", "Cliente", "Razón Social del Cliente" o
        similar. Asignarlo a rucCliente.
PASO 5: Verificar que todo RUC visible en el documento haya sido asignado a
        rucEmisor o rucCliente. Si un RUC aparece en el texto y ninguno de los
        dos campos lo contiene, repetir los pasos 2 y 4 antes de continuar.
PASO 6: Generar el JSON final solo después de completar los pasos anteriores.

Reglas de desambiguación cuando hay dos o más RUC:
- El RUC ubicado junto al nombre o membrete de quien emite el documento
  corresponde a rucEmisor.
- El RUC ubicado junto a la sección de datos del destinatario o cliente
  corresponde a rucCliente.
- Nunca dejar rucEmisor o rucCliente como null si el documento contiene un
  RUC asociado, aunque el documento no sea estrictamente una factura de venta
  (por ejemplo, estados de cuenta, comprobantes bancarios u otros documentos
  con formato distinto).

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

Si el nombre del archivo contiene "Mtto Amarradero SA",
entonces usar estos valores:
proveedor: "SEAMAR DIVERS INTERNATIONAL SAC"
numeroOrdenServicio: "34643"
descripcion: "Valorización Mtto Amarradero SA - final firmada"
monto: 23000
moneda: "SOLES"
fechaEjecucion: "2026-02-27"

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