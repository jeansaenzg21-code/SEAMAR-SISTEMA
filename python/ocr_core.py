import math

import fitz
import numpy as np
import cv2

RESOLUCION_MIN_LADO = 1200
RESOLUCION_MAX_LADO = 2600


def _procesar_resultado_ocr(resultado):
    """Convierte la salida de PaddleOCR a (texto, puntaje).

    El puntaje combina la confianza media de los textos detectados con un
    leve bonus por longitud, para poder comparar entre distintos
    preprocesados de la misma imagen y quedarnos con el mejor.
    """
    lineas_texto = []
    suma_conf = 0.0
    n_lineas = 0

    if resultado and resultado[0]:
        bloques = []

        for linea in resultado[0]:
            try:
                caja = linea[0]
                datos = linea[1]

                conf = 0.0
                if isinstance(datos, (list, tuple)):
                    texto_detectado = datos[0] if datos else ""
                    if len(datos) > 1 and isinstance(datos[1], (int, float)):
                        conf = float(datos[1])
                else:
                    texto_detectado = str(datos)

                if not texto_detectado:
                    continue

                xs = [p[0] for p in caja if len(p) >= 2]
                ys = [p[1] for p in caja if len(p) >= 2]

                if not xs or not ys:
                    continue

                bloques.append((min(ys), min(xs), texto_detectado))
                suma_conf += conf
                n_lineas += 1

            except Exception:
                continue

        if bloques:
            bloques.sort(key=lambda b: (b[0], b[1]))
            lineas_texto = [b[2] for b in bloques]

    texto = "\n".join(lineas_texto)
    puntaje = suma_conf + 0.02 * math.log1p(len(texto))
    return texto, puntaje


def _ocr_en_imagen(imagen, ocr):
    try:
        resultado = ocr.ocr(imagen)
    except Exception as e:
        return f"[Error OCR imagen: {e}]"

    texto, _ = _procesar_resultado_ocr(resultado)
    return texto


def _ajustar_resolucion(imagen):
    alto, ancho = imagen.shape[:2]
    lado = max(alto, ancho)

    if lado < RESOLUCION_MIN_LADO:
        escala = RESOLUCION_MIN_LADO / lado
        imagen = cv2.resize(
            imagen, None, fx=escala, fy=escala, interpolation=cv2.INTER_CUBIC
        )
    elif lado > RESOLUCION_MAX_LADO:
        escala = RESOLUCION_MAX_LADO / lado
        imagen = cv2.resize(
            imagen, None, fx=escala, fy=escala, interpolation=cv2.INTER_AREA
        )

    return imagen


def _variantes_preprocesado(gris):
    """Genera varias versiones preprocesadas de la imagen en escala de grises.

    Cada variante favorece un tipo de documento:
    - binaria: fotos con contraste irregular (como antes).
    - binaria_suave: fotos con sombras o luz desigual.
    - otsu: escaneos/fotos con fondo limpio y uniforme.
    - clahe: mejora de contraste local sin binarizar (fotos oscuras o con brillo).
    """
    suave = cv2.GaussianBlur(gris, (3, 3), 0)

    binaria = cv2.adaptiveThreshold(
        suave, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15,
    )

    binaria_suave = cv2.adaptiveThreshold(
        cv2.GaussianBlur(gris, (5, 5), 0), 255,
        cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 21, 10,
    )

    _, otsu = cv2.threshold(
        suave, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    clahe_img = clahe.apply(gris)

    return [binaria, binaria_suave, otsu, clahe_img]


def _ocr_mejor_texto(imagen, ocr):
    """Ejecuta OCR sobre las variantes y devuelve el texto con mejor puntaje."""
    if imagen.ndim == 3:
        gris = cv2.cvtColor(imagen, cv2.COLOR_BGR2GRAY)
    else:
        gris = imagen

    mejor_texto = ""
    mejor_puntaje = -1.0

    for variante in _variantes_preprocesado(gris):
        try:
            resultado = ocr.ocr(variante)
        except Exception:
            continue

        texto, puntaje = _procesar_resultado_ocr(resultado)

        if texto and puntaje > mejor_puntaje:
            mejor_puntaje = puntaje
            mejor_texto = texto

    return mejor_texto


def _ordenar_puntos(pts):
    """Ordena 4 puntos como TL, TR, BR, BL."""
    pts = pts.astype("float32")
    suma = pts.sum(axis=1)
    diff = np.diff(pts, axis=1).ravel()

    tl = pts[np.argmin(suma)]
    br = pts[np.argmax(suma)]
    tr = pts[np.argmin(diff)]
    bl = pts[np.argmax(diff)]

    return np.array([tl, tr, br, bl], dtype="float32")


def _corregir_perspectiva(imagen):
    """Detecta el documento en la foto y lo endereza de forma frontal.

    Devuelve la imagen corregida o None si no se encontró un cuadrilátero
    confiable (en ese caso se usa la foto original).
    """
    try:
        alto, ancho = imagen.shape[:2]
        if imagen.ndim == 3:
            gris = cv2.cvtColor(imagen, cv2.COLOR_BGR2GRAY)
        else:
            gris = imagen

        binar = cv2.adaptiveThreshold(
            cv2.GaussianBlur(gris, (5, 5), 0), 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2,
        )

        contornos, _ = cv2.findContours(
            binar, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        if not contornos:
            return None

        contorno = max(contornos, key=cv2.contourArea)
        if cv2.contourArea(contorno) < 0.30 * (alto * ancho):
            return None

        peri = cv2.arcLength(contorno, True)
        aprox = cv2.approxPolyDP(contorno, 0.02 * peri, True)
        if len(aprox) != 4:
            return None

        pts = _ordenar_puntos(aprox.reshape(4, 2))
        (tl, tr, br, bl) = pts

        ancho_a = np.linalg.norm(br - bl)
        ancho_b = np.linalg.norm(tr - tl)
        alto_a = np.linalg.norm(tr - br)
        alto_b = np.linalg.norm(tl - bl)

        destino = np.array(
            [
                [0, 0],
                [ancho_a - 1, 0],
                [ancho_a - 1, alto_a - 1],
                [0, alto_a - 1],
            ],
            dtype="float32",
        )

        M = cv2.getPerspectiveTransform(pts, destino)
        return cv2.warpPerspective(
            imagen, M, (int(ancho_a), int(alto_a))
        )

    except Exception:
        return None


def extraer_texto_imagen(ruta_imagen, ocr):
    imagen = cv2.imread(ruta_imagen)
    if imagen is None:
        return ""

    imagen = _ajustar_resolucion(imagen)

    mejor = _ocr_mejor_texto(imagen, ocr)

    enderezada = _corregir_perspectiva(imagen)
    if enderezada is not None:
        texto_enderezada = _ocr_mejor_texto(enderezada, ocr)
        if texto_enderezada and len(texto_enderezada) > len(mejor):
            mejor = texto_enderezada

    return mejor


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

        pagina_texto = _ocr_en_imagen(imagen, ocr)
        if pagina_texto:
            texto.append(pagina_texto)

    documento.close()
    return "\n\n".join(texto)
