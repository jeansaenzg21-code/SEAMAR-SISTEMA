import { leerPdf } from "@/lib/pdf-reader";
import {
  contentTypeParaArchivo,
  leerPdfConOCR,
  procesarDocumento,
} from "@/lib/ocr-client";
import type { OrigenFactura } from "./types";

export interface DeteccionResultado {
  tipo: OrigenFactura;
  texto: string;
  ocrActivado: boolean;
}

function validarExtension(nombreArchivo: string): string {
  const ext = nombreArchivo.split(".").pop()?.toLowerCase() || "";
  if (!["pdf", "jpg", "jpeg", "png"].includes(ext)) {
    throw new Error(
      `Formato no permitido (${ext || "desconocido"}). Solo se aceptan PDF, JPG, JPEG y PNG.`
    );
  }
  return ext;
}

function esServicioAntiguo(error: any): boolean {
  return error?.status === 404;
}

const CAMPOS_FACTURA_RE =
  /RUC|FACTURA|BOLETA|FECHA DE EMISI[ÓO]N|F\.?\s*EMISI|TOTAL|IMPORTE TOTAL|IGV|SUB\s*TOTAL|SUBTOTAL|MONEDA|SOLES|DOLARES|D[ÓO]LARES|USD|S\/|CONDICI[ÓO]N DE PAGO/i;

const CLAVES_TABLA_RE =
  /C[ÓO]DIGO|COD\.|CANT\.|CANTIDAD|QUANTITY|UNIDAD|UNID\.|DESCRIPCI[ÓO]N|CONCEPTO|DETALLE|V\.?\s*UNIT\.|VALOR UNITARIO|COSTO UNITARIO|P\.?\s*UNIT\.|PRECIO UNITARIO|DSCTO\.|DESCUENTO|V\.?\s*VENTA|VALOR (DE )?VENTA|IMPORTE|PRECIO/i;

const MONTO_RE = /\d{1,3}(?:[,.]\d{3})*[.,]\d{2}/g;

interface AnalisisTexto {
  caracteres: number;
  palabras: number;
  camposFactura: boolean;
  clavesTabla: boolean;
  montos: number;
}

function analizarCalidadTexto(texto: string): AnalisisTexto {
  const limpio = texto.trim();
  return {
    caracteres: limpio.length,
    palabras: limpio.split(/\s+/).filter(Boolean).length,
    camposFactura: CAMPOS_FACTURA_RE.test(texto),
    clavesTabla: CLAVES_TABLA_RE.test(texto),
    montos: (texto.match(MONTO_RE) || []).length,
  };
}

function textoEsSuficiente(texto: string): boolean {
  const analisis = analizarCalidadTexto(texto);

  console.log(
    `[DETECCION] respaldo | caracteres=${analisis.caracteres} | ` +
      `palabras=${analisis.palabras} | camposFactura=${analisis.camposFactura} | ` +
      `clavesTabla=${analisis.clavesTabla} | montos=${analisis.montos}`
  );

  if (
    analisis.caracteres < 80 &&
    analisis.palabras < 40
  ) {
    return false;
  }

  // Texto de cabecera pero SIN claves de tabla: la tabla está en una imagen.
  if (analisis.camposFactura && !analisis.clavesTabla) {
    return false;
  }

  return (
    analisis.camposFactura &&
    analisis.clavesTabla &&
    analisis.montos >= 1
  );
}

export async function detectarTipoDocumento(
  buffer: Buffer,
  nombreArchivo: string,
  docId: string
): Promise<DeteccionResultado> {
  const ext = validarExtension(nombreArchivo);

  if (ext === "jpg" || ext === "jpeg" || ext === "png") {
    const contentType = contentTypeParaArchivo(nombreArchivo);
    if (!contentType) {
      throw new Error("Formato de imagen no soportado.");
    }
    const ocrResult = await leerPdfConOCR(buffer, docId, contentType);
    return {
      tipo: "IMAGEN",
      texto: ocrResult.texto,
      ocrActivado: true,
    };
  }

  try {
    const resultado = await procesarDocumento(
      buffer,
      docId,
      "application/pdf"
    );
    return {
      tipo: resultado.tipo,
      texto: resultado.texto,
      ocrActivado: resultado.tipo === "PDF_ESCANEADO",
    };
  } catch (error: any) {
    if (!esServicioAntiguo(error)) throw error;

    console.log(
      "[DOCUMENTO] Servicio OCR sin /procesar-documento, usando detección de respaldo..."
    );

    const texto = await leerPdf(buffer);

    if (!textoEsSuficiente(texto)) {
      const ocrResult = await leerPdfConOCR(
        buffer,
        docId,
        "application/pdf"
      );
      return {
        tipo: "PDF_ESCANEADO",
        texto: ocrResult.texto,
        ocrActivado: true,
      };
    }

    return { tipo: "PDF_TEXTO", texto, ocrActivado: false };
  }
}
