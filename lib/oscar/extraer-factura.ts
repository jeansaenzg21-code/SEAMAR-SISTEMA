import OpenAI from "openai";
import crypto from "crypto";
import { leerPdf } from "@/lib/pdf-reader";
import { leerPdfConOCR, contentTypeParaArchivo } from "@/lib/ocr-client";
import { extraerCampos } from "@/lib/document-parser";
import { OSCAR_FACTURA_PROMPT } from "@/lib/ai/oscar-factura-prompt";
import type {
  CabeceraFactura,
  LineaFactura,
  OrigenFactura,
} from "./types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const EXTENSIONES_VALIDAS = ["pdf", "jpg", "jpeg", "png"];

export interface ResultadoExtraccion {
  origen: OrigenFactura;
  texto: string;
  hashArchivo: string;
  cabecera: CabeceraFactura;
  lineas: LineaFactura[];
}

function validarExtension(nombreArchivo: string): string {
  const ext = nombreArchivo.split(".").pop()?.toLowerCase() || "";
  if (!EXTENSIONES_VALIDAS.includes(ext)) {
    throw new Error(
      `Formato no permitido (${ext || "desconocido"}). Solo se aceptan PDF, JPG, JPEG y PNG.`
    );
  }
  return ext;
}

function parsearJson(texto: string): any {
  let limpio = texto;
  limpio = limpio.replace(/```json/g, "");
  limpio = limpio.replace(/```/g, "");
  limpio = limpio.trim();
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (inicio !== -1 && fin !== -1 && fin > inicio) {
    limpio = limpio.slice(inicio, fin + 1);
  }
  return JSON.parse(limpio);
}

function normalizarMoneda(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const v = valor.trim().toUpperCase();
  if (/USD|US\$|\$|DOLAR|DÓLAR/.test(v)) return "DOLARES";
  if (/PEN|SOL|S\//.test(v)) return "SOLES";
  return valor.trim();
}

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(String(valor).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function texto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const t = String(valor).trim();
  if (!t || t === "-" || t === "—") return null;
  return t;
}

function arregloLineas(valor: unknown): any[] {
  if (Array.isArray(valor)) return valor;
  return [];
}

function mapearLinea(linea: any): LineaFactura {
  return {
    codigo: texto(linea?.codigo) ?? null,
    cantidad: numero(linea?.cantidad),
    unidad: texto(linea?.unidad) ?? null,
    descripcion: texto(linea?.descripcion) ?? null,
    valorUnitario: numero(linea?.valorUnitario ?? linea?.valor_unitario),
    descuento: numero(linea?.descuento),
    valorVenta: numero(linea?.valorVenta ?? linea?.valor_venta),
  };
}

function normalizarResultado(raw: any): {
  cabecera: CabeceraFactura;
  lineas: LineaFactura[];
} {
  return {
    cabecera: {
      rucEmisor: texto(raw?.rucEmisor) ?? null,
      razonSocialEmisor: texto(raw?.razonSocialEmisor) ?? null,
      rucCliente: texto(raw?.rucCliente) ?? null,
      razonSocialCliente: texto(raw?.razonSocialCliente) ?? null,
      numeroDocumento: texto(raw?.numeroDocumento) ?? null,
      fechaEmision: texto(raw?.fechaEmision) ?? null,
      fechaVencimiento: texto(raw?.fechaVencimiento) ?? null,
      moneda: normalizarMoneda(raw?.moneda),
      condicionPago: texto(raw?.condicionPago) ?? null,
      ordenCompra: texto(raw?.ordenCompra) ?? null,
      guiaRemision: texto(raw?.guiaRemision) ?? null,
      subtotal: numero(raw?.subtotal),
      igv: numero(raw?.igv),
      total: numero(raw?.total ?? raw?.montoTotal),
    },
    lineas: arregloLineas(raw?.detalle)
      .filter((l) => l && typeof l === "object")
      .map(mapearLinea)
      .filter(
        (l) =>
          l.descripcion ||
          l.codigo ||
          l.valorVenta !== null ||
          l.cantidad !== null
      ),
  };
}

function construirFallback(texto: string): {
  cabecera: CabeceraFactura;
  lineas: LineaFactura[];
} {
  const auto = extraerCampos(texto);

  return {
    cabecera: {
      rucEmisor: auto.rucEmisor,
      razonSocialEmisor: null,
      rucCliente: auto.rucCliente,
      razonSocialCliente: null,
      numeroDocumento: auto.numeroFactura,
      fechaEmision: auto.fechaEmision,
      fechaVencimiento: null,
      moneda: auto.moneda ? normalizarMoneda(auto.moneda) : null,
      condicionPago: null,
      ordenCompra: null,
      guiaRemision: null,
      subtotal: null,
      igv: null,
      total: auto.montoTotal,
    },
    lineas: [],
  };
}

export async function extraerFacturaOscar(
  buffer: Buffer,
  nombreArchivo: string
): Promise<ResultadoExtraccion> {
  const ext = validarExtension(nombreArchivo);
  const esPdf = ext === "pdf";

  const docId = `OSCAR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const hashArchivo = crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");

  let textoDocumento = "";
  let origen: OrigenFactura;

  if (esPdf) {
    textoDocumento = await leerPdf(buffer);

    if (textoDocumento.trim().length < 100) {
      const ocrResult = await leerPdfConOCR(buffer, docId, "application/pdf");
      textoDocumento = ocrResult.texto;
      origen = "PDF_ESCANEADO";
    } else {
      origen = "PDF_TEXTO";
    }
  } else {
    const contentType = contentTypeParaArchivo(nombreArchivo);
    if (!contentType) {
      throw new Error("Formato de imagen no soportado.");
    }
    const ocrResult = await leerPdfConOCR(buffer, docId, contentType);
    textoDocumento = ocrResult.texto;
    origen = "IMAGEN";
  }

  if (textoDocumento.trim().length < 50) {
    throw new Error(
      "No se pudo leer el contenido del documento. Verifica que la factura sea legible."
    );
  }

  let resultado: { cabecera: CabeceraFactura; lineas: LineaFactura[] } =
    construirFallback(textoDocumento);

  try {
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      input: `
${OSCAR_FACTURA_PROMPT}

EL NOMBRE DEL ARCHIVO ES: ${nombreArchivo}

## DOCUMENTO A ANALIZAR

${textoDocumento}
`,
    });

    const raw = parsearJson(response.output_text ?? "{}");
    resultado = normalizarResultado(raw);
  } catch (error) {
    console.error("[OSCAR] Error con IA de extracción, usando fallback:", error);
  }

  return {
    origen,
    texto: textoDocumento,
    hashArchivo,
    cabecera: resultado.cabecera,
    lineas: resultado.lineas,
  };
}
