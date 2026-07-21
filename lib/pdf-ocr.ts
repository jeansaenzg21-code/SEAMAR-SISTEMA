import { leerPdfConOCR as clientOcr } from "./ocr-client";

export async function leerPdfConOCR(
  buffer: Buffer
): Promise<string> {
  return clientOcr(buffer);
}
