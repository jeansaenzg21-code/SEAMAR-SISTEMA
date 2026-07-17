import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import pool from "@/lib/mysql"

interface Coincidencia {
  origen: string
  cliente?: string
  proveedor?: string
  proyecto?: string
  documento?: string
  descripcion?: string
  fecha?: string
  monto?: number
}

interface Movimiento {
  fecha: string
  referencia: string
  descripcion: string
  monto: number
  moneda: "PEN" | "USD"
  tipo: "credito" | "debito"
  estado: "conciliado" | "observacion" | "pendiente"
  coincidencias?: Coincidencia[]
}

export async function POST(request: NextRequest) {
  try {
    const [empresaRows]: any = await pool.query("SELECT nombre_comercial FROM empresa LIMIT 1")
    const empresaNombre = empresaRows[0]?.nombre_comercial || ""

    const {
      banco,
      periodo,
      moneda,
      movimientos
    }: {
      banco: string
      periodo: string
      moneda: string
      movimientos: Movimiento[]
    } = await request.json()

    const workbook = new ExcelJS.Workbook()

    workbook.creator = empresaNombre
    workbook.company = empresaNombre
    workbook.created = new Date()

    // ======================================================
    // HOJA RESUMEN
    // ======================================================

    const resumen = workbook.addWorksheet("Resumen")

    resumen.mergeCells("A1:B1")
    resumen.getCell("A1").value = empresaNombre

    resumen.mergeCells("A2:B2")
    resumen.getCell("A2").value =
      "REPORTE DE CONCILIACIÓN BANCARIA"

    resumen.mergeCells("A3:B3")
    resumen.getCell("A3").value =
      `Periodo: ${periodo}`

    resumen.getCell("A1").font = {
      bold: true,
      size: 20,
    }

    resumen.getCell("A2").font = {
      bold: true,
      size: 14,
    }

    resumen.getCell("A3").font = {
      italic: true,
    }

    const conciliados =
      movimientos.filter(
        m => m.estado === "conciliado"
      ).length

    const observaciones =
      movimientos.filter(
        m => m.estado === "observacion"
      ).length

    const pendientes =
      movimientos.filter(
        m => m.estado === "pendiente"
      ).length

    resumen.addRow([])

    resumen.addRow([
      "Banco",
      banco
    ])

    resumen.addRow([
      "Moneda",
      moneda
    ])

    resumen.addRow([
      "Fecha Exportación",
      new Date().toLocaleDateString("es-PE")
    ])

    resumen.addRow([
      "Total Movimientos",
      movimientos.length
    ])

    resumen.addRow([
      "Conciliados",
      conciliados
    ])

    resumen.addRow([
      "Observaciones",
      observaciones
    ])

    resumen.addRow([
      "Pendientes",
      pendientes
    ])

    resumen.columns = [
      { width: 30 },
      { width: 35 }
    ]

    resumen.eachRow((row, rowNumber) => {

      if (rowNumber >= 5) {

        row.getCell(1).font = {
          bold: true
        }

        row.getCell(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "D9EAD3"
          }
        }

      }

    })

    // ======================================================
    // HOJA DETALLE
    // ======================================================

    const conciliadosSheet =
  workbook.addWorksheet("Conciliados")

const observacionesSheet =
  workbook.addWorksheet("Observaciones")

const pendientesSheet =
  workbook.addWorksheet("Pendientes")

  
  function configurarHoja(
  worksheet: ExcelJS.Worksheet
) {

  worksheet.columns = [

    {
      header: "Fecha",
      key: "fecha",
      width: 15
    },

    {
      header: "Referencia",
      key: "referencia",
      width: 22
    },

    {
      header: "Descripción",
      key: "descripcion",
      width: 40
    },

    {
      header: "Tipo",
      key: "tipo",
      width: 14
    },

    {
      header: "Monto",
      key: "monto",
      width: 18
    },

    {
      header: "Coincidencias",
      key: "coincidencias",
      width: 45
    },

    {
      header: "Observaciones",
      key: "observaciones",
      width: 65
    }

  ]

  const header =
    worksheet.getRow(1)

  header.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF"
    }
  }

  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "1E3A8A"
    }
  }

  worksheet.views = [
    
    {
      state: "frozen",
      ySplit: 1
    }
  ]
  worksheet.autoFilter = {
  from: "A1",
  to: "G1"
}

}

configurarHoja(
  conciliadosSheet
)

configurarHoja(
  observacionesSheet
)

configurarHoja(
  pendientesSheet
)

        // ======================================================
    // DETALLE DE MOVIMIENTOS
    // ======================================================

    movimientos.forEach((movimiento) => {

      const coincidencias =
        movimiento.coincidencias ?? []

      const textoCoincidencias =
        coincidencias.length === 0
          ? "-"
          : coincidencias
              .map((c) => {

                const nombre =
                  c.cliente ??
                  c.proveedor ??
                  ""

                return [
                  c.documento,
                  nombre,
                  c.proyecto,
                ]
                  .filter(Boolean)
                  .join(" | ")

              })
              .join("\n\n")

      let observaciones = ""

      switch (movimiento.estado) {

        case "conciliado":

          if (coincidencias.length === 0) {

            observaciones =
              "Movimiento conciliado."

          } else {

            observaciones =
              "Se encontraron coincidencias con:\n\n"

            observaciones += coincidencias
              .map((c) => {

                let texto = ""

                if (c.documento) {
                  texto += `• Documento: ${c.documento}`
                }

                if (c.descripcion) {
                  texto += `\nGlosa: ${c.descripcion}`
                }

                if (c.proyecto) {
                  texto += `\nProyecto: ${c.proyecto}`
                }

                return texto

              })
              .join("\n\n")

          }

          break

        case "observacion":

          observaciones =
            "Se encontraron múltiples coincidencias.\n\n"

          observaciones += coincidencias
            .map((c) => {

              let texto = ""

              if (c.documento) {
                texto += `• Documento: ${c.documento}`
              }

              if (c.descripcion) {
                texto += `\nGlosa: ${c.descripcion}`
              }

              if (c.proyecto) {
                texto += `\nProyecto: ${c.proyecto}`
              }

              return texto

            })
            .join("\n\n")

          break

        case "pendiente":

          observaciones =
            "No se encontraron coincidencias en el sistema."

          break

      }

      let hoja: ExcelJS.Worksheet

if (
  movimiento.estado ===
  "conciliado"
) {

  hoja = conciliadosSheet

}
else if (
  movimiento.estado ===
  "observacion"
) {

  hoja =
    observacionesSheet

}
else {

  hoja =
    pendientesSheet

}

const row =
  hoja.addRow({

        fecha: movimiento.fecha,

        referencia: movimiento.referencia,

        descripcion: movimiento.descripcion,

        tipo:
          movimiento.tipo === "credito"
            ? "Crédito"
            : "Débito",

        monto: Number(
          movimiento.monto
        ),


        coincidencias:
          textoCoincidencias,

        observaciones

      })

      row.getCell("monto").numFmt =
        moneda === "USD"
          ? '"US$ " #,##0.00'
          : '"S/ " #,##0.00'

      row.getCell("coincidencias").alignment = {
        wrapText: true,
        vertical: "top"
      }

      row.getCell("observaciones").alignment = {
        wrapText: true,
        vertical: "top"
      }

      row.eachCell((cell) => {

        cell.border = {

          top: {
            style: "thin"
          },

          left: {
            style: "thin"
          },

          bottom: {
            style: "thin"
          },

          right: {
            style: "thin"
          }

        }

      })

})


    function agregarTotal(
  hoja: ExcelJS.Worksheet,
  lista: Movimiento[]
) {

  const totalMonto =
    lista.reduce(
      (s, m) => s + Number(m.monto),
      0
    )

  hoja.addRow([])

  const row = hoja.addRow([
    "",
    "",
    "",
    "TOTAL",
    totalMonto
  ])

  row.getCell(4).font = {
    bold: true
  }

  row.getCell(5).font = {
    bold: true
  }

  row.getCell(5).numFmt =
    moneda === "USD"
      ? '"US$ " #,##0.00'
      : '"S/ " #,##0.00'

}

agregarTotal(
  conciliadosSheet,
  movimientos.filter(
    m => m.estado === "conciliado"
  )
)

agregarTotal(
  observacionesSheet,
  movimientos.filter(
    m => m.estado === "observacion"
  )
)

agregarTotal(
  pendientesSheet,
  movimientos.filter(
    m => m.estado === "pendiente"
  )
)

    const buffer =
      await workbook.xlsx.writeBuffer()

    return new NextResponse(
      Buffer.from(buffer),
      {
        headers: {

          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          "Content-Disposition":
            `attachment; filename=SEAMAR_CONCILIACION_${new Date()
              .toISOString()
              .slice(0,10)}.xlsx`

        }
      }
    )

  } catch (error) {

    console.error(error)

    return NextResponse.json(
      {
        success: false,
        error:
          "Error al exportar conciliación bancaria."
      },
      {
        status: 500
      }
    )

  }
}