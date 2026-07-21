// Usamos 127.0.0.1 en lugar de localhost para evitar
// resolución DNS innecesaria y posibles issues con
// IPv6 en entornos Windows/Linux.
const OCR_SERVICE_URL =
  process.env.OCR_SERVICE_URL || "http://127.0.0.1:8000";

const OCR_TIMEOUT_MS = 5 * 60 * 1000;

interface OcrResponse {
  ok: boolean;
  texto?: string;
  error?: string;
}

export async function leerPdfConOCR(buffer: Buffer): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

  try {
    const response = await fetch(`${OCR_SERVICE_URL}/ocr`, {
      method: "POST",
      headers: { "Content-Type": "application/pdf" },
      body: new Uint8Array(buffer),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `OCR Service respondió con status ${response.status}`
      );
    }

    const data: OcrResponse = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Error desconocido del OCR Service");
    }

    return data.texto ?? "";
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error("Timeout del OCR Service - no respondió en 5 minutos");
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
