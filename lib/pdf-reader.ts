import { PdfReader } from "pdfreader";

export async function leerPdf(buffer: Buffer) {
  return new Promise<string>((resolve, reject) => {
    let texto = "";

    new PdfReader().parseBuffer(buffer, (error, item) => {
      if (error) {
        reject(error);
        return;
      }

      if (!item) {
        resolve(texto);
        return;
      }

      if (item.text) {
        texto += item.text + " ";
      }
    });
  });
}