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
    password="123456",
    database="seamar"
)

cursor = conexion.cursor(dictionary=True)

# =========================
# EXCEL
# =========================

excel = pd.read_excel(
    archivo,
    header=5
)

excel.columns = [
    str(col).strip()
    for col in excel.columns
]

excel = excel.dropna(
    subset=[
        "Serie del CDP",
        "Nro CP o Doc. Nro Inicial (Rango)"
    ]
)

# =========================
# RESULTADOS
# =========================

coincidencias = []
no_encontradas = []
diferencias_monto = []
records = []

# =========================
# RECORRER EXCEL
# =========================

for _, fila in excel.iterrows():

    try:

        serie = str(
            fila["Serie del CDP"]
        ).strip()

        numero = str(
            int(
                float(
                    fila["Nro CP o Doc. Nro Inicial (Rango)"]
                )
            )
        )

        factura = f"{serie}-{numero}"

        monto_excel = round(
            float(
                fila["Total CP"]
            ),
            2
        )

        fecha_excel = pd.to_datetime(
    fila["Fecha del emisión"]
).strftime("%Y-%m-%d")

        proveedor_excel = str(
            fila.get(
                "Nombre o Razon Social",
                fila.get(
                    "Nombre o Razon Social ",
                    ""
                )
            )
        ).strip()

        ruc_excel = str(
    int(
        float(
            fila.get(
                "Nro Doc Identidad",
                0
            )
        )
    )
)

        cursor.execute(
            """
            SELECT
                numero_documento,
                monto,
                fecha_emision,
                descripcion,
                estado
            FROM cuentas_por_pagar
            WHERE numero_documento = %s
            """,
            (factura,)
        )

        encontrada = cursor.fetchone()

        # =========================
        # ENCONTRADA
        # =========================

        if encontrada:

            monto_sistema = round(
                float(
                    encontrada["monto"]
                ),
                2
            )

            # COINCIDE

            if monto_excel == monto_sistema:

                coincidencias.append({

                    "factura": factura,
                    "estado": "COINCIDE",
                    "montoExcel": monto_excel,
                    "montoSistema": monto_sistema,
                    "proveedor": proveedor_excel,
                    "ruc": ruc_excel,
                    "fecha": fecha_excel

                })

                records.append({

                    "id": factura,
                    "invoiceNumber": factura,
                    "status": "COINCIDE",
                    "amountExcel": monto_excel,
                    "amountSystem": monto_sistema,
                    "supplier": proveedor_excel,
                    "ruc": ruc_excel,
                    "date": fecha_excel,
                    "observation": None

                })

            # DIFERENCIA

            else:

                diferencias_monto.append({

                    "factura": factura,
                    "estado": "DIFERENCIA_MONTO",
                    "montoExcel": monto_excel,
                    "montoSistema": monto_sistema,
                    "proveedor": proveedor_excel,
                    "ruc": ruc_excel,
                    "fecha": fecha_excel

                })

                records.append({

                    "id": factura,
                    "invoiceNumber": factura,
                    "status": "DIFERENCIA_MONTO",
                    "amountExcel": monto_excel,
                    "amountSystem": monto_sistema,
                    "supplier": proveedor_excel,
                    "ruc": ruc_excel,
                    "date": fecha_excel,
                    "observation":
                        "Monto distinto entre Excel y sistema"

                })

        # =========================
        # NO ENCONTRADA
        # =========================

        else:

            no_encontradas.append({

                "factura": factura,
                "estado": "NO_ENCONTRADA",
                "montoExcel": monto_excel,
                "proveedor": proveedor_excel,
                "ruc": ruc_excel,
                "fecha": fecha_excel

            })

            records.append({

                "id": factura,
                "invoiceNumber": factura,
                "status": "NO_ENCONTRADA",
                "amountExcel": monto_excel,
                "amountSystem": None,
                "supplier": proveedor_excel,
                "ruc": ruc_excel,
                "date": fecha_excel,
                "observation":
                    "No existe en cuentas_por_pagar"

            })

    except Exception as e:

        records.append({

            "id": "ERROR",
            "invoiceNumber": "",
            "status": "ERROR",
            "amountExcel": None,
            "amountSystem": None,
            "supplier": "",
            "ruc": "",
            "date": "",
            "observation": str(e)

        })

        continue

# =========================
# JSON FINAL
# =========================

resultado = {

    "totalExcel":
        len(excel),

    "coincidencias":
        len(coincidencias),

    "noEncontradas":
        len(no_encontradas),

    "diferenciasMonto":
        len(diferencias_monto),

    "records":
        records,

    "coincidenciasDetalle":
        coincidencias,

    "noEncontradasDetalle":
        no_encontradas,

    "diferenciasMontoDetalle":
        diferencias_monto

}

sys.stdout.buffer.write(
    json.dumps(
        resultado,
        ensure_ascii=False
    ).encode("utf-8")
)

cursor.close()
conexion.close()