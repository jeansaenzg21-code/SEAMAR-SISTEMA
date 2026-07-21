import { leerPdfConOCR as clientOcr, type OcrTiming } from "./ocr-client";

export async function leerPdfConOCR(
  buffer: Buffer,
  docId?: string
): Promise<{ texto: string; timing: OcrTiming }> {
  return clientOcr(buffer, docId);
}
