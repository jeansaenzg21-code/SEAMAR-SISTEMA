import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { PythonShell } from "python-shell";
import { leerPdfConOCR as clientOcr, type OcrTiming } from "./ocr-client";
import { resolvePythonPath } from "./python";

function extraerJsonSalida(salida: string[]): any {
  const texto = salida.join("");
  const inicio = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  if (inicio === -1 || fin === -1 || fin < inicio) {
    throw new Error(`Salida del OCR local no contiene JSON válido: ${texto.substring(0, 300)}`);
  }
  return JSON.parse(texto.substring(inicio, fin + 1));
}

async function ocrLocalPython(
  buffer: Buffer,
  docId?: string
): Promise<{ texto: string; timing: OcrTiming }> {
  const ruta = join(tmpdir(), `ocr_${randomUUID()}.pdf`);
  await writeFile(ruta, buffer);

  try {
    const salida = await PythonShell.run("python/pdf_ocr.py", {
      pythonPath: resolvePythonPath(),
      args: [ruta],
    });

    const json = extraerJsonSalida(salida);

    if (!json.ok) {
      throw new Error(json.error || "Error del OCR local (Python)");
    }

    console.log(
      `[${docId ?? "locally"}] OCR local (Python) terminó | Caracteres: ${(json.texto ?? "").length}`
    );

    return {
      texto: json.texto ?? "",
      timing: { queue_wait_ms: 0, ocr_ms: 0 },
    };
  } finally {
    await unlink(ruta).catch(() => {});
  }
}

export async function leerPdfConOCR(
  buffer: Buffer,
  docId?: string
): Promise<{ texto: string; timing: OcrTiming }> {
  try {
    return await clientOcr(buffer, docId);
  } catch (error: any) {
    console.error(
      `[${docId ?? "locally"}] OCR Service HTTP falló, usando OCR local:`,
      error?.message ?? error
    );
    return ocrLocalPython(buffer, docId);
  }
}