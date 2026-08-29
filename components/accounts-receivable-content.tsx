"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { cacheGet, cacheSet } from "@/lib/simple-cache"
import {
  Filter,
  Download,
  Search,
  Eye,
  CalendarDays,
  FilePlus2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { EventoSincronizacion } from "@/components/sincronizacion-dialog"
import { ImportarFacturaDialog } from "@/components/importar-factura-dialog"
import { EditarVencimiento } from "@/components/editar-vencimiento"

type Status =
  | "PENDIENTE"
  | "VENCIDO"
  | "FACTURADO"

type CuentaPorCobrar = {
  id: string
  codigo: string
  cliente: string
  proyecto?: string | null
  servicio?: string | null
  numero_factura: string
  descripcion?: string | null
  detraccion?: number | null
  forma_pago?: string | null
  categorizacion?: string | null

  monto: number
  moneda: "SOLES" | "DOLARES"

  saldo: number

  estado: Status
  fecha_emision: string
  fecha_vencimiento: string
  vencimiento_origen?: "FACTURA" | "SISTEMA" | "MANUAL" | null

  archivo_onedrive_id?: string | null
  archivo_nombre?: string | null
  archivo_url: string
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

function StatusBadge({ status }: { status: Status }) {
  const label = {
    PENDIENTE: "Pendiente",
    VENCIDO: "Vencido",
    FACTURADO: "Facturado",
  }

  const styles = {
    PENDIENTE: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    VENCIDO: "bg-red-500/10 text-red-400 border-red-500/20",
    FACTURADO: "bg-green-500/10 text-green-400 border-green-500/20",
  }

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {label[status]}
    </span>
  )
}

function ServicioBadge({ servicio }: { servicio?: string | null }) {
  if (!servicio) {
    return (
      <span className="rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-xs text-muted-foreground">
        Sin asignar
      </span>
    )
  }

  return (
    <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-foreground/90">
      {servicio}
    </span>
  )
}

// Badge de detracción: Sí (true) / No (false o null/undefined)
function DetraccionBadge({
  detraccion,
  moneda,
}: {
  detraccion?: number | null
  moneda: "SOLES" | "DOLARES"
}) {

  const tieneDetraccion =
    detraccion !== null &&
    detraccion !== undefined &&
    Number(detraccion) > 0

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
        tieneDetraccion
          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
          : "bg-secondary/60 text-muted-foreground border-border"
      }`}
    >
      {tieneDetraccion
        ? `${moneda === "DOLARES" ? "US$" : "S/"} ${Number(detraccion).toLocaleString("es-PE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : "No"}
    </span>
  )
}

export function AccountsReceivableContent() {
  const [rows, setRows] = useState<CuentaPorCobrar[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [nuevosIds, setNuevosIds] =
  useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState("all")
  const [clientFilter, setClientFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [resumen, setResumen] = useState<{
    years: { year: number; count: number }[]
    months: { month: number; count: number }[]
    days: { day: number; count: number }[]
  }>({ years: [], months: [], days: [] })

  const [clientes, setClientes] = useState<any[]>([])
  const [mostrarResumen, setMostrarResumen] =
  useState(false);

const [resultadoSync, setResultadoSync] =
  useState<any>(null);

const [sincronizando, setSincronizando] =
  useState(false);

const [eventos, setEventos] =
  useState<EventoSincronizacion[]>([]);

const [documentosDetectados, setDocumentosDetectados] =
  useState(0);

const [sincronizacionId, setSincronizacionId] =
  useState<number | null>(null);

const [mostrarExportar, setMostrarExportar] =
  useState(false);
const [mostrarImportar, setMostrarImportar] = useState(false)

const [monedaExportar, setMonedaExportar] =
  useState<"SOLES" | "DOLARES">("SOLES");

  // ---- Navegación documental: año / mes / día ----
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Debounce de la búsqueda: la búsqueda se resuelve en el servidor (prefijo),
  // nunca se recorre el listado completo en el navegador.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const tieneFiltros =
    statusFilter !== "all" ||
    clientFilter !== "all" ||
    debouncedSearch.trim() !== "" ||
    selectedYear !== null ||
    selectedMonth !== null ||
    selectedDay !== null

  const paramsResumen = useMemo(() => {
    const p = new URLSearchParams()
    if (statusFilter !== "all") p.set("estado", statusFilter)
    if (clientFilter !== "all") p.set("cliente", clientFilter)
    if (debouncedSearch.trim()) p.set("q", debouncedSearch.trim())
    if (selectedYear !== null) p.set("year", String(selectedYear))
    if (selectedMonth !== null) p.set("month", String(selectedMonth + 1))
    return p
  }, [statusFilter, clientFilter, debouncedSearch, selectedYear, selectedMonth])

  const paramsRows = useMemo(() => {
    const p = new URLSearchParams(paramsResumen)
    if (selectedDay !== null) p.set("day", String(selectedDay))
    p.set("page", String(currentPage))
    p.set("pageSize", "50")
    return p
  }, [paramsResumen, selectedDay, currentPage])

  const cargarResumen = useCallback(async () => {
    try {
      const response = await fetch(`/api/cuentas-por-cobrar/resumen?${paramsResumen}`, {
        cache: "no-store",
      })
      if (!response.ok) return
      const data = await response.json()
      if (data.success === false) return
      setResumen({
        years: data.years || [],
        months: data.months || [],
        days: data.days || [],
      })
    } catch (error) {
      console.error(error)
    }
  }, [paramsResumen])

  useEffect(() => {
    cargarResumen()
  }, [cargarResumen])

  const cargarCuentasPorCobrar = useCallback(
    async (cantidadNueva = 0) => {
      if (!tieneFiltros) {
        setRows([])
        setTotal(0)
        return
      }
      try {
        const response = await fetch(`/api/cuentas-por-cobrar?${paramsRows}`, {
          cache: "no-store",
        })
        if (!response.ok) throw new Error("No se pudieron cargar las cuentas por cobrar")
        const data = await response.json()
        if (data.success === false) throw new Error("Respuesta inválida de cuentas por cobrar")
        const fila = Array.isArray(data.rows) ? data.rows : []
        setRows(fila)
        setTotal(Number(data.total ?? 0))
        setTotalPages(Number(data.totalPages ?? 1))
        if (cantidadNueva > 0) {
          setNuevosIds(fila.slice(0, cantidadNueva).map((x: any) => Number(x.id)))
        }
      } catch (error) {
        console.error(error)
      }
    },
    [tieneFiltros, paramsRows]
  )

  useEffect(() => {
    if (!tieneFiltros) {
      setRows([])
      setTotal(0)
    } else {
      cargarCuentasPorCobrar()
    }
  }, [tieneFiltros, paramsRows, cargarCuentasPorCobrar])

  const cargarClientes = useCallback(async () => {
    try {
      const cached = cacheGet<any[]>("clientes")
      if (cached) {
        setClientes(cached)
        return
      }
      const response = await fetch("/api/clientes")
      const data = await response.json()
      const clientes = Array.isArray(data) ? data : []
      cacheSet("clientes", clientes)
      setClientes(clientes)
    } catch (error) {
      console.error(error)
    }
  }, [])

  useEffect(() => {
    cargarClientes()
  }, [cargarClientes])

  const sincronizarOneDrive = async () => {

  setSincronizando(true);

  setDocumentosDetectados(0);

  setEventos([]);

  setMostrarResumen(false);

  try {

    const inicio =
      await fetch(
        "/api/iniciar-sincronizacion",
        {
          method: "POST"
        }
      );

    const data =
      await inicio.json();

    if (!data.sincronizacionId) {

      setSincronizando(false);

      alert(
        data.error ||
          "No fue posible iniciar la sincronización"
      );

      return;

    }

    const sincronizacionId =
      data.sincronizacionId;

    setSincronizacionId(
      Number(sincronizacionId)
    );

    fetch(
      "/api/sincronizar-documentos",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          sincronizacionId
        })
      }
    );

    setDocumentosDetectados(
      data.totalDocumentos || 0
    );

    const intervalo =
      setInterval(
        async () => {

          try {

          const r =
            await fetch(
              `/api/sincronizaciones/${sincronizacionId}`
            );

          const sync =
            await r.json();

          if (
            Array.isArray(sync.eventos)
          ) {
            setEventos(sync.eventos);
          }

          if (
            sync.estado ===
            "COMPLETADO"
          ) {

            clearInterval(
              intervalo
            );

            setSincronizando(
              false
            );

            await cargarCuentasPorCobrar(
  sync.cuentas_cobrar
);

setResultadoSync(sync);

            setMostrarResumen(
              true
            );

          }

          } catch (errorPolling) {

            console.error(errorPolling);

          }

        },
        1500
      );

  } catch (error) {

    console.error(error);

    setSincronizando(false);

    alert(
      "Error al sincronizar"
    );

  }

}
const decidirDescarte = useCallback(
  async (
    evento: EventoSincronizacion,
    decision: "descartar" | "conservar"
  ) => {
    if (sincronizacionId === null) return;

    try {
      await fetch(
        `/api/sincronizaciones/${sincronizacionId}/decidir-descarte`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            archivoId: evento.archivoId,
            decision,
            numeroDocumento: evento.numeroDocumento,
            motivo: evento.motivo,
          }),
        }
      );

      const r = await fetch(
        `/api/sincronizaciones/${sincronizacionId}`
      );
      const sync = await r.json();

      if (Array.isArray(sync.eventos)) {
        setEventos(sync.eventos);
      }
    } catch (error) {
      console.error(error);
    }
  },
  [sincronizacionId]
);

const exportarMesExcel = () => {
  if (selectedYear === null || selectedMonth === null) {
    alert("Seleccione un año y un mes");
    return;
  }

  window.open(
    `/api/cuentas-por-cobrar/export?year=${selectedYear}&month=${selectedMonth + 1}&moneda=${monedaExportar}`,
    "_blank"
  );

  setMostrarExportar(false);
};
const modalExportar = (
  mostrarExportar && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

      <div className="bg-card border rounded-xl p-6 w-[26.25rem]">

        <h2 className="text-xl font-bold mb-2">
          Exportar Excel
        </h2>

        <p className="text-sm text-muted-foreground mb-5">
          Selecciona la moneda que deseas exportar.
        </p>

        <div className="space-y-3">

          <label className="flex items-center gap-3 cursor-pointer">

            <input
              type="radio"
              checked={monedaExportar === "SOLES"}
              onChange={() => setMonedaExportar("SOLES")}
            />

            <span>SOLES (S/)</span>

          </label>

          <label className="flex items-center gap-3 cursor-pointer">

            <input
              type="radio"
              checked={monedaExportar === "DOLARES"}
              onChange={() => setMonedaExportar("DOLARES")}
            />

            <span>DÓLARES (US$)</span>

          </label>

        </div>

        <div className="flex justify-end gap-2 mt-6">

          <Button
            variant="outline"
            onClick={() => setMostrarExportar(false)}
          >
            Cancelar
          </Button>

          <Button
            onClick={exportarMesExcel}
          >
            Exportar
          </Button>

        </div>

      </div>

    </div>
  )
);

  // La búsqueda, el filtrado y la paginación se resuelven en el servidor
  // (/api/cuentas-por-cobrar y /resumen); aquí solo se presentan los datos.

// ---- Años / meses / días: agregados calculados en el servidor (/resumen) ----
  const years = resumen.years
  const months = selectedYear === null ? [] : resumen.months
  const days = selectedMonth === null ? [] : resumen.days

  // Al cambiar de año, resetear mes/día
  const handleSelectYear = (year: number) => {
    setSelectedYear(year)
    setSelectedMonth(null)
    setSelectedDay(null)
  }

  // Al cambiar de mes, resetear día
  const handleSelectMonth = (month: number) => {
    setSelectedMonth((prev) => (prev === month ? null : month))
    setSelectedDay(null)
  }

  const handleSelectDay = (day: number) => {
    setSelectedDay((prev) => (prev === day ? null : day))
  }

  // La tabla muestra únicamente la página actual traída del servidor.
  const visibleAccounts = rows

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, clientFilter, debouncedSearch, selectedYear, selectedMonth, selectedDay])


  

  const tituloSeleccion = useMemo(() => {
    if (selectedYear === null) return null
    const partes: string[] = [String(selectedYear)]
    if (selectedMonth !== null) partes.push(MESES[selectedMonth])
    if (selectedDay !== null) partes.push(`Día ${String(selectedDay).padStart(2, "0")}`)
    return partes.join(" · ")
  }, [selectedYear, selectedMonth, selectedDay])

  return (
  <>
    {modalExportar}
    <ImportarFacturaDialog
      target="cobrar"
      open={mostrarImportar}
      onOpenChange={setMostrarImportar}
onImportadas={() => {
        cargarCuentasPorCobrar()
      }}
    />

    <div className="min-h-screen">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Cuentas por Cobrar
          </h1>

          <p className="text-muted-foreground">
            Gestión documental y financiera de cuentas por cobrar
            generadas automáticamente desde documentos.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

              <Input
                placeholder="Buscar cuentas por cobrar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 bg-secondary border-border">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="VENCIDO">Vencido</SelectItem>
                <SelectItem value="FACTURADO">Facturado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-44 bg-secondary border-border">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  Todos los clientes
                </SelectItem>

                {clientes.map((cliente) => (
                  <SelectItem
                    key={cliente.id}
                    value={cliente.razon_social}
                  >
                    {cliente.razon_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
             <Button
               variant="outline"
               className="border-border"
               onClick={() => setMostrarImportar(true)}
             >
               <FilePlus2 className="mr-2 h-4 w-4" />
               Importar facturas
             </Button>
<Button
  variant="outline"
  className="border-border"
  onClick={() => setMostrarExportar(true)}
>
  <Download className="mr-2 h-4 w-4" />
  Exportar
</Button>
          </div>
        </div>

        {/* ---- Navegación documental: Año / Mes / Día ---- */}
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>Navegación documental</span>
              {tituloSeleccion && (
                <span className="ml-2 text-foreground font-medium">
                  {tituloSeleccion}
                </span>
              )}
            </div>

            {/* Nivel 1: años */}
            <div className="flex flex-wrap gap-2">
              {years.map(({ year, count }) => (
                <button
                  key={year}
                  onClick={() => handleSelectYear(year)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedYear === year
                      ? "bg-blue-500/15 border-blue-500/40 text-blue-400"
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  {year}
                  <span className="ml-1.5 text-xs opacity-70">
                    ({count})
                  </span>
                </button>
              ))}

              {years.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  Sin documentos disponibles.
                </span>
              )}
            </div>

            {/* Nivel 2: TODOS los meses del año visibles simultáneamente */}
            {selectedYear !== null && months.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-2 border-t border-border">
                {months.map(({ month, count }) => (
                  <button
                    key={month}
                    onClick={() => handleSelectMonth(month)}
                    className={`flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                      selectedMonth === month
                        ? "bg-blue-500/15 text-blue-400"
                        : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span>{MESES[month]}</span>
                    <span className="opacity-70">
                      ({count})
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Nivel 3: TODOS los días del mes, grilla compacta tipo calendario */}
            {selectedMonth !== null && days.length > 0 && (
              <div className="pt-2 border-t border-border">
                <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-14 lg:grid-cols-16 gap-1.5">
                  {days.map(({ day, count }) => {
                    const sinDocumentos = count === 0
                    return (
                      <button
                        key={day}
                        onClick={() => !sinDocumentos && handleSelectDay(day)}
                        disabled={sinDocumentos}
                        className={`flex flex-col items-center justify-center rounded-md py-1.5 px-1 text-xs font-mono transition-colors ${
                          selectedDay === day
                            ? "bg-blue-500 text-white"
                            : sinDocumentos
                            ? "bg-secondary/30 text-muted-foreground/40 cursor-default"
                            : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                      >
                        <span>{String(day).padStart(2, "0")}</span>
                        <span className="text-[10px] opacity-70">
                          {sinDocumentos ? "—" : count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
           Mostrando {visibleAccounts.length} de {total} documentos
          {tituloSeleccion ? ` · ${tituloSeleccion}` : ""}
        </p>

  <div className="hidden lg:block">
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto rounded-md">
                <table className="w-full table-auto text-sm">
                  <thead className="border-b bg-secondary">
                    <tr>
                      <th className="px-1.5 py-3 text-center text-xs font-semibold tracking-wide whitespace-nowrap">Código</th>
                      <th className="px-1.5 py-3 text-center text-xs font-semibold tracking-wide whitespace-nowrap w-[30%]">Cliente</th>
                      <th className="px-1.5 py-3 text-center text-xs font-semibold tracking-wide whitespace-nowrap">Proyecto</th>
                      <th className="px-1.5 py-3 text-center text-xs font-semibold tracking-wide whitespace-nowrap">N° Factura</th>
                      <th className="px-1.5 py-3 text-center text-xs font-semibold tracking-wide whitespace-nowrap">Detracción</th>
                      <th className="px-1.5 py-3 text-center text-xs font-semibold tracking-wide whitespace-nowrap">Forma de pago</th>
                      <th className="px-1.5 py-3 text-center text-xs font-semibold tracking-wide whitespace-nowrap">Categorización</th>
                      <th className="px-1.5 py-3 text-center text-xs font-semibold tracking-wide whitespace-nowrap">Monto</th>
                      <th className="px-1.5 py-3 text-center text-xs font-semibold tracking-wide whitespace-nowrap">Estado</th>
                      <th className="px-1.5 py-3 text-center text-xs font-semibold tracking-wide whitespace-nowrap">Emisión</th>
                      <th className="px-1.5 py-3 text-center text-xs font-semibold tracking-wide whitespace-nowrap">Vencimiento</th>
                      <th className="px-1.5 py-3 text-center text-xs font-semibold tracking-wide whitespace-nowrap">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleAccounts.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border transition-colors hover:bg-secondary/40"
                      >

    <td className="px-1.5 py-3 text-muted-foreground whitespace-nowrap text-center">

      <div className="flex items-center justify-center gap-2">

        {nuevosIds.includes(
          Number(item.id)
        ) && (

          <div
            className="w-2 h-2 rounded-full bg-blue-500"
          />

        )}

        {item.codigo}

      </div>

    </td>
                        <td className="px-1.5 py-3 align-middle text-center font-medium text-foreground">
                          {item.cliente}
                        </td>

                        <td className="px-1.5 py-3 whitespace-nowrap align-middle text-center">
                          <ServicioBadge servicio={item.proyecto} />
                        </td>

                        <td className="px-1.5 py-3 font-mono text-xs whitespace-nowrap align-middle text-center">
                          {item.numero_factura || "-"}
                        </td>

                        <td className="px-1.5 py-3 whitespace-nowrap align-middle text-center">
                          <DetraccionBadge
    detraccion={item.detraccion}
    moneda={item.moneda}
  />
                        </td>

                        <td className="px-1.5 py-3 text-muted-foreground whitespace-nowrap align-middle text-center">
                          {item.forma_pago || "-"}
                        </td>

                        <td className="px-1.5 py-3 text-muted-foreground whitespace-nowrap align-middle text-center">
                          {item.categorizacion || "OTROS"}
                        </td>

                        <td className="px-1.5 py-3 tabular-nums whitespace-nowrap align-middle text-center">
    {item.moneda === "DOLARES" ? "US$" : "S/"}{" "}
    {Number(item.monto).toLocaleString("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
  </td>

                        <td className="px-1.5 py-3 whitespace-nowrap align-middle text-center">
                          <StatusBadge status={item.estado} />
                        </td>

                        <td className="px-1.5 py-3 whitespace-nowrap align-middle text-center">
                          {item.fecha_emision
                            ? new Date(item.fecha_emision).toLocaleDateString("es-PE")
                            : "-"}
                        </td>

                        <td className="px-1.5 py-3 whitespace-nowrap align-middle text-center">
                          <EditarVencimiento
                            cuentaId={item.id}
                            fechaVencimiento={item.fecha_vencimiento || null}
                            origen={item.vencimiento_origen}
                            modulo="cxc"
                            onGuardado={cargarCuentasPorCobrar}
                          />
                        </td>

                        <td className="px-1.5 py-3 whitespace-nowrap align-middle text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => {
                                if (item.archivo_url) {
                                  window.open(item.archivo_url, "_blank")
                                }
                              }}
                            >
                               <Eye className="h-4 w-4" />
  </Button>
                          </div>
                        </td>
                      </tr>
                    ))}

{total === 0 && (
                      <tr>
                        <td
                         colSpan={12}
                          className="px-3 py-8 text-center text-muted-foreground"
                        >
               Selecciona un año, un estado o busca una factura para mostrar documentos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ---- Mobile: tarjetas ---- */}
        <div className="block lg:hidden space-y-3">
          {visibleAccounts.map((item) => (
            <Card key={item.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{item.codigo}</span>
                  <StatusBadge status={item.estado} />
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Cliente:</span>
                    <span className="text-right font-medium text-foreground">{item.cliente}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Proyecto:</span>
                    <span className="text-right font-medium text-foreground">
                      <ServicioBadge servicio={item.proyecto} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>N° Factura:</span>
                    <span className="text-right font-medium text-foreground">{item.numero_factura || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Detracción:</span>
                    <span className="text-right font-medium text-foreground">
                      <DetraccionBadge detraccion={item.detraccion} moneda={item.moneda} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Forma de pago:</span>
                    <span className="text-right font-medium text-foreground">{item.forma_pago || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Categorización:</span>
                    <span className="text-right font-medium text-foreground">{item.categorizacion || "OTROS"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monto:</span>
                    <span className="text-right font-medium text-foreground">
                      {item.moneda === "DOLARES" ? "US$" : "S/"}{" "}
                      {Number(item.monto).toLocaleString("es-PE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Emisión:</span>
                    <span className="text-right font-medium text-foreground">
                      {item.fecha_emision
                        ? new Date(item.fecha_emision).toLocaleDateString("es-PE")
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vencimiento:</span>
                    <span className="text-right font-medium text-foreground">
                      <EditarVencimiento
                        cuentaId={item.id}
                        fechaVencimiento={item.fecha_vencimiento || null}
                        origen={item.vencimiento_origen}
                        modulo="cxc"
                        onGuardado={cargarCuentasPorCobrar}
                      />
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 min-h-[44px]"
                    onClick={() => {
                      if (item.archivo_url) {
                        window.open(item.archivo_url, "_blank")
                      }
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {total === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Selecciona un año, un estado o busca una factura para mostrar documentos.
            </p>
          )}
        </div>

        {total > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm">
            <span className="text-muted-foreground">Página {currentPage} de {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>
        </div>
  </>
  )
}
