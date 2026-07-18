"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { cacheGet, cacheSet } from "@/lib/simple-cache"
import {
  Filter,
  Download,
  Search,
  Eye,
  RefreshCw,
  CalendarDays,
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

type Status =
  | "PENDIENTE"
  | "VENCIDO"
  | "FACTURADO"

type CuentaPorCobrar = {
  id: string
  codigo: string
  cliente: string
  proyecto?: string | null
  numero_factura: string
  descripcion?: string | null
  detraccion?: number | null
  forma_pago?: string | null

  monto: number
  moneda: "SOLES" | "DOLARES"

  saldo: number

  estado: Status
  fecha_emision: string
  fecha_vencimiento: string

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

// Helper: obtiene año/mes/día locales a partir de fecha_emision
function partesFecha(fecha: string) {
  if (!fecha) return null
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return null
  return {
    year: d.getFullYear(),
    month: d.getMonth(), // 0-11
    day: d.getDate(),
  }
}

export function AccountsReceivableContent() {
  const [accountsReceivable, setAccountsReceivable] = useState<CuentaPorCobrar[]>([])
  const [nuevosIds, setNuevosIds] =
  useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState("all")
  const [clientFilter, setClientFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const [clientes, setClientes] = useState<any[]>([])
  const [mostrarResumen, setMostrarResumen] =
  useState(false);

const [resultadoSync, setResultadoSync] =
  useState<any>(null);

const [sincronizando, setSincronizando] =
  useState(false);

const [progreso, setProgreso] =
  useState(0);

const [mensajeProgreso, setMensajeProgreso] =
  useState("");

const [documentosDetectados, setDocumentosDetectados] =
  useState(0);

const [mostrarExportar, setMostrarExportar] =
  useState(false);

const [monedaExportar, setMonedaExportar] =
  useState<"SOLES" | "DOLARES">("SOLES");

  // ---- Navegación documental: año / mes / día ----
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([cargarCuentasPorCobrar(), cargarClientes()]).then(() => { if (cancelled) return })
    return () => { cancelled = true }
  }, [])

  const cargarCuentasPorCobrar = async (
  cantidadNueva = 0
) => {
    try {
      const response = await fetch("/api/cuentas-por-cobrar")
      const data = await response.json()

      setAccountsReceivable(data)
      if (cantidadNueva > 0) {

  const idsNuevos =
    data
      .slice(0, cantidadNueva)
      .map((x: any) => Number(x.id));

  setNuevosIds(idsNuevos);

}
    } catch (error) {
      console.error(error)
    }
  }

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

  const sincronizarOneDrive = async () => {

  setSincronizando(true);

  setDocumentosDetectados(0);

  setProgreso(0);

  setMensajeProgreso(
    "Buscando documentos nuevos en OneDrive..."
  );

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

    const sincronizacionId =
      data.sincronizacionId;

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

          const r =
            await fetch(
              `/api/sincronizaciones/${sincronizacionId}`
            );

          const sync =
            await r.json();

          const porcentaje =
            sync.total_documentos > 0
              ? Math.round(
                  (
                    sync.procesados /
                    sync.total_documentos
                  ) * 100
                )
              : 100;

          setProgreso(
            porcentaje
          );

          setMensajeProgreso(
            sync.mensaje
          );

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

        },
        3000
      );

  } catch (error) {

    console.error(error);

    alert(
      "Error al sincronizar"
    );

  }

}
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
const modalProgreso = (
  sincronizando && (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

      <div className="bg-card border rounded-xl p-6 w-[34.375rem]">

        <div className="flex items-center gap-3 mb-4">

  <RefreshCw
    className="h-6 w-6 text-blue-500 animate-spin"
  />

  <h2 className="text-xl font-bold">
    Sincronizando documentos
  </h2>

</div>

        <p className="mb-2">
          Se detectaron {documentosDetectados} documentos nuevos
        </p>

        <p className="text-xs text-muted-foreground mb-3">
  Analizando documentos y generando movimientos financieros...
</p>

        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">

  <RefreshCw
    className="h-4 w-4 animate-spin"
  />

  <span>
    {mensajeProgreso}
  </span>

</div>

        <div className="w-full bg-secondary rounded-full h-4 overflow-hidden">

          <div
            className="bg-blue-500 h-4 transition-all"
            style={{
              width: `${progreso}%`
            }}
          />

        </div>

        <p className="text-center mt-3 font-medium">
          {progreso}%
        </p>

      </div>

    </div>

  )
);

const modalResumen = (
  mostrarResumen &&
  resultadoSync && (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

      <div className="bg-card border rounded-xl p-6 w-[31.25rem]">

        <h2 className="text-xl font-bold mb-4">
          Sincronización completada
        </h2>

        <p>
          Documentos procesados:
          {resultadoSync.total_documentos}
        </p>

        <p>
          CxC generadas:
          {resultadoSync.cuentas_cobrar}
        </p>

        {resultadoSync.cuentas_pagar > 0 && (
          <p>
            CxP generadas:
            {resultadoSync.cuentas_pagar}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-6">

          {resultadoSync.cuentas_pagar > 0 && (

            <Button
              variant="outline"
              onClick={() =>
                window.location.href =
                "/accounts-payable"
              }
            >
              Ver cuentas por pagar
            </Button>

          )}

          <Button
            onClick={() =>
              setMostrarResumen(false)
            }
          >
            Aceptar
          </Button>

        </div>

      </div>

    </div>

  )
);

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

  // ---- Filtros base: estado, cliente, búsqueda (sin fecha) ----
  const baseFiltered = useMemo(() => {
    return accountsReceivable.filter((item) => {
      if (statusFilter !== "all" && item.estado !== statusFilter) return false
      if (clientFilter !== "all" && item.cliente !== clientFilter) return false

      if (
        searchQuery &&
        !String(item.codigo || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) &&
        !String(item.cliente || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) &&
        !String(item.proyecto || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) &&
        !String(item.numero_factura || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ) {
        return false
      }

      return true
    })
  }, [accountsReceivable, statusFilter, clientFilter, searchQuery])

  // ---- Años disponibles ----
  const years = useMemo(() => {
    const map = new Map<number, number>()

    baseFiltered.forEach((item) => {
      const partes = partesFecha(item.fecha_emision)
      if (!partes) return
      map.set(partes.year, (map.get(partes.year) || 0) + 1)
    })

    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, count]) => ({ year, count }))
  }, [baseFiltered])

  // Auto-seleccionar el año más reciente disponible
  useEffect(() => {
    if (selectedYear === null && years.length > 0) {
      setSelectedYear(years[0].year)
    }
  }, [years, selectedYear])

  // ---- Meses disponibles dentro del año seleccionado (todos visibles a la vez) ----
  const months = useMemo(() => {
    if (selectedYear === null) return []

    const map = new Map<number, number>()

    baseFiltered.forEach((item) => {
      const partes = partesFecha(item.fecha_emision)
      if (!partes || partes.year !== selectedYear) return
      map.set(partes.month, (map.get(partes.month) || 0) + 1)
    })

    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([month, count]) => ({ month, count }))
  }, [baseFiltered, selectedYear])

  // ---- Días del mes seleccionado: SIEMPRE todos los días del mes, sin paginación ----
  const days = useMemo(() => {
    if (selectedYear === null || selectedMonth === null) return []

    const counts = new Map<number, number>()

    baseFiltered.forEach((item) => {
      const partes = partesFecha(item.fecha_emision)
      if (!partes || partes.year !== selectedYear || partes.month !== selectedMonth) return
      counts.set(partes.day, (counts.get(partes.day) || 0) + 1)
    })

    const totalDiasMes = new Date(selectedYear, selectedMonth + 1, 0).getDate()

    return Array.from({ length: totalDiasMes }, (_, i) => {
      const day = i + 1
      return { day, count: counts.get(day) || 0 }
    })
  }, [baseFiltered, selectedYear, selectedMonth])

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

  // ---- Filtrado final mostrado en la tabla ----
  const filteredAccounts = useMemo(() => {
    return baseFiltered.filter((item) => {
      const partes = partesFecha(item.fecha_emision)
      if (!partes) return false

      if (selectedYear !== null && partes.year !== selectedYear) return false
      if (selectedMonth !== null && partes.month !== selectedMonth) return false
      if (selectedDay !== null && partes.day !== selectedDay) return false

      return true
    })
  }, [baseFiltered, selectedYear, selectedMonth, selectedDay])

  const descargarExcel = (item: CuentaPorCobrar) => {
    const encabezados = [
      "Código",
      "Cliente",
      "Proyecto",
      "N° Factura",
      "Detracción",
      "Forma de Pago",
      "Monto",
      "Saldo",
      "Estado",
      "Fecha Emisión",
      "Fecha Vencimiento",
    ]

    const datos = [
      item.codigo,
      item.cliente,
      item.proyecto || "Sin asignar",
      item.numero_factura,
      item.detraccion != null
  ? `${item.moneda === "DOLARES" ? "US$" : "S/"} ${Number(item.detraccion).toLocaleString("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  : "No",
      item.forma_pago || "-",
      `${item.moneda === "DOLARES" ? "US$" : "S/"} ${Number(item.monto).toLocaleString("es-PE")}`,

`${item.moneda === "DOLARES" ? "US$" : "S/"} ${Number(item.saldo).toLocaleString("es-PE")}`,
      item.estado,
      item.fecha_emision,
      item.fecha_vencimiento,
    ]

    const contenido = [
      encabezados.map((v) => `"${v}"`).join(";"),
      datos.map((v) => `"${v}"`).join(";"),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + contenido], {
      type: "text/csv;charset=utf-8;",
    })

    const url = window.URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `${item.codigo}.csv`
    a.click()

    window.URL.revokeObjectURL(url)
  }

  

  const tituloSeleccion = useMemo(() => {
    if (selectedYear === null) return null
    const partes: string[] = [String(selectedYear)]
    if (selectedMonth !== null) partes.push(MESES[selectedMonth])
    if (selectedDay !== null) partes.push(`Día ${String(selectedDay).padStart(2, "0")}`)
    return partes.join(" · ")
  }, [selectedYear, selectedMonth, selectedDay])

  return (
  <>
    {modalProgreso}
    {modalResumen}
    {modalExportar}

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
              variant="ghost"
              size="icon"
              title="Sincronizar OneDrive"
              onClick={sincronizarOneDrive}
            >
              <RefreshCw className="h-4 w-4 text-blue-500" />
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
          Mostrando {filteredAccounts.length} documentos
          {tituloSeleccion ? ` · ${tituloSeleccion}` : ""}
        </p>

        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-xs text-muted-foreground">Código</th>
                    <th className="px-4 py-3 text-left font-medium">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium">Proyecto</th>
                    <th className="px-4 py-3 text-left font-medium">N° Factura</th>
                    <th className="px-4 py-3 text-left font-medium">Detracción</th>
                    <th className="px-4 py-3 text-left font-medium">Forma de pago</th>
                    <th className="px-4 py-3 text-right font-medium">Monto</th>
                    <th className="px-4 py-3 text-right font-medium">Saldo</th>
                    <th className="px-4 py-3 text-left font-medium">Estado</th>
                    <th className="px-4 py-3 text-left font-medium">Emisión</th>
                    <th className="px-4 py-3 text-left font-medium">Vencimiento</th>
                    <th className="px-4 py-3 text-left font-medium">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAccounts.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border transition-colors hover:bg-secondary/40"
                    >

  <td className="px-4 py-3 text-xs text-muted-foreground">

    <div className="flex items-center gap-2">

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
                      <td className="px-4 py-3 font-medium text-foreground">
                        {item.cliente}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {item.proyecto || "-"}
                      </td>

                      <td className="px-4 py-3 font-mono text-xs">
                        {item.numero_factura || "-"}
                      </td>

                      <td className="px-4 py-3">
                        <DetraccionBadge
  detraccion={item.detraccion}
  moneda={item.moneda}
/>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {item.forma_pago || "-"}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums">
  {item.moneda === "DOLARES" ? "US$" : "S/"}{" "}
  {Number(item.monto).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}
</td>

                      <td className="px-4 py-3 text-right tabular-nums">
  {item.moneda === "DOLARES" ? "US$" : "S/"}{" "}
  {Number(item.saldo).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}
</td>

                      <td className="px-4 py-3">
                        <StatusBadge status={item.estado} />
                      </td>

                      <td className="px-4 py-3">
                        {item.fecha_emision
                          ? new Date(item.fecha_emision).toLocaleDateString("es-PE")
                          : "-"}
                      </td>

                      <td className="px-4 py-3">
                        {item.fecha_vencimiento
                          ? new Date(item.fecha_vencimiento).toLocaleDateString("es-PE")
                          : "-"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
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

<Button
  size="icon"
  variant="outline"
  onClick={() => descargarExcel(item)}
>
  <Download className="h-4 w-4" />
</Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredAccounts.length === 0 && (
                    <tr>
                      <td
                        colSpan={12}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        No hay cuentas por cobrar registradas para esta selección.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
        </div>
  </>
  )
}