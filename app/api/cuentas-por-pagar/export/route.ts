import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/mysql"
import { buildExcelBuffer, excelResponse } from "@/lib/excel-export"
import type { ExcelColumn, ExcelReportConfig, ExcelStatusStyle, ExcelTotalRow } from "@/lib/excel-export"
import { normalizarMoneda } from "@/lib/moneda"

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export async function GET(request: NextRequest) {
  try {
    const [empresaRows]: any = await pool.query("SELECT nombre_comercial FROM empresa LIMIT 1")
    const empresaNombre = empresaRows[0]?.nombre_comercial || ""

    const { searchParams } = new URL(request.url)
    const year = Number(searchParams.get("year"))
    const month = Number(searchParams.get("month"))
    const moneda = normalizarMoneda(searchParams.get("moneda")) ?? "SOLES"

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Debe indicar año y mes" }, { status: 400 })
    }

    const inicio = new Date(Date.UTC(year, month - 1, 1))
    const fin = new Date(Date.UTC(year, month, 1))

    const [rows]: any = await pool.query(
      `SELECT
        cxp.codigo,
        pr.razon_social AS proveedor,
        cxp.numero_documento,
        cxp.detraccion,
        cxp.forma_pago,
        cxp.categorizacion,
        cxp.monto,
        cxp.moneda,
        cxp.saldo,
        cxp.estado,
        cxp.fecha_emision,
        cxp.fecha_vencimiento
      FROM cuentas_por_pagar cxp
      LEFT JOIN proveedores pr ON cxp.proveedor_id = pr.id
      WHERE cxp.fecha_emision >= ? AND cxp.fecha_emision < ? AND cxp.moneda = ?
      ORDER BY cxp.fecha_emision ASC, cxp.id ASC`,
      [inicio.toISOString().slice(0, 10), fin.toISOString().slice(0, 10), moneda]
    )

    const nombreMes = MONTHS[month - 1]

    const columns: ExcelColumn[] = [
      { header: "Código", key: "codigo", width: 18 },
      { header: "Proveedor", key: "proveedor", width: 40 },
      { header: "N° Documento", key: "numero_documento", width: 22 },
      { header: "Detracción", key: "detraccion", width: 15 },
      { header: "Forma de Pago", key: "forma_pago", width: 20 },
      { header: "Categorización", key: "categorizacion", width: 25 },
      { header: "Monto", key: "monto", width: 15 },
      { header: "Saldo", key: "saldo", width: 15 },
      { header: "Estado", key: "estado", width: 15 },
      { header: "Emisión", key: "fecha_emision", width: 18 },
      { header: "Vencimiento", key: "fecha_vencimiento", width: 18 },
    ]

    const statusStyles: ExcelStatusStyle[] = [
      { value: "PENDIENTE", fill: "FEF3C7" },
      { value: "VENCIDO", fill: "FECACA" },
      { value: "PAGADO", fill: "BBF7D0" },
    ]

    const totalMonto = rows.reduce((acc: number, r: any) => acc + Number(r.monto || 0), 0)
    const totalSaldo = rows.reduce((acc: number, r: any) => acc + Number(r.saldo || 0), 0)

    const totalRows: ExcelTotalRow[] = [
      { labelCol: 6, label: "TOTAL MONTO", valueCol: 7, value: totalMonto },
      { labelCol: 6, label: "TOTAL SALDO", valueCol: 7, value: totalSaldo },
    ]

    const config: ExcelReportConfig = {
      empresaNombre,
      titulo: "REPORTE DE CUENTAS POR PAGAR",
      periodo: `${nombreMes} ${year}`,
      columns,
      moneda,
      data: rows,
      monedaColumns: [7, 8],
      dateColumns: [10, 11],
      statusColumn: 9,
      statusStyles,
      totalRows,
    }

    const buffer = await buildExcelBuffer(config)
    const filename = `${empresaNombre ? empresaNombre.replace(/\s+/g, "_") + "_" : ""}CXP_${moneda === "DOLARES" ? "USD" : "SOLES"}_${nombreMes}_${year}.xlsx`
    return excelResponse(buffer, filename)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: "Error al exportar" }, { status: 500 })
  }
}