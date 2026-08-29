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
    const params: any[] = [inicio.toISOString().slice(0, 10), fin.toISOString().slice(0, 10)]

    let query = `
      SELECT
        cxc.codigo,
        c.razon_social AS cliente,
        p.nombre AS proyecto,
        cxc.numero_factura,
        cxc.descripcion,
        cxc.monto,
        cxc.saldo,
        cxc.moneda,
        cxc.estado,
        cxc.fecha_emision,
        cxc.fecha_vencimiento
      FROM cuentas_por_cobrar cxc
      LEFT JOIN clientes c ON cxc.cliente_id = c.id
      LEFT JOIN proyectos p ON cxc.proyecto_id = p.id
      WHERE cxc.fecha_emision >= ? AND cxc.fecha_emision < ?
    `

    if (moneda === "DOLARES" || moneda === "SOLES") {
      query += " AND cxc.moneda = ?"
      params.push(moneda)
    }

    const estado = searchParams.get("estado")
    if (estado && estado !== "TODOS") {
      query += " AND cxc.estado = ?"
      params.push(estado)
    }

    query += " ORDER BY cxc.fecha_emision ASC, cxc.id ASC"

    const [rows]: any = await pool.query(query, params)

    const nombreMes = MONTHS[month - 1]

    const columns: ExcelColumn[] = [
      { header: "Código", key: "codigo", width: 18 },
      { header: "Cliente", key: "cliente", width: 40 },
      { header: "Proyecto", key: "proyecto", width: 30 },
      { header: "N° Factura", key: "numero_factura", width: 22 },
      { header: "Descripción", key: "descripcion", width: 35 },
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
      { labelCol: 5, label: "TOTAL MONTO", valueCol: 6, value: totalMonto },
      { labelCol: 5, label: "TOTAL SALDO", valueCol: 6, value: totalSaldo },
    ]

    const config: ExcelReportConfig = {
      empresaNombre,
      titulo: "REPORTE DE CUENTAS POR COBRAR",
      periodo: `${nombreMes} ${year}`,
      columns,
      moneda: moneda || "SOLES",
      data: rows,
      monedaColumns: [6, 7],
      dateColumns: [9, 10],
      statusColumn: 8,
      statusStyles,
      totalRows,
    }

    const buffer = await buildExcelBuffer(config)
    const filename = `${empresaNombre ? empresaNombre.replace(/\s+/g, "_") + "_" : ""}CXC_${moneda === "DOLARES" ? "USD" : "SOLES"}_${nombreMes}_${year}.xlsx`
    return excelResponse(buffer, filename)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: "Error al exportar" }, { status: 500 })
  }
}