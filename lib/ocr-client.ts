// Usamos 127.0.0.1 en lugar de localhost para evitar
// resolución DNS innecesaria y posibles issues con
// IPv6 en entornos Windows/Linux.
const OCR_SERVICE_URL =
  process.env.OCR_SERVICE_URL || "http://127.0.0.1:8000";

const OCR_TIMEOUT_MS = parseInt(
  process.env.OCR_TIMEOUT_MS || String(10 * 60 * 1000),
  10
);

export interface OcrTiming {
  queue_wait_ms: number;
  ocr_ms: number;
}

interface OcrResponse {
  ok: boolean;
  texto?: string;
  error?: string;
  queue_wait_ms?: number;
  ocr_ms?: number;
}

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export function contentTypeParaArchivo(nombreArchivo: string): string | null {
  const ext = nombreArchivo.split(".").pop()?.toLowerCase() || "";
  return CONTENT_TYPES[ext] ?? null;
}

export type TipoDocumentoDetectado = "PDF_TEXTO" | "PDF_ESCANEADO" | "IMAGEN";

export interface DeteccionDocumento {
  tipo: TipoDocumentoDetectado;
  texto: string;
  timing: OcrTiming;
}

interface DeteccionResponse {
  ok: boolean;
  tipo?: TipoDocumentoDetectado;
  texto?: string;
  error?: string;
  queue_wait_ms?: number;
  ocr_ms?: number;
}

async function peticionOCR(
  buffer: Buffer,
  docId: string | undefined,
  contentType: string,
  ruta: string
): Promise<{ ok: boolean; json: any }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      "Content-Type": contentType,
    };
    if (docId) headers["X-Document-Id"] = docId;

    const response = await fetch(`${OCR_SERVICE_URL}${ruta}`, {
      method: "POST",
      headers,
      body: new Uint8Array(buffer),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(
        `OCR Service respondió con status ${response.status}`
      );
      (error as any).status = response.status;
      throw error;
    }

    return { ok: true, json: await response.json() };
  } catch (error: any) {
    if (error.name === "AbortError") {
      const timeoutSec = OCR_TIMEOUT_MS / 1000;
      throw new Error(
        `Timeout del OCR Service - no respondió en ${timeoutSec} segundos`
      );
    }

    if (error.cause?.code === "ECONNREFUSED" || error.message?.includes("fetch failed")) {
      throw new Error(
        `OCR Service no disponible en ${OCR_SERVICE_URL} - verifica que el servicio esté corriendo`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function leerPdfConOCR(
  buffer: Buffer,
  docId?: string,
  contentType: string = "application/pdf"
): Promise<{ texto: string; timing: OcrTiming }> {
  const { json } = await peticionOCR(buffer, docId, contentType, "/ocr");

  const data: OcrResponse = json;

  if (!data.ok) {
    throw new Error(data.error || "Error desconocido del OCR Service");
  }

  return {
    texto: data.texto ?? "",
    timing: {
      queue_wait_ms: data.queue_wait_ms ?? 0,
      ocr_ms: data.ocr_ms ?? 0,
    },
  };
}

export async function procesarDocumento(
  buffer: Buffer,
  docId?: string,
  contentType: string = "application/pdf"
): Promise<DeteccionDocumento> {
  const { json } = await peticionOCR(
    buffer,
    docId,
    contentType,
    "/procesar-documento"
  );

  const data: DeteccionResponse = json;

  if (!data.ok || !data.tipo) {
    throw new Error(data.error || "Error desconocido del OCR Service");
  }

  return {
    tipo: data.tipo,
    texto: data.texto ?? "",
    timing: {
      queue_wait_ms: data.queue_wait_ms ?? 0,
      ocr_ms: data.ocr_ms ?? 0,
    },
  };
}
