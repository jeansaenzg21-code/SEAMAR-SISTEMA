import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import pool from "@/lib/mysql"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const year = searchParams.get("year")
    const month = searchParams.get("month")
    const moneda =
  searchParams.get("moneda") ?? "SOLES"

    if (!year || !month) {
      return NextResponse.json(
        { error: "Debe indicar año y mes" },
        { status: 400 }
      )
    }

    const [rows]: any = await pool.query(
      `
      SELECT
  cxp.codigo,
  pr.razon_social AS proveedor,
  cxp.numero_documento,

  cxp.detraccion,

  cxp.forma_pago,
        cxp.categorizacion,
        cxp.monto,
cxp.moneda,
cxp.saldo,
        cxp.fecha_emision,
        cxp.fecha_vencimiento
      FROM cuentas_por_pagar cxp
      LEFT JOIN proveedores pr
        ON cxp.proveedor_id = pr.id
      WHERE YEAR(cxp.fecha_emision) = ?
AND MONTH(cxp.fecha_emision) = ?
AND cxp.moneda = ?
ORDER BY cxp.fecha_emision ASC
      `,
      [year, month, moneda]
    )

    const workbook = new ExcelJS.Workbook()

    const worksheet = workbook.addWorksheet(
      `CXP ${month}-${year}`
    )
    const meses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

const nombreMes = meses[Number(month) - 1]

worksheet.mergeCells("A1:K1")
worksheet.getCell("A1").value = "SEAMAR"

worksheet.mergeCells("A2:K2")
worksheet.getCell("A2").value =
  "REPORTE DE CUENTAS POR PAGAR"

worksheet.mergeCells("A3:K3")
worksheet.getCell("A3").value =
  `Periodo: ${nombreMes} ${year}`

worksheet.getCell("A5").value =
  `Generado: ${new Date().toLocaleDateString("es-PE")}`

worksheet.getCell("A1").font = {
  bold: true,
  size: 20,
}
worksheet.getCell("A1").alignment = {
  horizontal: "left",
}

worksheet.getCell("A2").alignment = {
  horizontal: "left",
}

worksheet.getCell("A3").alignment = {
  horizontal: "left",
}
worksheet.getCell("A2").font = {
  bold: true,
  size: 14,
}

worksheet.getCell("A3").font = {
  italic: true,
}

    worksheet.getColumn(1).width = 18
worksheet.getColumn(2).width = 40
worksheet.getColumn(3).width = 22
worksheet.getColumn(4).width = 15
worksheet.getColumn(5).width = 20
worksheet.getColumn(6).width = 25
worksheet.getColumn(7).width = 15
worksheet.getColumn(8).width = 15
worksheet.getColumn(9).width = 15
worksheet.getColumn(10).width = 18
worksheet.getColumn(11).width = 18
// mover encabezados de tabla a la fila 7
worksheet.spliceRows(7, 0, [])

const headerRow = worksheet.getRow(7)

headerRow.values = [
  "Código",
  "Proveedor",
  "N° Documento",
  "Detracción",
  "Forma de Pago",
  "Categorización",
  "Monto",
  "Saldo",
  "Estado",
  "Emisión",
  "Vencimiento",
]

for (let col = 1; col <= 11; col++) {
  const cell = headerRow.getCell(col)

  cell.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  }

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "1E3A8A",
    },
  }

  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
  }
}
worksheet.autoFilter = {
  from: "A7",
  to: "K7",
}

let filaActual = 8

rows.forEach((row: any) => {
  const excelRow = worksheet.getRow(filaActual)

  excelRow.values = [
    row.codigo,
    row.proveedor,
    row.numero_documento,
    row.detraccion,
    row.forma_pago,
    row.categorizacion,
    row.monto,
    row.saldo,
    row.estado,
    row.fecha_emision,
    row.fecha_vencimiento,
  ]

  excelRow.getCell(7).value =
  Number(row.monto || 0)

excelRow.getCell(8).value =
  Number(row.saldo || 0)

const formatoMoneda =
  row.moneda === "DOLARES"
    ? '"US$ " #,##0.00'
    : '"S/ " #,##0.00'

excelRow.getCell(7).numFmt = formatoMoneda
excelRow.getCell(8).numFmt = formatoMoneda

  excelRow.eachCell((cell) => {
  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  }
})

  if (row.estado === "PENDIENTE") {
    excelRow.getCell(9).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FEF3C7" },
    }
  }

  if (row.estado === "VENCIDO") {
    excelRow.getCell(9).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FECACA" },
    }
  }

  if (row.estado === "PAGADO") {
    excelRow.getCell(9).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "BBF7D0" },
    }
  }

  filaActual++
})

const totalMonto = rows.reduce(
  (acc: number, row: any) =>
    acc + Number(row.monto || 0),
  0
)

const totalSaldo = rows.reduce(
  (acc: number, row: any) =>
    acc + Number(row.saldo || 0),
  0
)
const formatoGeneral =
  moneda === "DOLARES"
    ? '"US$ " #,##0.00'
    : '"S/ " #,##0.00'

worksheet.getColumn(7).numFmt = formatoGeneral
worksheet.getColumn(8).numFmt = formatoGeneral

worksheet.getColumn(10).numFmt = "dd/mm/yyyy"
worksheet.getColumn(11).numFmt = "dd/mm/yyyy"

worksheet.getCell(`F${filaActual + 1}`).value =
  "TOTAL MONTO"

worksheet.getCell(`G${filaActual + 1}`).value =
  totalMonto

worksheet.getCell(`F${filaActual + 2}`).value =
  "TOTAL SALDO"

worksheet.getCell(`G${filaActual + 2}`).value =
  totalSaldo

const filaMonto = filaActual + 1
const filaSaldo = filaActual + 2

worksheet.getCell(`F${filaMonto}`).font = {
  bold: true,
}

worksheet.getCell(`G${filaMonto}`).font = {
  bold: true,
}

worksheet.getCell(`F${filaSaldo}`).font = {
  bold: true,
}

worksheet.getCell(`G${filaSaldo}`).font = {
  bold: true,
}

worksheet.getCell(`F${filaMonto}`).fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "D9EAD3" },
}

worksheet.getCell(`G${filaMonto}`).fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "D9EAD3" },
}

worksheet.getCell(`F${filaSaldo}`).fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "D9EAD3" },
}

worksheet.getCell(`G${filaSaldo}`).fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "D9EAD3" },
}

worksheet.views = [
  {
    state: "frozen",
    ySplit: 7,
  },
]
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          `attachment; filename=SEAMAR_CXP_${moneda}_${nombreMes}_${year}.xlsx`
      }
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        error: "Error al exportar"
      },
      {
        status: 500
      }
    )
  }
}