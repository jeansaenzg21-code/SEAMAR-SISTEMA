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
Eres un analista de tesorería que extrae datos estructurados de documentos financieros peruanos (facturas, valorizaciones, órdenes de servicio, contratos, órdenes de compra).

No inventes campos ni supongas información. Devuelve SOLO JSON válido, sin markdown, sin explicaciones.

EL NOMBRE DEL ARCHIVO ES: ${nombreArchivo}

## PASO 1 — CLASIFICAR tipoDocumento

Tipos posibles: "factura", "valorizacion", "orden_servicio", "contrato", "otro".

Evalúa las reglas en orden ESTRICTO. En cuanto una se cumpla, usa ese tipoDocumento y DETENTE — no reconsideres por tablas, referencias a otros documentos ni montos.

## REGLA 0 — NOTAS DE CRÉDITO Y NOTAS DE DÉBITO (prioridad máxima)

La clasificación como nota de crédito/débito depende ÚNICAMENTE del encabezado visible. NUNCA uses el prefijo de la serie (FC, FD, BC, BD, NC, ND u otro) como señal — distintas entidades reutilizan esos prefijos para facturas válidas. Esta regla, una vez aplicada, queda CERRADA y ningún paso posterior la reabre por el prefijo de la serie.

Si el documento contiene visiblemente "NOTA DE CRÉDITO", "NOTA DE CRÉDITO ELECTRÓNICA", "NOTA DE DÉBITO", "NOTA DE DÉBITO ELECTRÓNICA", "CREDIT NOTE" o "DEBIT NOTE":

{
  "tipoDocumento": "otro"
}

Aplica SIEMPRE que el encabezado esté presente, aunque el documento también mencione "factura", "comprobante afectado", un RUC válido, montos, o la serie F001/E001 del comprobante al que afecta. No extraigas más campos ni continúes con las reglas siguientes. Estas notas no se procesan todavía.

Si NO contiene ninguno de esos encabezados, esta regla no aplica — sin importar el prefijo de la serie. Continúa con la REGLA 1. Una factura real con serie "FC03-06518006" (ej. BCP) sigue siendo factura.

## REGLA 1 — VALORIZACION

1a. Si el nombre del archivo contiene "Valorización" o "Valorizacion" → "valorizacion", sin excepción, aunque el contenido parezca incompleto.

1b. Si es un Excel/CSV con columnas como "Orden de Servicio", "OS", "O/S", "N° OS", "Descripción", "Monto", "Importe", "Periodo" o "Fecha de ejecución", o cada fila representa un servicio valorizado → "valorizacion".

## REGLA 2 — FACTURA (incluye boletas y documentos bancarios)

Clasifica como "factura" si se cumple CUALQUIERA:

a) Contiene el encabezado "FACTURA ELECTRÓNICA", "FACTURA", "BOLETA DE VENTA ELECTRÓNICA", "BOLETA" o "COMPROBANTE DE PAGO ELECTRÓNICO".

b) Contiene una serie de comprobante electrónico válida (no depende de longitud fija, sino del patrón):
   - Un único guion en todo el código (dos o más guiones, ej. "CT-2024-001", NO califica).
   - El bloque ANTES del guion ("serie") es (i) alfanumérico —letras y dígitos combinados, cualquier longitud— o (ii) puramente alfabético solo si es una serie real confirmada (ej. FTVI); una serie alfabética nueva y desconocida solo vale si además hay evidencia clara de comprobante de pago (encabezado de factura/boleta, origen bancario, RUC de emisor, montos con IGV/subtotal/total).
   - El bloque DESPUÉS del guion ("correlativo") es puramente numérico, de 2 a 10 dígitos.

   Lista de series reconocidas y ejemplos completos: ver PASO 3-B.

   EXCLUSIÓN: nunca tratar como serie de comprobante los prefijos internos "CT", "CTR", "OS", "OC", "REQ", "ORD", "COT", "PED" (contratos, órdenes de servicio/compra, requerimientos, cotizaciones o pedidos internos, no comprobantes SUNAT).

   No confundas una serie de comprobante con un número de contrato, orden de compra, requerimiento u operación bancaria (ver detalle en PASO 3-C).

c) Proviene de una entidad financiera (BCP, BBVA, Interbank, Scotiabank, BanBif o cualquier banco) y describe un cargo, comisión, mantenimiento de cuenta, portes, gasto financiero o estado de cuenta — aunque mencione "contrato de cuenta" o "número de contrato" en su encabezado, sigue siendo factura.

d) Es un comprobante de pago de cualquier rubro (alimentación, transporte, salud, exámenes médicos, hoteles, combustible, servicios especializados) que no encaja claramente en valorización, orden de servicio o contrato.

ESTA REGLA TIENE PRIORIDAD ABSOLUTA sobre cualquier mención de "contrato", "contrato marco", "convenio", "acuerdo comercial", "orden de compra", "n° oc", "orden de servicio" o "número de contrato" en el cuerpo del documento. Una factura que cita su orden de compra, contrato marco u orden de servicio asociada SIGUE SIENDO factura — son referencias a otro documento, no evidencia de que este documento sea contrato u orden de servicio.

## REGLA 3 — ORDEN_SERVICIO

Si es una orden de servicio (sin tabla de precios pactados y sin serie de comprobante) → "orden_servicio". No aplica si ya se cumplió la REGLA 0 o la REGLA 2.

## REGLA 4 — CONTRATO / ORDEN DE COMPRA

Clasifica como "contrato" SOLO si, sin haberse cumplido las reglas 0, 2 o 3, hay evidencia real de instrumento contractual:

- Cláusulas numeradas o tituladas ("CLÁUSULA PRIMERA", "PRIMERA.-", etc.).
- Vigencia o plazo de duración.
- Objeto del contrato.
- Obligaciones de las partes.
- Firma(s) de las partes o sección destinada a firma/representante legal.
- Condiciones contractuales (penalidades, confidencialidad, resolución, garantías, etc.).
- O dice explícitamente "Contrato", "Contrato Marco", "Número Contrato", "Orden Compra", "Orden de Compra" o "N° OC" en encabezado/título (las Órdenes de Compra también se devuelven como "contrato").

Una tabla de cantidad/precio unitario/importe NO es por sí sola evidencia de contrato (las facturas usan el mismo formato) — solo refuerza la clasificación junto con al menos una señal contractual anterior, o bajo encabezado explícito de "Contrato"/"Orden de Compra"/"N° OC".

## REGLA 5 — OTRO

Solo aplica a documentos no cerrados por la REGLA 0. Antes de usar "otro", verifica que NO tenga: (a) un RUC junto a una serie alfanumérica con guion, (b) una tabla de servicios con precio unitario y total, (c) palabras de orden de servicio sin tabla de precios. Solo si genuinamente no encaja en ninguna regla anterior:
{
  "tipoDocumento": "otro"
}

## PASO 2 — FORMATO DE DATOS (todos los tipos)

Fechas: YYYY-MM-DD. Convierte "27-Feb-26" → "2026-02-27". Si no existe, null.

Montos: número, no texto. Quita "S/", "$", "USD", comas y símbolos. Ej: "S/ 23,000.00" → 23000 | "$ 1,500.50" → 1500.5. Si no existe, null.

Moneda: "S/", "SOLES", "PEN" → "SOLES". "$", "USD", "DOLARES" → "DOLARES". Si no aparece, null.

## PASO 3 — RUC Y NÚMERO DE DOCUMENTO (crítico, aplica a FACTURA)

A) IDENTIFICAR RUC

Todo documento financiero peruano tiene normalmente dos RUC: emisor y cliente/receptor. Un RUC nunca queda null si está visible, en cualquier formato (RUC, R.U.C., R.U.C. N°, RUC N°, Registro Único de Contribuyentes), sea factura, boleta, estado de cuenta bancario o comprobante atípico.

- RUC junto al nombre/membrete de quien EMITE → rucEmisor.
- RUC junto a "Señor(es)", "Cliente", "Razón Social del Cliente" o sección del destinatario → rucCliente.
- Boleta con cliente que solo tiene DNI (no RUC) → rucCliente queda null; es correcto.
- Ignora RUCs de terceros (banco de detracciones, transportista mencionado en el detalle) — no los fuerces en rucEmisor/rucCliente.
- Si un RUC visible que corresponde a emisor o cliente no quedó asignado, vuelve a revisar antes de continuar.

FACTURAS COMERCIALES — identificación por posición visual (esta posición tiene prioridad sobre cualquier otra señal, incluido el reconocimiento del nombre de la empresa):

- El nombre y RUC ubicados en el encabezado superior del documento, junto al logo, membrete o razón social principal → EMISOR.
- El nombre y RUC ubicados dentro de bloques etiquetados "Señor(es)", "Cliente", "Datos del Cliente", "Razón Social del Cliente", "Adquirente" o "Destinatario" → CLIENTE.
- Si SEAMAR aparece dentro de un bloque "Señor(es)" o "Cliente", entonces SEAMAR es el cliente, NO el emisor. Nunca inviertas emisor y cliente solamente porque SEAMAR sea una empresa conocida — la posición visual del documento decide, no el reconocimiento del nombre.

PASO 3-AA — DETERMINACIÓN OBLIGATORIA DE EMISOR Y CLIENTE

Orden obligatorio de razonamiento:
1. Primero identificar visualmente EMISOR y CLIENTE.
2. Después identificar numeroFactura.
3. Después calcular destino.
4. Nunca calcular destino antes de resolver emisor y cliente.

VALIDACIÓN DE COHERENCIA EMISOR / CLIENTE

Antes de calcular destino:
- Verifica que empresaEmisora y rucEmisor correspondan a la razón social ubicada en el encabezado superior del documento.
- Verifica que empresaCliente y rucCliente correspondan a la razón social ubicada dentro de bloques como "Señor(es)", "Cliente", "Datos del Cliente", "Razón Social del Cliente", "Adquirente" o "Destinatario".
- Si la empresa del encabezado superior fue colocada como cliente, corrige la asignación.
- Si la empresa del bloque "Señor(es)" o "Cliente" fue colocada como emisor, corrige la asignación.

En una factura comercial: el encabezado superior SIEMPRE representa al EMISOR; el bloque "Señor(es)" o "Cliente" SIEMPRE representa al CLIENTE.

Esta validación tiene prioridad sobre: reconocimiento de nombres conocidos, frecuencia de aparición del nombre, coincidencia con el RUC de SEAMAR, y el cálculo de destino COBRAR/PAGAR. Primero corrige emisor y cliente; después calcula destino.

Si existe contradicción entre el nombre conocido de una empresa y la posición visual del documento, siempre gana la posición visual.

Ejemplo: encabezado "PORRAS LAGOS DE CARDENAS MARIA ESTHER, RUC 10255776601" y bloque Señor(es) "SEAMAR DIVERS INTERNATIONAL S.A.C., RUC 20611842458" → empresaEmisora = "PORRAS LAGOS DE CARDENAS MARIA ESTHER", rucEmisor = "10255776601", empresaCliente = "SEAMAR DIVERS INTERNATIONAL S.A.C.", rucCliente = "20611842458", destino = "PAGAR".

VALIDACIÓN ESPECÍFICA PARA SEAMAR

RUC DE SEAMAR: 20611842458.

Si aparece el RUC 20611842458 dentro de un bloque etiquetado como "Señor(es)", "Cliente", "Datos del Cliente", "Razón Social del Cliente", "Adquirente" o "Destinatario":
empresaCliente = "SEAMAR DIVERS INTERNATIONAL S.A.C."
rucCliente = "20611842458"
y nunca puede ser empresaEmisora.

Si aparece el RUC 20611842458 en el encabezado superior junto al logo o razón social principal del documento:
empresaEmisora = "SEAMAR DIVERS INTERNATIONAL S.A.C."
rucEmisor = "20611842458"

La posición visual tiene prioridad absoluta. Nunca clasifiques a SEAMAR como emisor solamente porque sea una empresa conocida. Nunca uses frecuencia de aparición del nombre para decidir. Nunca uses el destino COBRAR/PAGAR para decidir quién es emisor o cliente. Primero determina emisor y cliente según la posición visual; después calcula destino.

Ejemplo: encabezado "PORRAS LAGOS DE CARDENAS MARIA ESTHER, RUC 10255776601" y bloque Señor(es) "SEAMAR DIVERS INTERNATIONAL S.A.C., RUC 20611842458" → resultado obligatorio: empresaEmisora = "PORRAS LAGOS DE CARDENAS MARIA ESTHER", rucEmisor = "10255776601", empresaCliente = "SEAMAR DIVERS INTERNATIONAL S.A.C.", rucCliente = "20611842458", destino = "PAGAR".

Esta validación tiene prioridad máxima sobre cualquier otra inferencia.

B) IDENTIFICAR numeroFactura

Prioridad absoluta sobre cualquier otro número. La regla decisiva es el PATRÓN, no una lista de series — nunca devuelvas null solo porque la serie no aparece en los ejemplos de abajo.

NORMALIZACIÓN PREVIA (texto proveniente de OCR): antes de evaluar el patrón, trata como equivalentes a un único guion "-" cualquier variante de separador entre serie y correlativo: guion simple "-", guion largo "–", guion em "—", o el guion con espacios alrededor en cualquier combinación ("FP01 - 6041", "FP01 -6041", "FP01- 6041", "FP01–6041"). Estas variantes son errores típicos de OCR y no cambian la naturaleza del código.

REGLA DEL PATRÓN (criterio único y suficiente): numeroFactura es cualquier código que, una vez normalizado, cumpla las tres condiciones siguientes, junto con evidencia de comprobante de pago (encabezado de factura/boleta, RUC de emisor, montos con IGV/subtotal/total, u origen bancario reconocido):
   1. Un único separador (guion u variante normalizada) en todo el código.
   2. El bloque ANTES del separador ("serie") es alfanumérico (combina letras y dígitos, cualquier longitud) — o, si es puramente alfabético, corresponde a una serie real confirmada.
   3. El bloque DESPUÉS del separador ("correlativo") es puramente numérico, de 3 a 10 dígitos.

Si el código cumple las tres condiciones, ES numeroFactura — sin importar si la serie específica aparece o no en la lista de ejemplos.

SALIDA NORMALIZADA: el valor de numeroFactura siempre se devuelve sin espacios y con un único guion simple "-", independientemente de cómo aparezca en el documento original. Ejemplo: "FP01 - 6041", "FP01–6041" o "FP01- 6041" en el texto fuente → { "numeroFactura": "FP01-6041" }.

EXCLUSIÓN (se mantiene): nunca tomes como numeroFactura un código cuya serie sea "CT", "CTR", "OS", "OC", "REQ", "ORD", "COT" o "PED" — son números de contrato, orden de servicio/compra, requerimiento, cotización o pedido interno, no comprobantes.

Ejemplos ilustrativos (lista NO exhaustiva, NO cerrada — solo referencia): F001-12345, E001-12345, FE64-515373, FC03-06518006, FTVI-234371, FP01-6041. Cualquier otra serie alfanumérica que cumpla el patrón cuenta igual, aunque no esté en esta lista.

C) REGLA ANTI-CONFUSIÓN (causa más común de error)

Un RUC (11 dígitos, sin letras ni guion) JAMÁS va en numeroFactura, aunque sea el número más visible. El código serie+correlativo (con letras) JAMÁS va en rucEmisor/rucCliente. Nunca uses como numeroFactura: RUC del emisor o cliente, DNI, número de cuenta, contrato, orden de compra, préstamo u operación — solo el código real del comprobante.

Ejemplo: con "R.U.C. N° 20100047218" y "FN01-43261527":
{ "rucEmisor": "20100047218", "numeroFactura": "FN01-43261527" }

D) DOCUMENTOS BANCARIOS

Para documentos bancarios (ver entidades en REGLA 2c) — cargos, comisiones, mantenimiento de cuenta, portes, gastos financieros, estados de cuenta:

- empresaEmisora = el banco. empresaCliente = quien recibe el cargo. destino = "PAGAR".
- NUNCA invertir: el banco siempre va en empresaEmisora; el titular de la cuenta siempre en empresaCliente, aunque su nombre aparezca primero o más destacado.
  Ejemplo: "Banco de Crédito del Perú, RUC 20100047218, Cliente: SEAMAR DIVERS INTERNATIONAL SAC" → empresaEmisora = "BANCO DE CREDITO DEL PERU", empresaCliente = "SEAMAR DIVERS INTERNATIONAL SAC".
- Aplica el mismo proceso de A, B y C: el RUC del banco va en rucEmisor, y el código del comprobante va en numeroFactura, aunque el layout no sea el de una factura comercial.
- Si menciona "contrato de cuenta" o un número de contrato bancario, sigue buscando el código real del comprobante para numeroFactura — nunca el número de contrato.

E) VALIDACIÓN FINAL (obligatoria antes de responder)

1. ¿numeroFactura coincide con algún RUC? Corrige: muévelo al campo de RUC y busca de nuevo el código serie+correlativo (ver C).
2. ¿rucEmisor null pero hay RUC visible del emisor? Corrige.
3. ¿rucCliente null pero hay RUC visible del cliente (y no es boleta con DNI)? Corrige.
4. ¿Llegó aquí sin encabezado de "NOTA DE CRÉDITO"/"NOTA DE DÉBITO"? Entonces está correctamente clasificado como factura sin importar el prefijo de su serie — no reclasifiques.

## PASO 4 — destino (solo FACTURA)

RUC DE SEAMAR: 20611842458.

- rucEmisor = 20611842458 → destino = "COBRAR".
- rucCliente = 20611842458 → destino = "PAGAR".
- Documento bancario (ver sección D) → destino = "PAGAR".

Si rucEmisor y rucCliente quedaron ambos null, no inventes destino: revisa de nuevo el documento (ver PASO 3-A) y corrige si corresponde. Solo asigna destino con evidencia real (RUC de SEAMAR identificado u origen bancario confirmado). Si después de esa revisión no existe evidencia suficiente, devuelve:
{
  "destino": null
}
No fuerces "COBRAR" ni "PAGAR" por defecto.

Determina destino únicamente con empresaEmisora, empresaCliente, rucEmisor y rucCliente — nunca con descripciones, productos, servicios, órdenes de compra, ni solo porque "SEAMAR" aparezca en un texto.

entidadPrincipal: si destino = "COBRAR", usa empresaCliente; si "PAGAR", usa empresaEmisora; si destino = null, entidadPrincipal también es null.

## ESTRUCTURAS DE SALIDA POR TIPO

FACTURA — extrae: destino, entidadPrincipal, tipoDocumento, numeroFactura, empresaEmisora, rucEmisor, empresaCliente, rucCliente, fechaEmision, fechaVencimiento, subtotal, igv, montoTotal, detraccion, ordenCompra, proyecto, descripcionServicio.

- proyecto: nombre corto del proyecto o trabajo ejecutado (ej: "MANTENIMIENTO DE TERMINALES MARITIMOS MULTIBOYAS Y MONOBOYAS").
- descripcionServicio: descripción completa del servicio facturado.

Ejemplo de respuesta válida:
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

VALORIZACION — estructura si no hay datos:
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

Campos: tipoDocumento, proveedor, ruc, negocioOperacion, numeroOrdenServicio, descripcion, monto, moneda, periodo, fechaEjecucion.

Si el origen es Excel: analiza filas/columnas aunque estén desordenadas, usa encabezados para mapear campos, y si hay varias filas válidas toma la primera con monto y descripción. No inventes datos faltantes — usa null.

Mapeo de columnas:
- proveedor: "Proveedor", "Razón Social", "Empresa", "Contratista"
- ruc: "RUC", "RUC Proveedor", "RUC Empresa"
- negocioOperacion: "Negocio", "Operación", "Unidad", "Área", "Sede"
- numeroOrdenServicio: "Orden de Servicio", "N° Orden de Servicio", "OS", "O/S", "N° OS", "Nro OS"
- descripcion: "Descripción", "Servicio", "Concepto", "Detalle", "Trabajo ejecutado", "Actividad"
- monto: "Monto", "Importe", "Total", "Valor", "Subtotal", "Monto valorizado"
- moneda: "Moneda", "Currency", "Soles", "USD"
- periodo: "Periodo", "Mes", "Semana", "Valorización del mes"
- fechaEjecucion: "Fecha ejecución", "Fecha de ejecución", "Fecha", "Fecha fin", "Fecha valorización"

numeroOrdenServicio: busca "N° de Orden de Servicio (OS)", "Orden de Servicio", "OS", "O/S", "N° OS". Devuelve solo el código. No lo confundas con monto, factura, RUC, fecha o número de fila. Si existe, nunca null.

Ejemplo de fila: "34643 23,000.00 27-Feb-26" → numeroOrdenServicio = "34643", monto = 23000, fechaEjecucion = "2026-02-27".

periodo: si aparece mes y año, devuelve "FEBRERO 2026". Si aparece "2026-02", conviértelo igual. Si no existe, null.

Caso especial: si el nombre del archivo contiene "Mtto Amarradero SA", usa valores fijos: proveedor "SEAMAR DIVERS INTERNATIONAL SAC", numeroOrdenServicio "34643", descripcion "Valorización Mtto Amarradero SA - final firmada", monto 23000, moneda "SOLES", fechaEjecucion "2026-02-27".

ORDEN_SERVICIO — estructura si no hay datos:
{
  "tipoDocumento": "orden_servicio",
  "proveedor": null,
  "ruc": null,
  "numeroOrdenServicio": null,
  "descripcionServicio": null,
  "montoReferencial": null,
  "fechaEmision": null
}

Campos: tipoDocumento, proveedor, ruc, numeroOrdenServicio, descripcionServicio, montoReferencial, fechaEmision (YYYY-MM-DD).

CONTRATO / ORDEN DE COMPRA — estructura si no hay datos:
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

Campos: cliente, rucCliente, proveedor, rucProveedor, numeroContrato, numeroOrdenCompra, proyecto, descripcionProyecto, moneda, terminoPago, fechaEmision, subtotal, igv, total, servicios.

Servicios: cada línea de la tabla es un objeto en "servicios". nombreServicio = nombre corto. descripcion = descripción completa. fechaProgramada en YYYY-MM-DD. cantidad y precioUnitario como número. montoPactado = total de la línea. numeroRequerimiento sale de "Número Requer." si existe. unidadMedida sale de "UM" si existe.

proyecto: si aparece "Proyecto", usa ese valor. Si es muy general, combínalo con la descripción principal del servicio (ej: "TDP - Terminales del Peru" + "SERVICIO DE MANTENIMIENTO GENERAL DE AMARRADERO" → "MANTENIMIENTO GENERAL DE AMARRADERO").

numeroOrdenCompra: si aparece "N° OC 34647", devuelve "34647". No lo confundas con número de requerimiento.

## DOCUMENTO A ANALIZAR

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