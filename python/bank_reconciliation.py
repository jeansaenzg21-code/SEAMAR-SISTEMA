import pandas as pd
import json
import sys
import mysql.connector

# =========================
# UTF-8
# =========================

sys.stdout.reconfigure(encoding="utf-8")

archivo = sys.argv[1]

# =========================
# MYSQL
# =========================

conexion = mysql.connector.connect(
    host="localhost",
    user="root",
    password="MYSQL",
    database="seamar"
)

cursor = conexion.cursor(dictionary=True)

# =========================
# EXCEL
# =========================

excel = pd.read_excel(
    archivo,
    header=4
)

excel.columns = [
    str(col).strip()
    for col in excel.columns
]

excel = excel.dropna(
    subset=["Fecha", "Monto"]
)

# =========================
# HELPERS
# =========================

def safe_str(value, fallback="-"):
    """Convierte un valor a string limpio, usando fallback si es None/NaN."""
    if value is None:
        return fallback
    s = str(value).strip()
    return s if s and s.lower() != "none" and s.lower() != "nan" else fallback


def construir_coincidencia_cobrar(reg):
    """
    Arma el dict de coincidencia para cuentas_por_cobrar.
    Espera columnas del JOIN:
        cxc.id, cxc.numero_factura, cxc.monto, cxc.fecha_emision,
        c.razon_social AS cliente_nombre,
        p.nombre AS proyecto_nombre
    """
    return {
        "id":        safe_str(reg["id"]),
        "origen":    "CUENTA_POR_COBRAR",
        "cliente":   safe_str(reg.get("cliente_nombre")),
        "proyecto":  safe_str(reg.get("proyecto_nombre")),
        "documento": safe_str(reg.get("numero_factura")),
        "fecha":     str(reg["fecha_emision"]),
        "monto":     float(reg["monto"]),
    }


def construir_coincidencia_pagar(reg):
    """
    Arma el dict de coincidencia para cuentas_por_pagar.
    Espera columnas del JOIN:
        cxp.id, cxp.numero_documento, cxp.monto, cxp.fecha_emision,
        v.razon_social AS proveedor_nombre,
        p.nombre AS proyecto_nombre
    """
    return {
        "id":        safe_str(reg["id"]),
        "origen":    "CUENTA_POR_PAGAR",
        "proveedor": safe_str(reg.get("proveedor_nombre")),
        "proyecto":  safe_str(reg.get("proyecto_nombre")),
        "documento": safe_str(reg.get("numero_documento")),
        "fecha":     str(reg["fecha_emision"]),
        "monto":     float(reg["monto"]),
    }

# =========================
# QUERIES CON JOIN
# =========================

QUERY_COBRAR = """
    SELECT
        cxc.id,
        cxc.numero_factura,
        cxc.monto,
        cxc.fecha_emision,
        COALESCE(c.razon_social, 'Sin cliente')  AS cliente_nombre,
        COALESCE(p.nombre, 'Sin proyecto')        AS proyecto_nombre
    FROM cuentas_por_cobrar cxc
    LEFT JOIN clientes  c ON c.id = cxc.cliente_id
    LEFT JOIN proyectos p ON p.id = cxc.proyecto_id
    WHERE cxc.fecha_emision IS NOT NULL
"""

QUERY_PAGAR = """
    SELECT
        cxp.id,
        cxp.numero_documento,
        cxp.monto,
        cxp.fecha_emision,
        COALESCE(v.razon_social, 'Sin proveedor') AS proveedor_nombre,
        COALESCE(p.nombre, 'Sin proyecto')         AS proyecto_nombre
    FROM cuentas_por_pagar cxp
    LEFT JOIN proveedores v ON v.id = cxp.proveedor_id
    LEFT JOIN proyectos   p ON p.id = cxp.proyecto_id
    WHERE cxp.fecha_emision IS NOT NULL
"""

# =========================
# RESULTADOS
# =========================

movimientos = []

# =========================
# RECORRER EXCEL
# =========================

for index, fila in excel.iterrows():

    try:

        fecha_mov = pd.to_datetime(
            fila["Fecha"]
        )

        fecha_mov_str = fecha_mov.strftime(
            "%Y-%m-%d"
        )

        monto_original = round(
            float(fila["Monto"]),
            2
        )

        monto = abs(monto_original)

        descripcion = str(
            fila.get(
                "Descripción operación",
                ""
            )
        ).strip()

        referencia = str(
            fila.get(
                "Referencia2",
                ""
            )
        ).strip()

        tipo = (
            "credito"
            if monto_original > 0
            else "debito"
        )

        # =========================
        # BUSCAR TABLA SEGÚN TIPO
        # =========================

        if tipo == "credito":
            cursor.execute(QUERY_COBRAR)
            construir_coincidencia = construir_coincidencia_cobrar
        else:
            cursor.execute(QUERY_PAGAR)
            construir_coincidencia = construir_coincidencia_pagar

        registros = cursor.fetchall()

        coincidencias_exactas = []
        coincidencias         = []

                # =========================
        # BÚSQUEDA
        # =========================

        for reg in registros:

            fecha_reg = pd.to_datetime(
                reg["fecha_emision"]
            )

            monto_reg = round(
                float(reg["monto"]),
                2
            )

            misma_fecha = (
                fecha_mov.date() ==
                fecha_reg.date()
            )

            mismo_monto = (
                monto_reg == monto
            )

            if misma_fecha and mismo_monto:

                coincidencias_exactas.append(reg)
                
                       
        # =========================
        # CONCILIADO
        # =========================

        if len(coincidencias_exactas) == 1:

            estado = "conciliado"
            diferencia = 0

            coincidencias.append(
                construir_coincidencia(coincidencias_exactas[0])
            )

        # =========================
        # OBSERVACIÓN (múltiples exactas)
        # =========================

        elif len(coincidencias_exactas) > 1:

            estado = "observacion"
            diferencia = 0

            for reg in coincidencias_exactas:
                coincidencias.append(
                    construir_coincidencia(reg)
                )

        

        # =========================
        # PENDIENTE
        # =========================

        else:

            estado     = "pendiente"
            diferencia = 0

        # =========================
        # ARMAR MOVIMIENTO
        # =========================

        movimiento = {
            "id":            str(index),
            "fecha":         fecha_mov_str,
            "referencia":    referencia,
            "descripcion":   descripcion,
            "monto":         monto,
            "moneda":        "PEN",
            "estado":        estado,
            "tipo":          tipo,
            "banco":         "BCP",
            "coincidencias": coincidencias,
        }

        if estado == "diferencia":
            movimiento["diferencia"]      = diferencia
            movimiento["causaDiferencia"] = (
                "Monto distinto entre banco y sistema"
            )

        movimientos.append(movimiento)

    except Exception as e:

        movimientos.append({
            "id":            f"error-{index}",
            "fecha":         "",
            "referencia":    "",
            "descripcion":   str(e),
            "monto":         0,
            "moneda":        "PEN",
            "estado":        "pendiente",
            "tipo":          "debito",
            "banco":         "BCP",
            "coincidencias": [],
        })

# =========================
# JSON FINAL
# =========================

resultado = {

    "success": True,

    "totalMovimientos":
        len(movimientos),

    "conciliados":
        len([m for m in movimientos if m["estado"] == "conciliado"]),

    "observaciones":
        len([m for m in movimientos if m["estado"] == "observacion"]),

    "diferencias":
        len([m for m in movimientos if m["estado"] == "diferencia"]),

    "pendientes":
        len([m for m in movimientos if m["estado"] == "pendiente"]),

    "movimientos":
        movimientos,
}

sys.stdout.buffer.write(
    json.dumps(
        resultado,
        ensure_ascii=False
    ).encode("utf-8")
)

cursor.close()
conexion.close()