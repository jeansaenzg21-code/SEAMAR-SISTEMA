"use client"

import { useEffect, useState } from "react"
import ExcelJS from "exceljs"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getTemplateForClient, obtenerFormatoExportacion } from "@/lib/export-templates"

const NOMBRES_MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const COLOR_PRIMARIO = "FF1E40AF"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientes: { id: string | number; razon_social: string }[]
  valuations: any[]
  nombreUsuario?: string
}

export function ExportDialog({ open, onOpenChange, clientes, valuations, nombreUsuario }: ExportDialogProps) {
  const [selectedClient, setSelectedClient] = useState("")
  const [selectedMes, setSelectedMes] = useState("")
  const [selectedAnio, setSelectedAnio] = useState("")
  const [exportando, setExportando] = useState(false)

  const [aniosDisponibles, setAniosDisponibles] = useState<string[]>([])
  const [mesesDisponibles, setMesesDisponibles] = useState<string[]>([])
  const [cargandoFechas, setCargandoFechas] = useState(false)

  const cargarAnios = async () => {
    setCargandoFechas(true)
    try {
      const res = await fetch("/api/valorizaciones/fechas-disponibles")
      const data = await res.json()
      setAniosDisponibles(Array.isArray(data) ? data : [])
    } catch {
      setAniosDisponibles([])
    } finally {
      setCargandoFechas(false)
    }
  }

  const cargarMeses = async (anio: string) => {
    setCargandoFechas(true)
    try {
      const res = await fetch(`/api/valorizaciones/fechas-disponibles?anio=${anio}`)
      const data = await res.json()
      setMesesDisponibles(Array.isArray(data) ? data : [])
    } catch {
      setMesesDisponibles([])
    } finally {
      setCargandoFechas(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setSelectedClient("")
    setSelectedMes("")
    setSelectedAnio("")
    setAniosDisponibles([])
    setMesesDisponibles([])
    cargarAnios()
  }, [open])

  useEffect(() => {
    if (!selectedAnio) {
      setMesesDisponibles([])
      setSelectedMes("")
      return
    }
    setSelectedMes("")
    cargarMeses(selectedAnio)
  }, [selectedAnio])

  function normalizar(valor: string | undefined | null): string {
    return (valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
  }

  const conteo = (() => {
    if (!selectedClient) return 0
    const periodo = (!selectedMes || selectedMes === "all") ? selectedAnio : `${selectedAnio}-${selectedMes}`
    return valuations.filter((v: any) => {
      const coincideCliente = normalizar(v.client) === normalizar(selectedClient)
      if (!coincideCliente) return false
      if (!periodo) return true
      return (v.date || "").startsWith(periodo)
    }).length
  })()

  const puedeExportar = selectedClient && selectedAnio && conteo > 0

  const generarExcel = async () => {
    if (!puedeExportar) return
    setExportando(true)

    try {
      const template = getTemplateForClient(selectedClient)

      const periodoFiltro = (!selectedMes || selectedMes === "all") ? selectedAnio : `${selectedAnio}-${selectedMes}`
      const filtradas = valuations.filter((v: any) => {
        const coincideCliente = normalizar(v.client) === normalizar(selectedClient)
        if (!coincideCliente) return false
        if (!periodoFiltro) return true
        return (v.date || "").startsWith(periodoFiltro)
      })

      const rows = filtradas.map((item: any) => {
        const row = template.formatRow(item)
        return template.columns.map((c) => row[c.key] ?? "")
      })

      const workbook = new ExcelJS.Workbook()
      workbook.creator = nombreUsuario || "Sistema"
      workbook.created = new Date()

      const ws = workbook.addWorksheet(template.sheetName)

      ws.getColumn(1).width = 2

      const periodoTexto = !selectedMes || selectedMes === "all"
        ? selectedAnio
        : `${NOMBRES_MESES[Number(selectedMes) - 1]} ${selectedAnio}`

      const info = [
        ["Cliente:", selectedClient],
        ["Período:", periodoTexto],
        ["Fecha de exportación:", new Date().toLocaleString("es-PE", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })],
        ["Usuario:", nombreUsuario || "Sistema"],
        ["Cantidad de valorizaciones:", String(conteo)],
      ]

      for (const [label, value] of info) {
        const row = ws.addRow([label, value])
        row.getCell(1).font = { bold: true, size: 11 }
        row.getCell(2).font = { size: 11 }
      }

      ws.addRow([])

      const headerCells = ["", ...template.columns.map((c) => c.header)]
      const headerRow = ws.addRow(headerCells)
      headerRow.height = 28

      for (let c = 2; c <= template.columns.length + 1; c++) {
        const cell = headerRow.getCell(c)
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLOR_PRIMARIO },
        }
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 }
        cell.alignment = { vertical: "middle", horizontal: "center" }
        cell.border = {
          top: { style: "thin", color: { argb: "FFCCCCCC" } },
          left: { style: "thin", color: { argb: "FFCCCCCC" } },
          bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
          right: { style: "thin", color: { argb: "FFCCCCCC" } },
        }
      }

      const headerRowNumber = info.length + 2

      for (let i = 0; i < rows.length; i++) {
        const rowData = rows[i]
        const rowCells = ["", ...rowData]
        const excelRow = ws.addRow(rowCells)
        excelRow.height = 22

        for (let c = 2; c <= template.columns.length + 1; c++) {
          const cell = excelRow.getCell(c)
          cell.border = {
            top: { style: "thin", color: { argb: "FFCCCCCC" } },
            left: { style: "thin", color: { argb: "FFCCCCCC" } },
            bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
            right: { style: "thin", color: { argb: "FFCCCCCC" } },
          }
          cell.alignment = { vertical: "middle" }

          if (i % 2 === 0) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8FAFC" },
            }
          }
        }
      }

      for (let c = 2; c <= template.columns.length + 1; c++) {
        const colKey = template.columns[c - 2].key
        let maxLen = template.columns[c - 2].header.length
        for (const row of rows) {
          const val = String(row[c - 2] ?? "")
          if (val.length > maxLen) maxLen = val.length
        }
        const width = Math.min(Math.max(maxLen + 3, 10), 45)
        ws.getColumn(c).width = width
      }

      ws.autoFilter = {
        from: { row: headerRowNumber, column: 2 },
        to: { row: headerRowNumber, column: template.columns.length + 1 },
      }

      ws.views = [{ state: "frozen", ySplit: headerRowNumber }]

      ws.pageSetup = { orientation: "landscape", fitToPage: true, margins: {
        left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3,
      }}

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const sufijoMes = (!selectedMes || selectedMes === "all") ? "todo-el-ano" : selectedMes
      a.download = `valorizaciones-${selectedClient}-${selectedAnio}-${sufijoMes}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)

      onOpenChange(false)
    } catch (error) {
      console.error("Error al exportar:", error)
      alert("Error al generar el archivo Excel")
    } finally {
      setExportando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[26.25rem]">
        <DialogHeader>
          <DialogTitle>Exportar valorizaciones</DialogTitle>
          <DialogDescription>
            Selecciona el cliente y período para generar el Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={String(c.id)} value={c.razon_social}>
                    {c.razon_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Año</Label>
              <Select value={selectedAnio} onValueChange={setSelectedAnio} disabled={cargandoFechas}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={cargandoFechas ? "Cargando..." : "Año"} />
                </SelectTrigger>
                <SelectContent>
                  {aniosDisponibles.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mes</Label>
              <Select value={selectedMes} onValueChange={setSelectedMes} disabled={!selectedAnio || cargandoFechas}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={cargandoFechas ? "Cargando..." : "Mes"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los meses</SelectItem>
                  {mesesDisponibles.map((m) => (
                    <SelectItem key={m} value={m}>
                      {NOMBRES_MESES[Number(m) - 1] || m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedClient && selectedAnio && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium text-foreground text-right max-w-[200px] truncate">{selectedClient}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Período:</span>
                <span className="font-medium text-foreground">
                  {!selectedMes || selectedMes === "all" ? selectedAnio : `${NOMBRES_MESES[Number(selectedMes) - 1]} ${selectedAnio}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registros encontrados:</span>
                <span className="font-medium text-foreground">{conteo} valorización{conteo !== 1 ? "es" : ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Formato:</span>
                <span className="font-medium text-foreground">{obtenerFormatoExportacion(selectedClient)}</span>
              </div>
              {conteo === 0 && (
                <p className="text-xs text-destructive text-center">
                  No existen valorizaciones para los filtros seleccionados.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-[44px] flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button
            onClick={generarExcel}
            disabled={!puedeExportar || exportando}
            className="min-h-[44px] flex-1 sm:flex-none"
          >
            {exportando ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...</>
            ) : (
              "Exportar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
