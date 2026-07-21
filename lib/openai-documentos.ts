import OpenAI from "openai";
import { leerPdf } from "./pdf-reader";
import * as XLSX from "xlsx";
import { FACTURA_PROMPT } from "./ai/factura-prompt";
import { VALORIZACION_PROMPT } from "./ai/valorizacion-prompt";
import { CONTRATO_PROMPT } from "./ai/contrato-prompt";
import { leerPdfConOCR } from "./pdf-ocr";
import { extraerCampos, mergeResultados } from "./document-parser";
import crypto from "crypto";
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
  promptPersonalizado?: string
  
) {

  const nombre = nombreArchivo.toLowerCase();

  console.time("pdf_hash")
  const hashArchivo = crypto
  .createHash("sha256")
  .update(buffer)
  .digest("hex");
  console.timeEnd("pdf_hash")

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

    console.time("pdf_ocr")
    textoDocumento = await leerPdfConOCR(buffer);
    console.timeEnd("pdf_ocr")

    console.log(
      `OCR terminó correctamente. Caracteres: ${textoDocumento.length}`
    );

  } catch (error) {

    console.error(
      "Error ejecutando OCR:",
      error
    );

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

console.time("openai_llamada")
const response = await openai.responses.create({
  model: process.env.OPENAI_MODEL || "gpt-5-mini",
  input: `
${prompt}

EL NOMBRE DEL ARCHIVO ES: ${nombreArchivo}

## DOCUMENTO A ANALIZAR

${textoDocumento}
`,
});
console.timeEnd("openai_llamada")


      const resultado = parsearJson(
  response.output_text ?? "{}"
);

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

return resultado;

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
