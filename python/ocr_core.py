import fitz
import numpy as np
import cv2


def extraer_texto(pdf_path, ocr):
    documento = fitz.open(pdf_path)
    texto = []

    for pagina in documento:
        pix = pagina.get_pixmap(matrix=fitz.Matrix(2.5, 2.5))
        imagen = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)

        if pix.n == 4:
            imagen = cv2.cvtColor(imagen, cv2.COLOR_RGBA2GRAY)
        else:
            imagen = cv2.cvtColor(imagen, cv2.COLOR_RGB2GRAY)

        imagen = cv2.GaussianBlur(imagen, (3, 3), 0)
        imagen = cv2.adaptiveThreshold(imagen, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15)

        try:
            resultado = ocr.ocr(imagen)
        except Exception as e:
            texto.append(f"[Error OCR página: {e}]")
            continue

        pagina_texto = []

        if resultado and resultado[0]:
            bloques = []

            for linea in resultado[0]:
                try:
                    caja = linea[0]
                    datos = linea[1]

                    if isinstance(datos, (list, tuple)):
                        texto_detectado = datos[0] if datos else ""
                    else:
                        texto_detectado = str(datos)

                    if not texto_detectado:
                        continue

                    xs = [p[0] for p in caja if len(p) >= 2]
                    ys = [p[1] for p in caja if len(p) >= 2]

                    if not xs or not ys:
                        continue

                    bloques.append((min(ys), min(xs), texto_detectado))

                except Exception:
                    continue

            if bloques:
                bloques.sort(key=lambda b: (b[0], b[1]))
                pagina_texto = [b[2] for b in bloques]

        texto.append("\n".join(pagina_texto))

    documento.close()
    return "\n\n".join(texto)
