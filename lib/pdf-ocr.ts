import { execFile } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

export async function leerPdfConOCR(
  buffer: Buffer
): Promise<string> {
  const archivoTemporal = path.join(
    os.tmpdir(),
    `ocr-${Date.now()}.pdf`
  );

  await fs.writeFile(archivoTemporal, buffer);

  try {
    const texto = await new Promise<string>((resolve, reject) => {
      execFile(
        process.env.PYTHON_EXECUTABLE || "py",
        ["python/pdf_ocr.py", archivoTemporal],
        {
          maxBuffer: 1024 * 1024 * 100,
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(stderr || error.message);
            return;
          }

          try {
            const resultado = JSON.parse(stdout);

            if (!resultado.ok) {
              reject(resultado.error);
              return;
            }

            resolve(resultado.texto ?? "");
          } catch {
            reject(stdout);
          }
        }
      );
    });

    return texto;
  } finally {
    await fs.unlink(archivoTemporal).catch(() => {});
  }
}