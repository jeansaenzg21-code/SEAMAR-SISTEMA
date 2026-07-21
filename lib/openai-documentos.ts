import OpenAI from "openai";
import { leerPdf } from "./pdf-reader";
import * as XLSX from "xlsx";
import { FACTURA_PROMPT } from "./ai/factura-prompt";
import { VALORIZACION_PROMPT } from "./ai/valorizacion-prompt";
import { CONTRATO_PROMPT } from "./ai/contrato-prompt";
import { leerPdfConOCR } from "./pdf-ocr";
import { extraerCampos, mergeResultados } from "./document-parser";
import { DocTiming } from "./instrumentation";
import crypto from "crypto";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function parsearJson(
  texto: string
) {

  console.log("[parsearJson] texto=", texto, "| type=", typeof texto);
  const limpio =
    texto
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

  console.log("[parsearJson] limpio=", limpio, "| type=", typeof limpio);
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

function obtenerPrompt(
  tipo: "factura" | "valorizacion" | "contrato"
) {
  switch (tipo) {
    case "factura":
      return FACTURA_PROMPT;
    case "valorizacion":
      return VALORIZACION_PROMPT;
    case "contrato":
      return CONTRATO_PROMPT;

    default:
      throw new Error(`Tipo no soportado: ${tipo}`);
  }
}

export async function procesarDocumento(
  buffer: Buffer,
  nombreArchivo: string,
  tipo: "factura" | "valorizacion" | "contrato",
  promptPersonalizado?: string,
  timing?: DocTiming
  
) {

  const nombre = nombreArchivo.toLowerCase();

  const docId = timing?.docId ?? `DOC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const t = timing ?? new DocTiming(docId);

  t.start("Hash");
  const hashArchivo = crypto
  .createHash("sha256")
  .update(buffer)
  .digest("hex");
  t.end("Hash");

const esExcel =
  nombre.endsWith(".xlsx") ||
  nombre.endsWith(".xls") ||
  nombre.endsWith(".csv");

  let textoDocumento = "";

if (esExcel) {
  textoDocumento = leerExcel(buffer);
} else {
  console.time("pdf_lectura")
  textoDocumento = await leerPdf(buffer);
  console.timeEnd("pdf_lectura")
}

const esEscaneado = textoDocumento.trim().length < 100;

const esPdf =
  nombre.endsWith(".pdf");

console.log("ES ESCANEADO:", esEscaneado);
console.log("TEXTO EXTRAIDO:", textoDocumento.length);

  if (esPdf && esEscaneado) {

  console.log(
    `PDF escaneado detectado: ${nombreArchivo}`
  );

  try {

    t.start("OCR");
    const ocrResult = await leerPdfConOCR(buffer, docId);
    textoDocumento = ocrResult.texto;
    t.end("OCR");

    console.log(
      `[${docId}] OCR terminó | Caracteres: ${textoDocumento.length} | ` +
      `Cola: ${ocrResult.timing.queue_wait_ms}ms | OCR: ${ocrResult.timing.ocr_ms}ms`
    );

  } catch (error) {

    console.error(
      `[${docId}] Error ejecutando OCR:`,
      error
    );
    console.error("===== STACK OCR =====");
    console.error(error?.stack);

    t.log("ERROR_OCR");
    throw error;

  }

  }

let autoParsed = null;

if (tipo === "factura" && textoDocumento.trim().length >= 50) {
  console.time("extraccion_automatica")
  autoParsed = extraerCampos(textoDocumento);
  console.timeEnd("extraccion_automatica")

  const camposEncontrados = (Object.entries(autoParsed) as [string, unknown][])
    .filter(([_, v]) => v !== null && v !== undefined)
    .map(([k]) => k);

  console.log(
    "Extracción automática:",
    camposEncontrados.length > 0
      ? camposEncontrados.join(", ")
      : "ningún campo detectado"
  );
}

  let ultimoError: any;

  for (
    let intento = 1;
    intento <= 3;
    intento++
  ) {

    try {

      const prompt = promptPersonalizado ?? obtenerPrompt(tipo);

      console.log("================================");
console.log("LONGITUD DEL TEXTO:", textoDocumento.length);
console.log(textoDocumento.substring(0, 1000));
console.log("================================");

console.log("========== TEXTO EXTRAÍDO ==========");
console.log(textoDocumento);
console.log("====================================");

t.start("OpenAI");
const response = await openai.responses.create({
  model: process.env.OPENAI_MODEL || "gpt-5-mini",
  input: `
${prompt}

EL NOMBRE DEL ARCHIVO ES: ${nombreArchivo}

## DOCUMENTO A ANALIZAR

${textoDocumento}
`,
});
t.end("OpenAI");


      console.log("===== OPENAI RESPONSE =====");
      console.dir(response, { depth: null });
      console.log("===== OUTPUT_TEXT =====");
      console.log("type:", typeof response.output_text);
      console.log("length:", typeof response.output_text === "string" ? response.output_text.length : "N/A");
      console.log("first 500 chars:", typeof response.output_text === "string" ? response.output_text.substring(0, 500) : response.output_text);

      console.log("===== ANTES PARSE =====");
      console.log("output_text raw:", response.output_text);
      console.log("output_text typeof:", typeof response.output_text);

      const resultado = parsearJson(
  response.output_text ?? "{}"
);

      console.log("===== JSON PARSEADO =====");
      console.dir(resultado, { depth: null });
      console.log("numeroFactura:", resultado.numeroFactura);
      console.log("serie:", resultado.serie);
      console.log("correlativo:", resultado.correlativo);
      console.log("rucEmisor:", resultado.rucEmisor);
      console.log("rucCliente:", resultado.rucCliente);
      console.log("tipoDocumento:", (resultado as any).tipoDocumento);
      console.log("montoTotal:", resultado.montoTotal);
      console.log("moneda:", resultado.moneda);
      console.log("fechaEmision:", resultado.fechaEmision);
      console.log("fechaVencimiento:", resultado.fechaVencimiento);
      console.log("empresaEmisora:", resultado.empresaEmisora);
      console.log("empresaCliente:", resultado.empresaCliente);
      console.log("entidadPrincipal:", resultado.entidadPrincipal);
      console.log("destino:", resultado.destino);

// ===============================
// VALIDACIÓN DEL DESTINO
// ===============================

const RUC_EMPRESA = "20611842458";

if (tipo === "factura") {

  if (resultado.rucCliente === RUC_EMPRESA) {
    resultado.destino = "PAGAR";
  }

  if (resultado.rucEmisor === RUC_EMPRESA) {
    resultado.destino = "COBRAR";
  }

}

console.log("==================================");
console.log("JSON DEVUELTO POR OPENAI");
console.log(JSON.stringify(resultado, null, 2));
console.log("==================================");

if (autoParsed && tipo === "factura") {
  const antes = { ...resultado };
  const resultadoFinal = mergeResultados(resultado, autoParsed);

  const camposCompletados = Object.keys(resultadoFinal)
    .filter((k) => {
      const antesVal = (antes as Record<string, unknown>)[k];
      const despuesVal = (resultadoFinal as Record<string, unknown>)[k];
      return (
        (antesVal === null || antesVal === undefined || antesVal === "") &&
        despuesVal !== null &&
        despuesVal !== undefined &&
        despuesVal !== ""
      );
    });

  if (camposCompletados.length > 0) {
    console.log(
      "Fusión híbrida - campos completados:",
      camposCompletados.join(", ")
    );
  }

  Object.assign(resultado, resultadoFinal);
}

resultado.hashArchivo = hashArchivo;

t.log("OK");
return resultado;

    } catch (error: any) {

      ultimoError = error;

      console.log(
  `OpenAI intento ${intento} falló`
);

      console.error("===== ERROR COMPLETO =====");
      console.error(error);
      console.error(error?.stack);

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
