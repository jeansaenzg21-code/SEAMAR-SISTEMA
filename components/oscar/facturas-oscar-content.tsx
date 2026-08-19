"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Download,
  Eye,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FolderUp,
  ImagePlus,
  Inbox,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type {
  CabeceraFactura,
  EstadoOcr,
  FacturaOscarAgrupada,
  LineaFactura,
  OrigenFactura,
} from "@/lib/oscar/types"

// ===========================================================================
// Helpers
// ===========================================================================

const ESTADOS: Record<string, { label: string; punto: string; texto: string }> = {
  REVISADO: { label: "Revisada", punto: "bg-emerald-400", texto: "text-emerald-300" },
  PENDIENTE: { label: "Borrador", punto: "bg-amber-400", texto: "text-amber-300" },
  PROCESADO: { label: "Procesado", punto: "bg-violet-400", texto: "text-violet-300" },
  ERROR: { label: "Error", punto: "bg-rose-400", texto: "text-rose-300" },
}

const ORIGEN_LABEL: Record<string, string> = {
  PDF_TEXTO: "PDF",
  PDF_ESCANEADO: "PDF escaneado",
  IMAGEN: "Foto",
}

function formatoMoneda(valor: number | null | undefined, moneda?: string | null): string {
  const n = Number(valor ?? 0)
  const monedaUsada = moneda === "DOLARES" ? "USD" : "PEN"
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: monedaUsada,
    minimumFractionDigits: 2,
  }).format(n)
}

function fechaLegible(fecha: string | null | undefined): string {
  if (!fecha) return "-"
  const parte = String(fecha).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parte)) return String(fecha)
  const d = new Date(parte + "T00:00:00")
  if (isNaN(d.getTime())) return String(fecha)
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })
}

function formatoFechaInput(fecha: string | null | undefined): string {
  if (!fecha) return ""
  const parte = String(fecha).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(parte) ? parte : ""
}

function num(valor: string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor.trim() === "") return null
  const n = Number(valor.replace(",", "."))
  return Number.isFinite(n) ? n : null
}

function formatoNumero(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined) return "-"
  const n = Number(valor)
  if (!Number.isFinite(n)) return String(valor)
  return String(n)
}

// ===========================================================================
// Tipos de formulario
// ===========================================================================

type CabeceraForm = {
  rucEmisor: string
  razonSocialEmisor: string
  rucCliente: string
  razonSocialCliente: string
  numeroDocumento: string
  fechaEmision: string
  fechaVencimiento: string
  moneda: string
  condicionPago: string
  ordenCompra: string
  guiaRemision: string
  subtotal: string
  igv: string
  total: string
}

type LineaForm = {
  codigo: string
  cantidad: string
  unidad: string
  descripcion: string
  valorUnitario: string
  descuento: string
  valorVenta: string
}

function cabeceraACabeceraFactura(f: CabeceraForm): CabeceraFactura {
  return {
    rucEmisor: f.rucEmisor.trim() || null,
    razonSocialEmisor: f.razonSocialEmisor.trim() || null,
    rucCliente: f.rucCliente.trim() || null,
    razonSocialCliente: f.razonSocialCliente.trim() || null,
    numeroDocumento: f.numeroDocumento.trim() || null,
    fechaEmision: f.fechaEmision || null,
    fechaVencimiento: f.fechaVencimiento || null,
    moneda: f.moneda || null,
    condicionPago: f.condicionPago.trim() || null,
    ordenCompra: f.ordenCompra.trim() || null,
    guiaRemision: f.guiaRemision.trim() || null,
    subtotal: num(f.subtotal),
    igv: num(f.igv),
    total: num(f.total),
  }
}

function cabeceraDesdeFactura(c: CabeceraFactura | null | undefined): CabeceraForm {
  return {
    rucEmisor: c?.rucEmisor ?? "",
    razonSocialEmisor: c?.razonSocialEmisor ?? "",
    rucCliente: c?.rucCliente ?? "",
    razonSocialCliente: c?.razonSocialCliente ?? "",
    numeroDocumento: c?.numeroDocumento ?? "",
    fechaEmision: formatoFechaInput(c?.fechaEmision),
    fechaVencimiento: formatoFechaInput(c?.fechaVencimiento),
    moneda: c?.moneda ?? "SOLES",
    condicionPago: c?.condicionPago ?? "",
    ordenCompra: c?.ordenCompra ?? "",
    guiaRemision: c?.guiaRemision ?? "",
    subtotal: c?.subtotal != null ? String(c.subtotal) : "",
    igv: c?.igv != null ? String(c.igv) : "",
    total: c?.total != null ? String(c.total) : "",
  }
}

function lineaVacia(): LineaForm {
  return {
    codigo: "",
    cantidad: "",
    unidad: "",
    descripcion: "",
    valorUnitario: "",
    descuento: "",
    valorVenta: "",
  }
}

function lineasDesdeFactura(lineas: LineaFactura[]): LineaForm[] {
  if (lineas.length === 0) return [lineaVacia()]
  return lineas.map((l) => ({
    codigo: l.codigo ?? "",
    cantidad: l.cantidad != null ? formatoNumero(l.cantidad) : "",
    unidad: l.unidad ?? "",
    descripcion: l.descripcion ?? "",
    valorUnitario: l.valorUnitario != null ? String(l.valorUnitario) : "",
    descuento: l.descuento != null ? String(l.descuento) : "",
    valorVenta: l.valorVenta != null ? String(l.valorVenta) : "",
  }))
}

function lineasDesdeForm(lineas: LineaForm[]): LineaFactura[] {
  return lineas
    .map((l) => ({
      codigo: l.codigo.trim() || null,
      cantidad: num(l.cantidad),
      unidad: l.unidad.trim() || null,
      descripcion: l.descripcion.trim() || null,
      valorUnitario: num(l.valorUnitario),
      descuento: num(l.descuento),
      valorVenta: num(l.valorVenta),
    }))
    .filter(
      (l) =>
        l.descripcion ||
        l.codigo ||
        l.valorVenta !== null ||
        l.cantidad !== null
    )
}

// ===========================================================================
// Badge de estado
// ===========================================================================

function EstadoBadge({ estado }: { estado: EstadoOcr | null | undefined }) {
  const info = ESTADOS[estado ?? ""] ?? {
    label: estado ?? "Desconocido",
    punto: "bg-muted-foreground",
    texto: "text-muted-foreground",
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium">
      <span className={`h-1.5 w-1.5 rounded-full ${info.punto}`} />
      <span className={info.texto}>{info.label}</span>
    </span>
  )
}

// ===========================================================================
// Dialog de subida con progreso (Individual / Masivo, cámara y galería)
// ===========================================================================

type ResultadoSubida = {
  origen: OrigenFactura
  cabecera: CabeceraFactura
  lineas: LineaFactura[]
  hashArchivo: string
  archivo: { nombre: string; itemId: string; webUrl: string }
}

type Detectada = {
  key: string
  nombreArchivo: string
  resultado: ResultadoSubida | null
  error: string | null
  duplicado: boolean
}

const FASES = [
  "Subiendo a OneDrive",
  "Leyendo el documento",
  "Extrayendo datos",
  "Preparando revisión",
]

function UploadFacturaDialog({
  open,
  onOpenChange,
  existentes,
  onImportadas,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existentes: FacturaOscarAgrupada[]
  onImportadas: (guardadas: number, omitidas: number) => void
}) {
  const [archivos, setArchivos] = useState<File[]>([])
  const [procesando, setProcesando] = useState(false)
  const [fase, setFase] = useState(-1)
  const [indiceActual, setIndiceActual] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [detectadas, setDetectadas] = useState<Detectada[]>([])
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())
  const [importando, setImportando] = useState(false)
  const archivoRef = useRef<HTMLInputElement>(null)
  const galeriaRef = useRef<HTMLInputElement>(null)
  const camaraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setArchivos([])
      setProcesando(false)
      setFase(-1)
      setIndiceActual(0)
      setError(null)
      setDetectadas([])
      setSeleccionadas(new Set())
      setImportando(false)
    }
  }, [open])

  const validarArchivo = (file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase() || ""
    if (!["pdf", "jpg", "jpeg", "png", "webp", "heic"].includes(ext)) {
      return `"${file.name}" no es un archivo PDF o imagen válida.`
    }
    if (file.size > 20 * 1024 * 1024) {
      return `"${file.name}" supera el tamaño máximo de 20MB.`
    }
    return null
  }

  const aceptarArchivos = (lista: FileList | null | undefined) => {
    if (!lista || lista.length === 0) return
    const files = Array.from(lista)
    for (const f of files) {
      const err = validarArchivo(f)
      if (err) {
        setError(err)
        return
      }
    }
    setError(null)
    setArchivos((prev) => [...prev, ...files])
  }

  const quitarArchivo = (index: number) =>
    setArchivos((prev) => prev.filter((_, i) => i !== index))

  useEffect(() => {
    if (!procesando) return
    const interval = setInterval(() => {
      setFase((prev) => (prev < FASES.length - 1 ? prev + 1 : prev))
    }, 1600)
    return () => clearInterval(interval)
  }, [procesando])

  const claveFactura = (cab: { rucEmisor?: string | null; numeroDocumento?: string | null }) =>
    `${cab.rucEmisor || ""}||${cab.numeroDocumento || ""}`

  const esDuplicado = (cab: any, batch: Detectada[]): boolean => {
    if (!cab?.rucEmisor || !cab?.numeroDocumento) return false
    const clave = claveFactura(cab)
    if (existentes.some((f) => claveFactura(f.cabecera) === clave)) return true
    return batch.some((r) => r.resultado && claveFactura(r.resultado.cabecera) === clave)
  }

  const procesar = async () => {
    if (archivos.length === 0) return
    setProcesando(true)
    setFase(0)
    setError(null)
    setIndiceActual(0)

    const resultados: Detectada[] = []

    for (let i = 0; i < archivos.length; i++) {
      setIndiceActual(i)
      const archivo = archivos[i]
      const formData = new FormData()
      formData.append("file", archivo)

      try {
        const res = await fetch("/api/oscar/facturas/upload", {
          method: "POST",
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || "Error al procesar la factura.")
        }
        resultados.push({
          key: `${i}`,
          nombreArchivo: archivo.name,
          resultado: data,
          error: null,
          duplicado: esDuplicado(data.cabecera, resultados),
        })
      } catch (e: any) {
        resultados.push({
          key: `${i}`,
          nombreArchivo: archivo.name,
          resultado: null,
          error: e.message || "Error al procesar el archivo.",
          duplicado: false,
        })
      }
    }

    setDetectadas(resultados)
    const seleccion = new Set<string>()
    resultados.forEach((r) => {
      if (r.resultado && !r.duplicado) seleccion.add(r.key)
    })
    setSeleccionadas(seleccion)
    setProcesando(false)
  }

  const alternarSeleccion = (key: string) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const seleccionables = detectadas.filter((d) => d.resultado && !d.duplicado)

  const importarSeleccionadas = async () => {
    const elegidas = detectadas.filter((d) => seleccionadas.has(d.key) && d.resultado)
    if (elegidas.length === 0) return

    setImportando(true)
    setError(null)
    let guardadas = 0
    let omitidas = 0

    for (const d of elegidas) {
      const r = d.resultado!
      try {
        const res = await fetch("/api/oscar/facturas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cabecera: r.cabecera,
            lineas: r.lineas,
            origen: r.origen,
            estadoOcr: "PENDIENTE",
            nombreArchivo: r.archivo.nombre,
            onedriveItemId: r.archivo.itemId,
            onedriveWebUrl: r.archivo.webUrl,
          }),
        })
        if (res.ok) guardadas++
        else omitidas++
      } catch {
        omitidas++
      }
    }

    setImportando(false)
    onImportadas(guardadas, omitidas)
    onOpenChange(false)
  }

  const hayDeteccion = detectadas.length > 0
  const seleccionandoArchivos = !hayDeteccion && !procesando

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && (procesando || importando)) return
        onOpenChange(o)
      }}
    >
      <DialogContent className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FilePlus2 className="h-5 w-5" />
            </div>
            Importar facturas
          </DialogTitle>
          <DialogDescription>
            {hayDeteccion
              ? `Se detectaron ${detectadas.length} facturas en los archivos seleccionados.`
              : "Elige de la galería, toma una foto o sube un archivo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!hayDeteccion && (
            <>
              {seleccionandoArchivos && (
                <>
                  {/* Fuentes de archivos */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <button
                      type="button"
                      disabled={procesando}
                      onClick={() => galeriaRef.current?.click()}
                      className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-2 py-4 text-center transition-colors hover:border-primary/40 hover:bg-muted/40"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        <ImagePlus className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium">Galería</span>
                      <span className="hidden text-[10px] text-muted-foreground sm:block">Desde tus fotos</span>
                    </button>
                    <button
                      type="button"
                      disabled={procesando}
                      onClick={() => camaraRef.current?.click()}
                      className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-2 py-4 text-center transition-colors hover:border-primary/40 hover:bg-muted/40"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        <Camera className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium">Cámara</span>
                      <span className="hidden text-[10px] text-muted-foreground sm:block">Tomar foto</span>
                    </button>
                    <button
                      type="button"
                      disabled={procesando}
                      onClick={() => archivoRef.current?.click()}
                      className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-2 py-4 text-center transition-colors hover:border-primary/40 hover:bg-muted/40"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        <FolderUp className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium">Archivo</span>
                      <span className="hidden text-[10px] text-muted-foreground sm:block">PDF o imagen</span>
                    </button>
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    Puedes elegir varios archivos · PDF, JPG, PNG (máx 20MB c/u)
                  </p>

                  {/* Inputs ocultos */}
                  <input
                    ref={archivoRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,application/pdf,image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      aceptarArchivos(e.target.files)
                      e.target.value = ""
                    }}
                  />
                  <input
                    ref={galeriaRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      aceptarArchivos(e.target.files)
                      e.target.value = ""
                    }}
                  />
                  <input
                    ref={camaraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      aceptarArchivos(e.target.files)
                      e.target.value = ""
                    }}
                  />
                </>
              )}

              {/* Archivos seleccionados */}
              {archivos.length > 0 && (
                <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-border bg-card p-2">
                  {archivos.map((a, i) => (
                    <div
                      key={`${a.name}-${i}`}
                      className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="truncate font-medium">{a.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {(a.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => quitarArchivo(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Progreso */}
              {procesando && archivos.length > 1 && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium">
                        Procesando archivo {indiceActual + 1} de {archivos.length}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {archivos[indiceActual]?.name}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{
                        width: `${((indiceActual + 1) / archivos.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Progreso individual */}
              {procesando && archivos.length === 1 && (
                <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
                  {FASES.map((nombre, i) => {
                    const completada = i < fase
                    const activa = i === fase
                    return (
                      <div key={nombre} className="flex items-center gap-3">
                        {completada ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : activa ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-border" />
                        )}
                        <span
                          className={`text-sm ${
                            completada
                              ? "text-muted-foreground"
                              : activa
                              ? "text-foreground font-medium"
                              : "text-muted-foreground/60"
                          }`}
                        >
                          {nombre}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {hayDeteccion && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-medium">
                  {seleccionadas.size} de {seleccionables.length} seleccionadas
                </span>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      setSeleccionadas(new Set(seleccionables.map((d) => d.key)))
                    }
                  >
                    Todas
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setSeleccionadas(new Set())}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>

              <div className="max-h-64 space-y-1 overflow-y-auto p-2">
                {detectadas.map((d) => {
                  const habilitada = !!d.resultado && !d.duplicado
                  const seleccionada = seleccionadas.has(d.key)
                  return (
                    <div
                      key={d.key}
                      onClick={() => habilitada && alternarSeleccion(d.key)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                        habilitada
                          ? "cursor-pointer hover:bg-muted/50"
                          : "opacity-60"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          seleccionada
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        }`}
                      >
                        {seleccionada && (
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{d.nombreArchivo}</p>
                        {d.resultado && (
                          <p className="truncate text-xs text-muted-foreground">
                            {d.resultado.cabecera.razonSocialEmisor ||
                              d.resultado.cabecera.rucEmisor ||
                              "Emisor desconocido"}
                            {d.resultado.cabecera.numeroDocumento
                              ? ` · ${d.resultado.cabecera.numeroDocumento}`
                              : ""}
                            {d.resultado.cabecera.total != null
                              ? ` · ${formatoMoneda(d.resultado.cabecera.total, d.resultado.cabecera.moneda)}`
                              : ""}
                          </p>
                        )}
                      </div>
                      {d.duplicado ? (
                        <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
                          Duplicada
                        </span>
                      ) : d.error ? (
                        <span className="shrink-0 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-600">
                          Error
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                          Lista
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {importando && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <div className="text-sm">
                <p className="font-medium">Guardando facturas seleccionadas...</p>
                <p className="text-xs text-muted-foreground">
                  Se guardarán como borradores; podrás revisarlas después en el listado.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={procesando || importando}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>

          {!hayDeteccion && (
            <Button
              onClick={procesar}
              disabled={archivos.length === 0 || procesando}
              className="w-full sm:w-auto"
            >
              {procesando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Procesar {archivos.length === 1 ? "factura" : "archivos"}
                </>
              )}
            </Button>
          )}

          {hayDeteccion && (
            <Button
              onClick={importarSeleccionadas}
              disabled={seleccionadas.size === 0 || importando}
              className="w-full sm:w-auto"
            >
              {importando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Importar seleccionadas ({seleccionadas.size})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===========================================================================
// Dialog de revisión / edición
// ===========================================================================

type DatosRevisar = {
  cabecera: CabeceraFactura
  lineas: LineaFactura[]
  origen: OrigenFactura | null
  nombreArchivo: string | null
  onedriveItemId: string | null
  onedriveWebUrl: string | null
}

function CampoNum({ valor, onChange, label }: { valor: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div>
      {label && <Label className="text-xs">{label}</Label>}
      <Input
        type="number"
        step="any"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1"
      />
    </div>
  )
}

function RevisarFacturaDialog({
  open,
  onOpenChange,
  modo,
  facturaId,
  datos,
  onGuardada,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  modo: "crear" | "editar"
  facturaId?: number
  datos: DatosRevisar | null
  onGuardada: () => void
}) {
  const [cabecera, setCabecera] = useState<CabeceraForm>(cabeceraDesdeFactura(null))
  const [lineas, setLineas] = useState<LineaForm[]>([lineaVacia()])
  const [guardando, setGuardando] = useState(false)
  const [mostrarDuplicado, setMostrarDuplicado] = useState(false)
  const cuerpoPendiente = useRef<any>(null)

  useEffect(() => {
    if (open && datos) {
      setCabecera(cabeceraDesdeFactura(datos.cabecera))
      setLineas(lineasDesdeFactura(datos.lineas))
      setGuardando(false)
      setMostrarDuplicado(false)
      cuerpoPendiente.current = null
    }
  }, [open, datos])

  const actualizarCabecera = (campo: keyof CabeceraForm, valor: string) => {
    setCabecera((prev) => ({ ...prev, [campo]: valor }))
  }

  const actualizarLinea = (index: number, campo: keyof LineaForm, valor: string) => {
    setLineas((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [campo]: valor } : l))
    )
  }

  const agregarLinea = () => setLineas((prev) => [...prev, lineaVacia()])

  const quitarLinea = (index: number) => {
    setLineas((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
    )
  }

  const construirCuerpo = (estadoOcr: EstadoOcr, forzar?: boolean) => ({
    cabecera: cabeceraACabeceraFactura(cabecera),
    lineas: lineasDesdeForm(lineas),
    origen: datos?.origen || null,
    estadoOcr,
    nombreArchivo: datos?.nombreArchivo || null,
    onedriveItemId: datos?.onedriveItemId || null,
    onedriveWebUrl: datos?.onedriveWebUrl || null,
    forzar: forzar === true,
  })

  const guardar = async (estadoOcr: EstadoOcr) => {
    if (estadoOcr === "REVISADO" && !cabecera.numeroDocumento.trim()) {
      toast.error("El número de documento es obligatorio para confirmar la factura.")
      return
    }

    setGuardando(true)
    const cuerpo = construirCuerpo(estadoOcr)
    cuerpoPendiente.current = cuerpo

    try {
      const url =
        modo === "crear"
          ? "/api/oscar/facturas"
          : `/api/oscar/facturas/${facturaId}`

      const res = await fetch(url, {
        method: modo === "crear" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      })

      const data = await res.json()

      if (res.status === 409 && data.duplicado) {
        setMostrarDuplicado(true)
        setGuardando(false)
        return
      }

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar.")
      }

      toast.success(
        estadoOcr === "REVISADO"
          ? "Factura confirmada correctamente."
          : "Factura guardada como borrador."
      )
      onGuardada()
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message || "Error al guardar la factura.")
    } finally {
      setGuardando(false)
    }
  }

  const guardarForzado = async (estadoOcr: EstadoOcr) => {
    setMostrarDuplicado(false)
    setGuardando(true)
    try {
      const url =
        modo === "crear"
          ? "/api/oscar/facturas"
          : `/api/oscar/facturas/${facturaId}`

      const res = await fetch(url, {
        method: modo === "crear" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(construirCuerpo(estadoOcr, true)),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Error al guardar.")
      }

      toast.success("Factura registrada de todos modos.")
      onGuardada()
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message || "Error al guardar la factura.")
    } finally {
      setGuardando(false)
    }
  }

  const campoDuplicado =
    cuerpoPendiente.current?.estadoOcr === "PENDIENTE" ? "PENDIENTE" : "REVISADO"

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:max-w-[min(72rem,100dvw-2rem)] sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {modo === "crear" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Pencil className="h-5 w-5" />
                )}
              </div>
              {modo === "crear" ? "Revisión de la factura" : "Editar factura"}
            </DialogTitle>
            <DialogDescription>
              Verifica y corrige los datos extraídos antes de guardar.
              {datos?.nombreArchivo && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  Archivo: {datos.nombreArchivo}
                  {datos.origen ? ` · ${ORIGEN_LABEL[datos.origen] ?? datos.origen}` : ""}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[40vh] space-y-6 overflow-y-auto pr-1 sm:max-h-[65vh]">
            {/* Datos generales */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Datos generales
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label className="text-xs">RUC emisor</Label>
                  <Input
                    className="mt-1"
                    value={cabecera.rucEmisor}
                    onChange={(e) => actualizarCabecera("rucEmisor", e.target.value)}
                  />
                </div>
                <div className="lg:col-span-2">
                  <Label className="text-xs">Razón social emisor</Label>
                  <Input
                    className="mt-1"
                    value={cabecera.razonSocialEmisor}
                    onChange={(e) => actualizarCabecera("razonSocialEmisor", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">RUC cliente</Label>
                  <Input
                    className="mt-1"
                    value={cabecera.rucCliente}
                    onChange={(e) => actualizarCabecera("rucCliente", e.target.value)}
                  />
                </div>
                <div className="lg:col-span-2">
                  <Label className="text-xs">Razón social cliente</Label>
                  <Input
                    className="mt-1"
                    value={cabecera.razonSocialCliente}
                    onChange={(e) => actualizarCabecera("razonSocialCliente", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">N° documento</Label>
                  <Input
                    className="mt-1"
                    placeholder="F001-00001865"
                    value={cabecera.numeroDocumento}
                    onChange={(e) => actualizarCabecera("numeroDocumento", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Fecha de emisión</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={cabecera.fechaEmision}
                    onChange={(e) => actualizarCabecera("fechaEmision", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Fecha de vencimiento</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={cabecera.fechaVencimiento}
                    onChange={(e) => actualizarCabecera("fechaVencimiento", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Moneda</Label>
                  <Select
                    value={cabecera.moneda || "SOLES"}
                    onValueChange={(v) => actualizarCabecera("moneda", v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOLES">SOLES</SelectItem>
                      <SelectItem value="DOLARES">DÓLARES</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Condición de pago</Label>
                  <Input
                    className="mt-1"
                    placeholder="CONTADO / CREDITO / ..."
                    value={cabecera.condicionPago}
                    onChange={(e) => actualizarCabecera("condicionPago", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Orden de compra (OC)</Label>
                  <Input
                    className="mt-1"
                    placeholder="OC-00012345"
                    value={cabecera.ordenCompra}
                    onChange={(e) => actualizarCabecera("ordenCompra", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">N° Guía de remisión</Label>
                  <Input
                    className="mt-1"
                    placeholder="T001-00012345"
                    value={cabecera.guiaRemision}
                    onChange={(e) => actualizarCabecera("guiaRemision", e.target.value)}
                  />
                </div>
                <CampoNum
                  label="Subtotal"
                  valor={cabecera.subtotal}
                  onChange={(v) => actualizarCabecera("subtotal", v)}
                />
                <CampoNum
                  label="IGV"
                  valor={cabecera.igv}
                  onChange={(v) => actualizarCabecera("igv", v)}
                />
                <CampoNum
                  label="Total"
                  valor={cabecera.total}
                  onChange={(v) => actualizarCabecera("total", v)}
                />
              </div>
            </div>

            {/* Detalle */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Layers className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Detalle de productos
                  </h3>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={agregarLinea} className="h-8">
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Agregar línea
                </Button>
              </div>

              {/* Líneas en móvil: tarjetas apiladas (sin scroll horizontal) */}
              <div className="space-y-3 md:hidden">
                {lineas.map((linea, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-muted/20 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Línea {i + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => quitarLinea(i)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <CampoNum
                        label="Código"
                        valor={linea.codigo}
                        onChange={(v) => actualizarLinea(i, "codigo", v)}
                      />
                      <CampoNum
                        label="Cant."
                        valor={linea.cantidad}
                        onChange={(v) => actualizarLinea(i, "cantidad", v)}
                      />
                      <div>
                        <Label className="text-xs">Unid.</Label>
                        <Input
                          className="mt-1"
                          value={linea.unidad}
                          onChange={(e) => actualizarLinea(i, "unidad", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <Label className="text-xs">Descripción</Label>
                      <Textarea
                        rows={2}
                        className="mt-1 resize-none"
                        value={linea.descripcion}
                        onChange={(e) => actualizarLinea(i, "descripcion", e.target.value)}
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <CampoNum
                        label="V. Unit."
                        valor={linea.valorUnitario}
                        onChange={(v) => actualizarLinea(i, "valorUnitario", v)}
                      />
                      <CampoNum
                        label="Dscto."
                        valor={linea.descuento}
                        onChange={(v) => actualizarLinea(i, "descuento", v)}
                      />
                      <CampoNum
                        label="V. Venta"
                        valor={linea.valorVenta}
                        onChange={(v) => actualizarLinea(i, "valorVenta", v)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Líneas en escritorio: tabla */}
              <div className="hidden overflow-x-auto md:block">
                <Table className="border-collapse [&_th]:border [&_th]:border-border/70 [&_td]:border [&_td]:border-border/70">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-24">CÓDIGO</TableHead>
                      <TableHead className="text-center">CANT.</TableHead>
                      <TableHead className="min-w-12">UNID.</TableHead>
                      <TableHead className="w-[35%] min-w-56">DESCRIPCIÓN</TableHead>
                      <TableHead className="text-center">V. UNIT.</TableHead>
                      <TableHead className="text-center">DSCTO.</TableHead>
                      <TableHead className="text-center">V. VENTA</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineas.map((linea, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Input
                            value={linea.codigo}
                            onChange={(e) => actualizarLinea(i, "codigo", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            className="w-20 text-center"
                            value={linea.cantidad}
                            onChange={(e) => actualizarLinea(i, "cantidad", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={linea.unidad}
                            onChange={(e) => actualizarLinea(i, "unidad", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Textarea
                            rows={2}
                            className="min-w-48 resize-none"
                            value={linea.descripcion}
                            onChange={(e) => actualizarLinea(i, "descripcion", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            className="w-24 text-center"
                            value={linea.valorUnitario}
                            onChange={(e) => actualizarLinea(i, "valorUnitario", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            className="w-20 text-center"
                            value={linea.descuento}
                            onChange={(e) => actualizarLinea(i, "descuento", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            className="w-28 text-center"
                            value={linea.valorVenta}
                            onChange={(e) => actualizarLinea(i, "valorVenta", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => quitarLinea(i)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:flex-wrap">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              variant="secondary"
              onClick={() => guardar("PENDIENTE")}
              disabled={guardando}
              className="w-full sm:w-auto"
            >
              Guardar borrador
            </Button>
            <Button onClick={() => guardar("REVISADO")} disabled={guardando} className="w-full sm:w-auto">
              {guardando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Confirmar factura"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={mostrarDuplicado} onOpenChange={setMostrarDuplicado}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Factura posiblemente duplicada
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ya existe una factura registrada con ese RUC de emisor y número de
              documento. ¿Deseas registrarla de todos modos?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMostrarDuplicado(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => guardarForzado(campoDuplicado)}>
              Guardar de todos modos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ===========================================================================
// Dialog de detalle (ver)
// ===========================================================================

function DetalleFacturaDialog({
  factura,
  open,
  onOpenChange,
  onEditar,
}: {
  factura: FacturaOscarAgrupada | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditar: (factura: FacturaOscarAgrupada) => void
}) {
  if (!factura) return null
  const cab = factura.cabecera

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:max-w-[min(72rem,100dvw-2rem)] sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            {cab.numeroDocumento || "Factura"}
            <EstadoBadge estado={factura.estadoOcr} />
          </DialogTitle>
          <DialogDescription>
            {cab.razonSocialEmisor || cab.rucEmisor || "Emisor desconocido"}
            {factura.nombreArchivo ? ` · ${factura.nombreArchivo}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card p-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">RUC emisor</p>
            <p className="font-medium">{cab.rucEmisor || "-"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Razón social emisor</p>
            <p className="font-medium">{cab.razonSocialEmisor || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">RUC cliente</p>
            <p className="font-medium">{cab.rucCliente || "-"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Razón social cliente</p>
            <p className="font-medium">{cab.razonSocialCliente || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Emisión</p>
            <p className="font-medium">{fechaLegible(cab.fechaEmision)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vencimiento</p>
            <p className="font-medium">{fechaLegible(cab.fechaVencimiento)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Moneda</p>
            <p className="font-medium">{cab.moneda || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Condición</p>
            <p className="font-medium">{cab.condicionPago || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Orden de compra (OC)</p>
            <p className="font-medium">{cab.ordenCompra || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">N° Guía de remisión</p>
            <p className="font-medium">{cab.guiaRemision || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Subtotal</p>
            <p className="font-medium">{formatoMoneda(cab.subtotal, cab.moneda)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">IGV</p>
            <p className="font-medium">{formatoMoneda(cab.igv, cab.moneda)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-medium">{formatoMoneda(cab.total, cab.moneda)}</p>
          </div>
        </div>

        <div className="max-h-[40vh] overflow-auto rounded-2xl border border-border bg-card">
          <Table className="border-collapse [&_th]:border [&_th]:border-border/70 [&_td]:border [&_td]:border-border/70">
            <TableHeader>
              <TableRow>
                <TableHead>CÓDIGO</TableHead>
                <TableHead className="text-center">CANT.</TableHead>
                <TableHead>UNID.</TableHead>
                <TableHead>DESCRIPCIÓN</TableHead>
                <TableHead className="text-center">V. UNIT.</TableHead>
                <TableHead className="text-center">DSCTO.</TableHead>
                <TableHead className="text-center">V. VENTA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {factura.lineas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    Sin líneas de detalle.
                  </TableCell>
                </TableRow>
              ) : (
                factura.lineas.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{l.codigo || "-"}</TableCell>
                    <TableCell className="text-center">{formatoNumero(l.cantidad)}</TableCell>
                    <TableCell>{l.unidad || "-"}</TableCell>
                    <TableCell className="max-w-72 whitespace-normal break-words">
                      {l.descripcion || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatoMoneda(l.valorUnitario, cab.moneda)}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatoMoneda(l.descuento, cab.moneda)}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatoMoneda(l.valorVenta, cab.moneda)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="gap-2 sm:flex-wrap">
          {factura.onedriveItemId && (
            <Button
              variant="outline"
              onClick={() =>
                window.open(`/api/oscar/facturas/${factura.grupoId}/documento`, "_blank")
              }
              className="w-full sm:w-auto"
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver documento original
            </Button>
          )}
          <Button onClick={() => onEditar(factura)} className="w-full sm:w-auto">
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===========================================================================
// Contenido principal
// ===========================================================================

export function OscarFacturasContent() {
  const [facturas, setFacturas] = useState<FacturaOscarAgrupada[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState("")

  const [uploadOpen, setUploadOpen] = useState(false)
  const [revisarOpen, setRevisarOpen] = useState(false)
  const [datosRevisar, setDatosRevisar] = useState<DatosRevisar | null>(null)
  const [modoRevisar, setModoRevisar] = useState<"crear" | "editar">("crear")
  const [facturaIdEditar, setFacturaIdEditar] = useState<number | undefined>()

  const [detalleFactura, setDetalleFactura] = useState<FacturaOscarAgrupada | null>(null)
  const [detalleOpen, setDetalleOpen] = useState(false)

  const [eliminarFactura, setEliminarFactura] = useState<FacturaOscarAgrupada | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch("/api/oscar/facturas")
      if (!res.ok) throw new Error("Error al cargar las facturas.")
      const data = await res.json()
      setFacturas(data.facturas || [])
    } catch (e: any) {
      toast.error(e.message || "No se pudieron cargar las facturas.")
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return facturas
    return facturas.filter((f) => {
      const cab = f.cabecera
      return [cab.numeroDocumento, cab.razonSocialEmisor, cab.razonSocialCliente, cab.rucEmisor]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    })
  }, [facturas, busqueda])

  const exportar = async (moneda?: "SOLES" | "DOLARES") => {
    try {
      const qs = moneda ? `?moneda=${moneda}` : ""
      const res = await fetch(`/api/oscar/facturas/export${qs}`)
      if (!res.ok) {
        let mensaje = "Error al exportar."
        try {
          const data = await res.json()
          if (data?.error) mensaje = data.error
        } catch {}
        throw new Error(mensaje)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `registro_facturas_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Exportación completada.")
    } catch (e: any) {
      toast.error(e?.message || "No se pudo exportar las facturas.")
    }
  }

  const exportarFactura = async (factura: FacturaOscarAgrupada) => {
    try {
      const res = await fetch(
        `/api/oscar/facturas/export?grupoId=${factura.grupoId}`
      )
      if (!res.ok) throw new Error("Error al exportar.")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `factura_${factura.cabecera.numeroDocumento || factura.grupoId}_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Factura exportada.")
    } catch {
      toast.error("No se pudo exportar la factura.")
    }
  }

  const iniciarEdicion = (factura: FacturaOscarAgrupada) => {
    setModoRevisar("editar")
    setFacturaIdEditar(factura.grupoId)
    setDatosRevisar({
      cabecera: factura.cabecera,
      lineas: factura.lineas,
      origen: factura.origen,
      nombreArchivo: factura.nombreArchivo,
      onedriveItemId: factura.onedriveItemId,
      onedriveWebUrl: factura.onedriveWebUrl,
    })
    setDetalleOpen(false)
    setRevisarOpen(true)
  }

  const confirmarEliminar = async () => {
    if (!eliminarFactura) return
    try {
      const res = await fetch(`/api/oscar/facturas/${eliminarFactura.grupoId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Error al eliminar.")
      toast.success("Factura eliminada.")
      setEliminarFactura(null)
      cargar()
    } catch {
      toast.error("No se pudo eliminar la factura.")
    }
  }

  return (
    <div className="mx-auto w-full max-w-[90rem] space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold tracking-tight">
            Cuentas por Pagar
          </h2>
          <p className="mt-1 text-muted-foreground">
            Gestión documental y financiera de cuentas por pagar generadas
            automáticamente desde documentos.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={facturas.length === 0}
                className="flex-1 sm:flex-none"
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportar("SOLES")}>
                Exportar en Soles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportar("DOLARES")}>
                Exportar en Dólares
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setUploadOpen(true)} className="flex-1 sm:flex-none">
            <UploadCloud className="mr-2 h-4 w-4" />
            Importar
          </Button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por número, RUC o proveedor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Estado de carga / vacío */}
      {cargando ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-border bg-card/60"
            />
          ))}
        </div>
      ) : facturas.length === 0 ? (
        <>
          {/* Vista móvil: mensaje vacío */}
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-muted-foreground/25 bg-card px-6 py-14 text-center md:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Inbox className="h-7 w-7" />
            </div>
            <div>
              <p className="font-medium">Aún no tienes facturas registradas</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Importa tu primera factura desde un archivo, la galería o la cámara.
              </p>
            </div>
            <Button onClick={() => setUploadOpen(true)}>
              <UploadCloud className="mr-2 h-4 w-4" />
              Importar facturas
            </Button>
          </div>

          {/* Vista escritorio: tabla con columnas siempre visibles */}
          <div className="oscar-glow-card hidden overflow-hidden rounded-2xl md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">N.º Documento</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Proveedor</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">RUC</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Fecha de Emisión</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Fecha de Vencimiento</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Moneda</TableHead>
                    <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground">Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Inbox className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Aún no tienes facturas registradas</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Importa tu primera factura desde un archivo, la galería o la cámara.
                          </p>
                        </div>
                        <Button onClick={() => setUploadOpen(true)}>
                          <UploadCloud className="mr-2 h-4 w-4" />
                          Importar facturas
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      ) : filtradas.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">
          No se encontraron facturas con los filtros aplicados.
        </div>
      ) : (
        <>
          {/* Vista móvil: lista de tarjetas */}
          <div className="space-y-2.5 md:hidden">
            {filtradas.map((f) => (
              <div
                key={f.grupoId}
                onClick={() => {
                  setDetalleFactura(f)
                  setDetalleOpen(true)
                }}
                className="oscar-glow-card cursor-pointer rounded-xl border p-3.5 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {f.cabecera.numeroDocumento || "Sin número"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {f.cabecera.razonSocialEmisor || "Proveedor desconocido"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {fechaLegible(f.cabecera.fechaEmision)}
                    {f.cabecera.rucEmisor ? ` · ${f.cabecera.rucEmisor}` : ""}
                  </span>
                  <span className="text-sm font-semibold">
                    {formatoMoneda(f.cabecera.total, f.cabecera.moneda)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-end gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-lg p-0"
                    title="Editar"
                    onClick={(e) => {
                      e.stopPropagation()
                      iniciarEdicion(f)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-lg p-0"
                    title="Exportar factura"
                    onClick={(e) => {
                      e.stopPropagation()
                      exportarFactura(f)
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {f.onedriveItemId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 rounded-lg p-0"
                      title="Ver documento"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(
                          `/api/oscar/facturas/${f.grupoId}/documento`,
                          "_blank"
                        )
                      }}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-lg p-0 text-destructive"
                    title="Eliminar"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEliminarFactura(f)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Vista escritorio: tabla */}
          <div className="oscar-glow-card hidden overflow-hidden rounded-2xl md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">N.º Documento</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Proveedor</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">RUC</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Fecha de Emisión</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Fecha de Vencimiento</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Moneda</TableHead>
                    <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground">Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map((f) => (
                    <TableRow
                      key={f.grupoId}
                      className="cursor-pointer border-border transition-colors hover:bg-muted/40"
                      onClick={() => {
                        setDetalleFactura(f)
                        setDetalleOpen(true)
                      }}
                    >
                      <TableCell className="whitespace-nowrap font-medium">
                        {f.cabecera.numeroDocumento || "-"}
                      </TableCell>
                      <TableCell className="max-w-56 truncate">
                        {f.cabecera.razonSocialEmisor || "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {f.cabecera.rucEmisor || "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {fechaLegible(f.cabecera.fechaEmision)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {fechaLegible(f.cabecera.fechaVencimiento)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {f.cabecera.moneda || "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatoMoneda(f.cabecera.total, f.cabecera.moneda)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar"
                            onClick={() => iniciarEdicion(f)}
                            className="rounded-lg"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Exportar factura"
                            onClick={() => exportarFactura(f)}
                            className="rounded-lg"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {f.onedriveItemId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver documento"
                              onClick={() =>
                                window.open(
                                  `/api/oscar/facturas/${f.grupoId}/documento`,
                                  "_blank"
                                )
                              }
                              className="rounded-lg"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Eliminar"
                            onClick={() => setEliminarFactura(f)}
                            className="rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* Dialogs */}
      <UploadFacturaDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        existentes={facturas}
        onImportadas={(guardadas, omitidas) => {
          if (guardadas > 0) {
            toast.success(
              omitidas > 0
                ? `Se importaron ${guardadas} facturas (${omitidas} omitidas).`
                : `Se importaron ${guardadas} facturas como borradores.`
            )
          } else if (omitidas > 0) {
            toast.error("No se pudo importar ninguna factura.")
          }
          cargar()
        }}
      />

      <RevisarFacturaDialog
        open={revisarOpen}
        onOpenChange={setRevisarOpen}
        modo={modoRevisar}
        facturaId={facturaIdEditar}
        datos={datosRevisar}
        onGuardada={() => cargar()}
      />

      <DetalleFacturaDialog
        factura={detalleFactura}
        open={detalleOpen}
        onOpenChange={setDetalleOpen}
        onEditar={iniciarEdicion}
      />

      <AlertDialog open={eliminarFactura !== null} onOpenChange={(o) => !o && setEliminarFactura(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar factura
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas eliminar la factura{" "}
              <span className="font-medium text-foreground">
                {eliminarFactura?.cabecera.numeroDocumento || ""}
              </span>
              ? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEliminarFactura(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminar}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
