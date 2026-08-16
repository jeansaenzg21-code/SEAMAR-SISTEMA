import re
import logging

import fitz

logger = logging.getLogger("ocr-service")

PDF_TEXTO = "PDF_TEXTO"
PDF_ESCANEADO = "PDF_ESCANEADO"

# Campos típicos de factura que deberían estar en el texto extraído.
CAMPOS_FACTURA_RE = re.compile(
    r"RUC|FACTURA|BOLETA|FECHA DE EMISI[ÓO]N|F\.?\s*EMISI[ÓO]N|F\.?\s*EMISION|"
    r"TOTAL|IMPORTE TOTAL|IGV|SUB\s*TOTAL|SUBTOTAL|MONEDA|SOLES|DOLARES|D[ÓO]LARES|"
    r"USD|S/|US\$|CONDICI[ÓO]N DE PAGO|PAGO",
    re.IGNORECASE,
)

# Claves de tabla de detalle (facturas de productos o de servicios).
CLAVES_TABLA_RE = re.compile(
    r"C[ÓO]DIGO|COD\.|CANT\.|CANTIDAD|QUANTITY|UNIDAD|UNID\.|"
    r"DESCRIPCI[ÓO]N|CONCEPTO|DETALLE|"
    r"V\.?\s*UNIT\.|VALOR UNITARIO|COSTO UNITARIO|P\.?\s*UNIT\.|PRECIO UNITARIO|"
    r"DSCTO\.|DESCUENTO|V\.?\s*VENTA|VALOR (DE )?VENTA|IMPORTE|PRECIO",
    re.IGNORECASE,
)

# Montos con decimales (valores típicos de tabla de detalle y totales).
MONTO_RE = re.compile(r"\d{1,3}(?:[,.]\d{3})*[.,]\d{2}")

# Umbrales para considerar que el texto es suficiente. No se usan de forma
# aislada: siempre se combinan con claves de factura, claves de tabla,
# proporción de páginas con texto y cobertura de imágenes.
MIN_CARACTERES_TOTALES = 80
MIN_PALABRAS_TOTALES = 40
MIN_PROPORCION_PAGINAS = 0.5
MIN_PROMEDIO_CARACTERES_PAGINA = 120

# Cobertura de imágenes sobre el área de la página. A partir de estos valores
# se sospecha que el contenido principal puede estar dentro de una imagen.
UMBRAL_IMAGEN_FUERTE = 0.25
UMBRAL_IMAGEN_TABLA = 0.10


def extraer_texto_plano(pdf_path: str) -> str:
    """Extrae el texto del PDF usando PyMuPDF (capa de texto, sin OCR)."""
    documento = fitz.open(pdf_path)
    try:
        paginas = [pagina.get_text("text") for pagina in documento]
    finally:
        documento.close()
    return "\n".join(paginas)


def _analizar_pdf(pdf_path: str) -> dict:
    documento = fitz.open(pdf_path)
    total_paginas = max(documento.page_count, 1)
    total_caracteres = 0
    total_palabras = 0
    paginas_con_texto = 0
    area_imagen_total = 0.0
    area_total = 0.0
    paginas = []

    for pagina in documento:
        texto = pagina.get_text("text") or ""
        caracteres = len(texto.strip())
        palabras = len(texto.split())

        total_caracteres += caracteres
        total_palabras += palabras
        if palabras >= 8:
            paginas_con_texto += 1

        rect = pagina.rect
        area = rect.width * rect.height
        area_total += area

        area_imagen_pagina = 0.0
        try:
            for info in pagina.get_image_info():
                bbox = info.get("bbox")
                if bbox and len(bbox) == 4:
                    ancho = max(bbox[2] - bbox[0], 0)
                    alto = max(bbox[3] - bbox[1], 0)
                    area_imagen_pagina += ancho * alto
        except Exception:
            pass
        area_imagen_total += area_imagen_pagina

        paginas.append(
            {
                "texto": texto,
                "caracteres": caracteres,
                "palabras": palabras,
            }
        )

    documento.close()

    return {
        "total_caracteres": total_caracteres,
        "total_palabras": total_palabras,
        "paginas_con_texto": paginas_con_texto,
        "total_paginas": total_paginas,
        "proporcion_paginas": paginas_con_texto / total_paginas,
        "promedio_caracteres_pagina": total_caracteres / total_paginas,
        "cobertura_imagen": min(area_imagen_total / max(area_total, 1), 1.0),
        "paginas": paginas,
    }


def detectar_tipo_documento(pdf_path: str) -> str:
    """Detecta si un PDF debe tratarse como texto (PDF_TEXTO) o como
    escaneado/imagen (PDF_ESCANEADO).

    No se usa un límite arbitrario de caracteres como único criterio.
    La decisión combina como mínimo:
    - cantidad de caracteres extraídos;
    - cantidad de palabras;
    - presencia de campos relevantes de factura;
    - presencia de información de tabla (claves de detalle);
    - proporción de páginas con texto;
    - cobertura de imágenes (posibilidad de que el contenido principal esté
      dentro de una imagen, p. ej. la tabla de la factura).

    Devuelve PDF_TEXTO o PDF_ESCANEADO.
    """
    analisis = _analizar_pdf(pdf_path)

    texto = "\n".join(pagina["texto"] for pagina in analisis["paginas"])
    tiene_campos_factura = bool(CAMPOS_FACTURA_RE.search(texto))
    tiene_claves_tabla = bool(CLAVES_TABLA_RE.search(texto))
    cantidad_montos = len(MONTO_RE.findall(texto))

    logger.info(
        "[DETECCION] caracteres=%d | palabras=%d | paginas_con_texto=%d/%d | "
        "proporcion=%.2f | promedio_caracteres=%.1f | cobertura_imagen=%.2f | "
        "campos_factura=%s | claves_tabla=%s | montos=%d",
        analisis["total_caracteres"],
        analisis["total_palabras"],
        analisis["paginas_con_texto"],
        analisis["total_paginas"],
        analisis["proporcion_paginas"],
        analisis["promedio_caracteres_pagina"],
        analisis["cobertura_imagen"],
        tiene_campos_factura,
        tiene_claves_tabla,
        cantidad_montos,
    )

    # PDF prácticamente sin capa de texto: es un escaneado/imagen.
    if (
        analisis["total_caracteres"] < MIN_CARACTERES_TOTALES
        and analisis["total_palabras"] < MIN_PALABRAS_TOTALES
    ):
        return PDF_ESCANEADO

    # Gran parte de la página está cubierta por una imagen y la tabla no está
    # en el texto: el contenido principal está dentro de una imagen.
    if (
        analisis["cobertura_imagen"] >= UMBRAL_IMAGEN_FUERTE
        and not tiene_claves_tabla
    ):
        return PDF_ESCANEADO

    # Texto en cabecera pero tabla dentro de imagen: hay campos de factura
    # visibles y cobertura de imagen relevante, pero las claves de la tabla de
    # detalle NO están en el texto extraído.
    if (
        analisis["cobertura_imagen"] >= UMBRAL_IMAGEN_TABLA
        and tiene_campos_factura
        and not tiene_claves_tabla
    ):
        return PDF_ESCANEADO

    # PDF con texto estructurado suficiente: campos de factura, claves de
    # tabla, mayoría de páginas con texto y densidad aceptable.
    if (
        tiene_campos_factura
        and tiene_claves_tabla
        and analisis["proporcion_paginas"] >= MIN_PROPORCION_PAGINAS
        and analisis["promedio_caracteres_pagina"]
        >= MIN_PROMEDIO_CARACTERES_PAGINA
        and cantidad_montos >= 1
    ):
        return PDF_TEXTO

    # Caso dudoso: ante la duda se prefiere OCR para no perder la tabla.
    return PDF_ESCANEADO
