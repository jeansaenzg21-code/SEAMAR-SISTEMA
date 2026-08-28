"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  CalendarDays,
  Check,
  X,
  Wallet,
  Clock,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
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

type Moneda = "SOLES" | "DOLARES"
type Prioridad = "VENCIDO" | "VENCE_HOY" | "PROXIMO" | "PENDIENTE"
type ProgramacionEstado = "NO_PROGRAMADA" | "PARCIAL" | "PROGRAMADA"

type Obligacion = {
  id: string
  codigo: string
  proveedor: string
  proyecto?: string | null
  numero_documento: string
  monto: number
  saldo: number
  moneda: Moneda
  fecha_vencimiento: string | null
  monto_programado: number
  disponible: number
  prioridad: Prioridad
  dias_vencimiento: number | null
  programacion_estado: ProgramacionEstado
}

type FiltroOpcion = { id: number; nombre: string }

type DiaCalendario = {
  dia: number
  fecha: string
  total_soles: number
  total_dolares: number
  items: Obligacion[]
}

type PagoProgramado = {
  id: string
  cuenta_por_pagar_id: string
  codigo: string | null
  proveedor: string | null
  numero_documento: string | null
  moneda: Moneda
  monto: number
  estado: "PROGRAMADO" | "PENDIENTE" | "VENCIDO" | "PAGADO" | "CANCELADO"
  fecha_programada: string
  forma_pago: string | null
}

type DiaProgramacion = {
  dia: number
  fecha: string
  total_soles: number
  total_dolares: number
  items: PagoProgramado[]
}

type DiaVista = {
  fecha: string
  vencimientos: Obligacion[]
  pagos: PagoProgramado[]
}

type DatosAPI = {
  success: boolean
  mes: { year: number; month: number; dias_en_mes: number }
  calendario_mes: DiaCalendario[]
  programaciones_mes: DiaProgramacion[]
  kpi: {
    vencidos_count: number
    vence_hoy_count: number
    proximos_count: number
    total_pendiente_soles: number
    total_pendiente_dolares: number
  }
  filtros: { proveedores: FiltroOpcion[]; proyectos: FiltroOpcion[] }
  hoy: string
}

const DIAS_LABEL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const MESES_LABEL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMonto(monto: number, moneda: Moneda): string {
  const valor = Number(monto || 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return moneda === "DOLARES" ? `US$ ${valor}` : `S/ ${valor}`
}

function formatFecha(fecha?: string | null): string {
  if (!fecha) return "-"
  const solo = String(fecha).slice(0, 10)
  const [y, m, d] = solo.split("-")
  return `${d}/${m}/${y}`
}

// ---------------------------------------------------------------------------
// Identidad visual del calendario
// ---------------------------------------------------------------------------

function claseDia(prioridad: Prioridad): string {
  switch (prioridad) {
    case "VENCIDO":
      return "bg-red-500/15 text-red-300 border-red-500/30"
    case "VENCE_HOY":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30"
    case "PROXIMO":
      return "bg-blue-500/15 text-blue-300 border-blue-500/30"
    default:
      return "bg-secondary/60 text-foreground border-border"
  }
}

function EtiquetaPrioridad({ prioridad }: { prioridad: Prioridad }) {
  const label: Record<Prioridad, string> = {
    VENCIDO: "Vencido",
    VENCE_HOY: "Vence hoy",
    PROXIMO: "Próximo",
    PENDIENTE: "Pendiente",
  }
  const cls: Record<Prioridad, string> = {
    VENCIDO: "bg-red-500/15 text-red-300 border-red-500/30",
    VENCE_HOY: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    PROXIMO: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    PENDIENTE: "bg-secondary text-muted-foreground border-border",
  }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", cls[prioridad])}>
      {prioridad === "VENCIDO" && <AlertTriangle className="h-3 w-3" />}
      {prioridad === "VENCE_HOY" && <Clock className="h-3 w-3" />}
      {label[prioridad]}
    </span>
  )
}

function BadgeProgramacion({ estado }: { estado: ProgramacionEstado }) {
  if (estado === "NO_PROGRAMADA") {
    return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Por programar</span>
  }
  if (estado === "PARCIAL") {
    return <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-300"><Wallet className="h-3 w-3" /> Parcial</span>
  }
  return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300"><Check className="h-3 w-3" /> Programada</span>
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function PaymentSchedulingContent() {
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [datos, setDatos] = useState<DatosAPI | null>(null)

  // Estado del calendario
  const [vistaAnio, setVistaAnio] = useState<number>(() => new Date().getFullYear())
  const [vistaMes, setVistaMes] = useState<number>(() => new Date().getMonth())

  // Filtros
  const [q, setQ] = useState("")
  const [fMoneda, setFMoneda] = useState("")
  const [soloNoProgramadas, setSoloNoProgramadas] = useState(false)

  // Bandeja del día
  const [diaSeleccionado, setDiaSeleccionado] = useState<DiaVista | null>(null)
  const [seleccionDia, setSeleccionDia] = useState<Set<string>>(new Set())

  // Programación
  const [dialogoProgramar, setDialogoProgramar] = useState(false)
  const [programarFecha, setProgramarFecha] = useState("")
  const [programarForma, setProgramarForma] = useState("TRANSFERENCIA")
  const [montos, setMontos] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const params = new URLSearchParams({ year: String(vistaAnio), month: String(vistaMes) })
      if (fMoneda) params.set("moneda", fMoneda)
      if (q.trim()) params.set("documento", q.trim())
      if (soloNoProgramadas) params.set("incluirProgramadas", "false")

      const res = await fetch(`/api/programacion-pagos?${params.toString()}`)
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Error al cargar")
      setDatos(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar")
    } finally {
      setCargando(false)
    }
  }, [vistaAnio, vistaMes, fMoneda, q, soloNoProgramadas])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Construcción de la cuadrícula del mes
  const celdas = useMemo(() => {
    if (!datos) return []
    const { year, month, dias_en_mes } = datos.mes
    const porDia = new Map(datos.calendario_mes.map((d) => [d.dia, d]))
    const pagosPorDia = new Map(datos.programaciones_mes.map((d) => [d.dia, d.items]))
    // Día de la semana del 1ro (lunes=0)
    const offset = (new Date(year, month, 1).getDay() + 6) % 7
    const celdas: ({
      clave: string
      dia: number | null
      info: DiaCalendario | null
      pagos: PagoProgramado[]
      esHoy: boolean
    } | null)[] = []
    for (let i = 0; i < offset; i++) celdas.push(null)
    for (let d = 1; d <= dias_en_mes; d++) {
      const fechaISO = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      celdas.push({
        clave: fechaISO,
        dia: d,
        info: porDia.get(d) || null,
        pagos: pagosPorDia.get(d) || [],
        esHoy: datos.hoy === fechaISO,
      })
    }
    return celdas
  }, [datos])

  const mesActual = useMemo(() => {
    const now = new Date()
    return vistaAnio === now.getFullYear() && vistaMes === now.getMonth()
  }, [vistaAnio, vistaMes])

  const navegarMes = (delta: number) => {
    let m = vistaMes + delta
    let y = vistaAnio
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setVistaMes(m)
    setVistaAnio(y)
  }

  const irHoy = () => {
    const now = new Date()
    setVistaMes(now.getMonth())
    setVistaAnio(now.getFullYear())
  }

  const abrirDia = (info: DiaCalendario | null, pagos: PagoProgramado[]) => {
    setSeleccionDia(new Set())
    setMontos({})
    setDiaSeleccionado({
      fecha: info ? info.fecha : "",
      vencimientos: info ? info.items : [],
      pagos,
    })
  }

  const alternarSeleccion = (id: string) => {
    setSeleccionDia((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const seleccionados = useMemo(
    () => (diaSeleccionado ? diaSeleccionado.vencimientos.filter((o) => seleccionDia.has(o.id)) : []),
    [diaSeleccionado, seleccionDia]
  )

  const abrirProgramar = () => {
    setProgramarFecha(new Date().toISOString().slice(0, 10))
    setProgramarForma("TRANSFERENCIA")
    setMontos({})
    setAviso(null)
    setDialogoProgramar(true)
  }

  const guardarProgramacion = async () => {
    if (seleccionados.length === 0) return
    setGuardando(true)
    setAviso(null)
    try {
      const items = seleccionados.map((o) => ({
        cuenta_por_pagar_id: Number(o.id),
        monto: Number(montos[o.id] ?? o.disponible),
      }))
      const res = await fetch("/api/programacion-pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha_programada: programarFecha,
          forma_pago: programarForma,
          items,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Error al programar")
      setDialogoProgramar(false)
      setAviso({ tipo: "ok", texto: `${json.creados?.length || items.length} obligacion(es) programada(s) correctamente.` })
      setDiaSeleccionado(null)
      cargar()
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof Error ? e.message : "Error al programar" })
    } finally {
      setGuardando(false)
    }
  }

  const kpi = datos?.kpi
  const totalSoles = kpi ? kpi.total_pendiente_soles : 0
  const totalDolares = kpi ? kpi.total_pendiente_dolares : 0

  return (
    <Card className="border-border bg-background">
      <CardContent className="p-3 sm:p-4">
        {/* Header compacto: título + navegación mes */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
            <h1 className="truncate text-base font-semibold tracking-tight">Programación de Pagos</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={irHoy} disabled={mesActual}>
              Hoy
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navegarMes(-1)} aria-label="Mes anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="w-36 text-center text-sm font-semibold">
              {MESES_LABEL[vistaMes]} {vistaAnio}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navegarMes(1)} aria-label="Mes siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Resumen: una sola línea con 4 chips delgados */}
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          <div className="flex items-center justify-between gap-1 rounded-md border border-red-500/20 bg-red-500/5 px-2 py-1">
            <span className="truncate text-[11px] text-muted-foreground">Vencidos</span>
            <span className="text-xs font-semibold text-red-400">{kpi?.vencidos_count ?? 0}</span>
          </div>
          <div className="flex items-center justify-between gap-1 rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1">
            <span className="truncate text-[11px] text-muted-foreground">Hoy</span>
            <span className="text-xs font-semibold text-amber-300">{kpi?.vence_hoy_count ?? 0}</span>
          </div>
          <div className="flex items-center justify-between gap-1 rounded-md border border-blue-500/20 bg-blue-500/5 px-2 py-1">
            <span className="truncate text-[11px] text-muted-foreground">Próx. 7 días</span>
            <span className="text-xs font-semibold text-blue-300">{kpi?.proximos_count ?? 0}</span>
          </div>
          <div className="rounded-md border border-border bg-secondary/50 px-2 py-1">
            <span className="block truncate text-[10px] text-muted-foreground">Pendiente · {MESES_LABEL[vistaMes]}</span>
            <div className="mt-0.5 space-y-0.5 text-right">
              <span className="block text-xs font-semibold">{formatMonto(totalSoles, "SOLES")}</span>
              {totalDolares > 0 && (
                <span className="block text-[11px] font-medium text-muted-foreground">{formatMonto(totalDolares, "DOLARES")}</span>
              )}
            </div>
          </div>
        </div>

        {/* Filtros: una línea compacta */}
        <div className="mt-2 flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Documento..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>
          <Select value={fMoneda} onValueChange={(v) => setFMoneda(v === "__todos" ? "" : v)}>
            <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Moneda" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos">Todas</SelectItem>
              <SelectItem value="SOLES">Soles</SelectItem>
              <SelectItem value="DOLARES">Dólares</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
            <Checkbox className="h-3.5 w-3.5" checked={soloNoProgramadas} onCheckedChange={(v) => setSoloNoProgramadas(v === true)} />
            No programadas
          </label>
        </div>

        {/* Error / Cargando / Calendario */}
        {error && (
          <p className="mt-6 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">{error}</p>
        )}

        {cargando ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : datos ? (
          <>
            {/* Días de la semana */}
            <div className="mt-3 grid grid-cols-7 gap-1">
              {DIAS_LABEL.map((d) => (
                <div key={d} className="text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{d}</div>
              ))}
            </div>
            {/* Celdas */}
            <div className="mt-0.5 grid grid-cols-7 gap-1">
              {celdas.map((celda, idx) => {
                if (!celda) return <div key={`v${idx}`} />
                const hayItems = !!celda.info
                const hayPagos = celda.pagos.length > 0
                const esVencido = celda.info?.items.some((i) => i.prioridad === "VENCIDO")
                const esHoy = celda.info?.items.some((i) => i.prioridad === "VENCE_HOY")
                const totalPagosSoles = celda.pagos.filter((p) => p.moneda !== "DOLARES").reduce((s, p) => s + p.monto, 0)
                const totalPagosDolares = celda.pagos.filter((p) => p.moneda === "DOLARES").reduce((s, p) => s + p.monto, 0)
                return (
                  <button
                    key={celda.clave}
                    onClick={() => abrirDia(celda.info, celda.pagos)}
                    className={cn(
                      "relative flex min-h-[58px] flex-col items-stretch gap-0.5 rounded-md border p-1 text-left transition-colors",
                      hayItems || hayPagos
                        ? "cursor-pointer hover:border-primary/60 hover:bg-primary/5"
                        : "cursor-default border-border/50 bg-background/40",
                      celda.esHoy && !hayItems && !hayPagos && "border-primary/50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium",
                        celda.esHoy ? (hayItems || hayPagos ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary") : "text-muted-foreground",
                      )}
                    >
                      {celda.dia}
                    </span>
                    {celda.info && (
                      <>
                        <div className="flex flex-col gap-0.5">
                          {celda.info.total_soles > 0 && (
                            <span className={cn("block w-full truncate rounded px-1 py-0.5 text-[9px] font-semibold", claseDia(esVencido ? "VENCIDO" : esHoy ? "VENCE_HOY" : "PROXIMO"))}>
                              S/ {celda.info.total_soles.toLocaleString("es-PE", { maximumFractionDigits: 0 })}
                            </span>
                          )}
                          {celda.info.total_dolares > 0 && (
                            <span className={cn("block w-full truncate rounded px-1 py-0.5 text-[9px] font-semibold", claseDia(esVencido ? "VENCIDO" : esHoy ? "VENCE_HOY" : "PROXIMO"))}>
                              US$ {celda.info.total_dolares.toLocaleString("es-PE", { maximumFractionDigits: 0 })}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                    {hayPagos && (
                      <div className="flex flex-col gap-0.5">
                        {totalPagosSoles > 0 && (
                          <span className="block w-full truncate rounded border border-violet-500/30 bg-violet-500/10 px-1 py-0.5 text-[9px] font-semibold text-violet-300">
                            Pagar S/ {totalPagosSoles.toLocaleString("es-PE", { maximumFractionDigits: 0 })}
                          </span>
                        )}
                        {totalPagosDolares > 0 && (
                          <span className="block w-full truncate rounded border border-violet-500/30 bg-violet-500/10 px-1 py-0.5 text-[9px] font-semibold text-violet-300">
                            Pagar US$ {totalPagosDolares.toLocaleString("es-PE", { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>
                    )}
                    {hayPagos && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-violet-400" />}
                  </button>
                )
              })}
            </div>

            {/* Leyenda */}
            <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Vencido</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Vence hoy</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Próximo (7 días)</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" /> Pago programado</span>
              <span className="ml-auto">{datos.calendario_mes.length} día(s) con vencimientos · {datos.programaciones_mes.length} con pagos</span>
            </div>
          </>
        ) : null}
      </CardContent>

      {/* BANDEJA DEL DÍA */}
      <Dialog open={!!diaSeleccionado} onOpenChange={(o) => { if (!o) setDiaSeleccionado(null) }}>
        <DialogContent className="w-full sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {formatFecha(diaSeleccionado ? diaSeleccionado.fecha : "")}
            </DialogTitle>
            <DialogDescription>
              Pagos programados y vencimientos para este día.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
          {/* Pagos programados de este día */}
          {diaSeleccionado && diaSeleccionado.pagos.length > 0 && (
            <div className="min-w-0">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-300">
                <Wallet className="h-3.5 w-3.5" /> Pagos programados ({diaSeleccionado.pagos.length})
              </p>
              <div className="overflow-hidden rounded-lg border border-violet-500/20 bg-violet-500/5">
                <table className="w-full">
                  <thead className="bg-background">
                  <tr className="border-b border-border text-left text-[10px] text-muted-foreground">
                    <th className="px-2 py-1.5 text-left">Proveedor</th>
                    <th className="px-2 py-1.5 text-center">Documento</th>
                    <th className="px-2 py-1.5 text-center">Monto</th>
                    <th className="px-2 py-1.5 text-center">Forma</th>
                    <th className="px-2 py-1.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {diaSeleccionado.pagos.map((p) => (
                    <tr key={p.id} className="border-b border-border/50 last:border-0">
                      <td className="break-words px-2 py-1.5 align-middle text-[11px] font-medium leading-snug">{p.proveedor || "-"}</td>
                      <td className="px-2 py-1.5 text-center align-middle text-[11px] text-muted-foreground">{p.numero_documento || "-"}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-center align-middle text-[11px] font-medium">{formatMonto(p.monto, p.moneda)}</td>
                      <td className="px-2 py-1.5 text-center align-middle text-[11px]">{p.forma_pago || "-"}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-center align-middle">
                        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                          {p.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Obligaciones que vencen este día */}
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Vencimientos ({diaSeleccionado?.vencimientos.length ?? 0})
            </p>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full">
                <thead className="bg-background">
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="w-8 px-2 py-2">
                      <Checkbox
                        checked={diaSeleccionado ? seleccionDia.size === diaSeleccionado.vencimientos.length && diaSeleccionado.vencimientos.length > 0 : false}
                        onCheckedChange={(v) => {
                          if (!diaSeleccionado) return
                          if (v) setSeleccionDia(new Set(diaSeleccionado.vencimientos.map((i) => i.id)))
                          else setSeleccionDia(new Set())
                        }}
                      />
                    </th>
                    <th className="px-2 py-2">Proveedor</th>
                    <th className="px-2 py-2">Documento</th>
                    <th className="px-2 py-2 text-right">Saldo</th>
                    <th className="px-2 py-2">Prg.</th>
                  </tr>
                </thead>
                <tbody>
                  {diaSeleccionado?.vencimientos.map((o) => (
                    <tr key={o.id} className={cn("border-b border-border/60 last:border-0", seleccionDia.has(o.id) && "bg-primary/5")}>
                      <td className="px-2 py-2 align-top">
                        <Checkbox checked={seleccionDia.has(o.id)} onCheckedChange={() => alternarSeleccion(o.id)} />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <p className="break-words font-medium leading-snug">{o.proveedor}</p>
                        <p className="break-words text-xs leading-snug text-muted-foreground">{o.numero_documento}{o.proyecto ? ` · ${o.proyecto}` : ""}</p>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <p className="text-sm font-medium leading-snug">{o.numero_documento}</p>
                        <p className="text-sm leading-snug text-muted-foreground">{o.codigo}</p>
                      </td>
                      <td className="px-2 py-2 text-right align-top text-xs font-medium">{formatMonto(o.saldo, o.moneda)}</td>
                      <td className="px-2 py-2 align-top"><BadgeProgramacion estado={o.programacion_estado} /></td>
                    </tr>
                  ))}
                  {diaSeleccionado && diaSeleccionado.vencimientos.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-4 text-center text-sm text-muted-foreground">No hay obligaciones que venzan este día.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {seleccionados.length > 0
                ? `${seleccionados.length} seleccionada(s)`
                : "Selecciona obligaciones para programar"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDiaSeleccionado(null)}>Cerrar</Button>
              <Button onClick={abrirProgramar} disabled={seleccionados.length === 0}>
                <Wallet className="mr-1 h-4 w-4" /> Programar pago
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL PROGRAMAR */}
      <Dialog open={dialogoProgramar} onOpenChange={(o) => { if (!o && !guardando) setDialogoProgramar(false) }}>
        <DialogContent className="w-full sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">Programar pago</DialogTitle>
            <DialogDescription>
              Define la fecha y el monto a programar para cada obligación seleccionada.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Fecha programada</label>
              <Input type="date" value={programarFecha} onChange={(e) => setProgramarFecha(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Forma de pago</label>
              <Select value={programarForma} onValueChange={setProgramarForma}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-1 overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <thead className="bg-background">
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Proveedor / Documento</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                  <th className="px-3 py-2 text-right">Monto a programar</th>
                </tr>
              </thead>
              <tbody>
                {seleccionados.map((o) => {
                  const valor = montos[o.id] ?? String(o.disponible)
                  const numerico = Number(valor) || 0
                  const invalido = numerico <= 0 || numerico > o.disponible
                  return (
                    <tr key={o.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2">
                        <p className="break-words font-medium leading-snug">{o.proveedor}</p>
                        <p className="break-words text-xs leading-snug text-muted-foreground">{o.numero_documento} · disp. {formatMonto(o.disponible, o.moneda)}</p>
                      </td>
                      <td className="px-3 py-2 text-right align-top">{formatMonto(o.disponible, o.moneda)}</td>
                      <td className="px-3 py-2 align-top">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={valor}
                          onChange={(e) => setMontos((m) => ({ ...m, [o.id]: e.target.value }))}
                          className={cn("text-right", invalido && "border-red-500/50")}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {aviso && (
            <p className={cn("rounded-md border px-3 py-2 text-sm", aviso.tipo === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300")}>
              {aviso.texto}
            </p>
          )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogoProgramar(false)} disabled={guardando}>
              <X className="mr-1 h-4 w-4" /> Cancelar
            </Button>
            <Button onClick={guardarProgramacion} disabled={guardando || seleccionados.some((o) => { const v = Number(montos[o.id] ?? o.disponible) || 0; return v <= 0 || v > o.disponible })}>
              {guardando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
              Programar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
