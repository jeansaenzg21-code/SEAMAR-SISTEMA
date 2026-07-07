import fitz
import json
import os
import sys
import numpy as np

from paddleocr import PaddleOCR

ocr = PaddleOCR(
    use_angle_cls=True,
    lang="es",
    show_log=False
)


def extraer_texto(pdf_path):
    documento = fitz.open(pdf_path)

    texto = []

    for pagina in documento:

        pix = pagina.get_pixmap(matrix=fitz.Matrix(4, 4))

        imagen = np.frombuffer(
            pix.samples,
            dtype=np.uint8
        ).reshape(
            pix.height,
            pix.width,
            pix.n
        )

        resultado = ocr.ocr(imagen, cls=True)

        pagina_texto = []

        if resultado and resultado[0]:

            bloques = []

            for linea in resultado[0]:
                caja = linea[0]
                texto_detectado = linea[1][0]

                x = min(p[0] for p in caja)
                y = min(p[1] for p in caja)

                bloques.append((y, x, texto_detectado))

            bloques.sort(key=lambda b: (b[0], b[1]))

            pagina_texto = [b[2] for b in bloques]

        texto.append("\n".join(pagina_texto))

    documento.close()

    return "\n\n".join(texto)


def main():

    if len(sys.argv) < 2:
        print(json.dumps({
            "ok": False,
            "error": "No se recibió el PDF"
        }))
        return

    archivo = sys.argv[1]

    if not os.path.exists(archivo):
        print(json.dumps({
            "ok": False,
            "error": "Archivo no encontrado"
        }))
        return

    try:

        texto = extraer_texto(archivo)

        print(json.dumps({
            "ok": True,
            "texto": texto
        }, ensure_ascii=False))

    except Exception as e:

        print(json.dumps({
            "ok": False,
            "error": str(e)
        }))


if __name__ == "__main__":
    main()