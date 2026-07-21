import json
import os
import sys

from paddleocr import PaddleOCR

from ocr_core import extraer_texto

os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

ocr = PaddleOCR(
    use_textline_orientation=True,
    lang="es"
)


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

        texto = extraer_texto(archivo, ocr)

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
