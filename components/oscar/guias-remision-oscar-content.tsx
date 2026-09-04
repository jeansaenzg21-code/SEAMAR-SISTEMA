"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
  Folder,
  FolderPlus,
  FolderUp,
  ImagePlus,
  Inbox,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  BienGuiaRemision,
  EstadoGuiaRemision,
  FiltroCarpetaGuia,
  GuiaRemisionCarpeta,
  GuiaRemisionDatos,
  GuiaRemisionOscar,
  OrigenGuiaRemision,
} from "@/lib/oscar/guias-remision-types"

// ===========================================================================
// Helpers
// ===========================================================================

const ESTADOS_GUIA: Record<string, { label: string; punto: string; texto: string }> = {
  REVISADO: { label: "Revisada", punto: "bg-emerald-400", texto: "text-emerald-300" },
  PENDIENTE: { label: "Borrador", punto: "bg-amber-400", texto: "text-amber-300" },
}

const ORIGEN_LABEL: Record<string, string> = {
  PDF: "PDF",
  IMAGEN: "Foto",
}

function fechaLegible(fecha: string | null | undefined): string {
  if (!fecha) return "-"
  const parte = String(fecha).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parte)) return String(fecha)
  const d = new Date(parte + "T00:00:00")
  if (isNaN(d.getTime())) return String(fecha)
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })
}

function numeroGuia(serie: string | null, numero: string | null): string {
  if (serie && numero) return `${serie}-${numero}`
  return serie || numero || ""
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

function accesoriosComoLista(texto: string | null | undefined): string[] {
  if (!texto) return []
  return texto
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean)
}

// ===========================================================================
// Tipos de formulario
// ===========================================================================

type GuiaForm = {
  serie: string
  numero: string
  fechaInicioTraslado: string
  motivoTraslado: string
  destinatario: string
  rucCliente: string
  direccion: string
}

type BienForm = {
  codigoBien: string
  descripcion: string
  marca: string
  modelo: string
  serie: string
  ref: string
  unidadMedida: string
  cantidad: string
  accesorios: string
  nroParte: string
  lote: string
  expira: string
}

type ResultadoSubidaGuia = {
  origen: OrigenGuiaRemision
  hashArchivo: string
  guia: GuiaRemisionDatos
  bienes: BienGuiaRemision[]
  archivo: { nombre: string; itemId: string; webUrl: string }
}

type ResultadoSubidaMultiGuia = {
  origen: OrigenGuiaRemision
  hashArchivo: string
  guias: Array<{ guia: GuiaRemisionDatos; bienes: BienGuiaRemision[] }>
  archivo: { nombre: string; itemId: string; webUrl: string }
}

type MetaArchivo = { nombre: string; itemId: string | null; webUrl: string | null }

type MetaGuia = {
  nombreArchivo: string
  itemId: string | null
  webUrl: string | null
  hashArchivo: string
}

function guiaACampos(g: GuiaRemisionDatos | null | undefined): GuiaForm {
  return {
    serie: g?.serie ?? "",
    numero: g?.numero ?? "",
    fechaInicioTraslado: g?.fechaInicioTraslado?.slice(0, 10) ?? "",
    motivoTraslado: g?.motivoTraslado ?? "",
    destinatario: g?.destinatario ?? "",
    rucCliente: g?.rucCliente ?? "",
    direccion: g?.direccion ?? "",
  }
}

function camposAGuia(f: GuiaForm): GuiaRemisionDatos {
  return {
    serie: f.serie.trim() || null,
    numero: f.numero.trim() || null,
    fechaInicioTraslado: f.fechaInicioTraslado || null,
    motivoTraslado: f.motivoTraslado.trim() || null,
    destinatario: f.destinatario.trim() || null,
    rucCliente: f.rucCliente.trim() || null,
    direccion: f.direccion.trim() || null,
  }
}

function bienVacio(): BienForm {
  return {
    codigoBien: "",
    descripcion: "",
    marca: "",
    modelo: "",
    serie: "",
    ref: "",
    unidadMedida: "",
    cantidad: "",
    accesorios: "",
    nroParte: "",
    lote: "",
    expira: "",
  }
}

function bienesDesdeLista(bienes: BienGuiaRemision[]): BienForm[] {
  if (bienes.length === 0) return [bienVacio()]
  return bienes.map((b) => ({
    codigoBien: b.codigoBien ?? "",
    descripcion: b.descripcion ?? "",
    marca: b.marca ?? "",
    modelo: b.modelo ?? "",
    serie: b.serie ?? "",
    ref: b.ref ?? "",
    unidadMedida: b.unidadMedida ?? "",
    cantidad: b.cantidad != null ? formatoNumero(b.cantidad) : "",
    accesorios: b.accesorios ?? "",
    nroParte: b.nroParte ?? "",
    lote: b.lote ?? "",
    expira: b.expira?.slice(0, 10) ?? "",
  }))
}

function bienesDesdeForm(bienes: BienForm[]): BienGuiaRemision[] {
  return bienes
    .map((b) => ({
      codigoBien: b.codigoBien.trim() || null,
      descripcion: b.descripcion.trim() || null,
      marca: b.marca.trim() || null,
      modelo: b.modelo.trim() || null,
      serie: b.serie.trim() || null,
      ref: b.ref.trim() || null,
      unidadMedida: b.unidadMedida.trim() || null,
      cantidad: num(b.cantidad),
      accesorios: b.accesorios.trim() || null,
      nroParte: b.nroParte.trim() || null,
      lote: b.lote.trim() || null,
      expira: b.expira || null,
    }))
    .filter(
      (b) => b.descripcion || b.codigoBien || b.cantidad !== null
    )
}

// ===========================================================================
// Badge de estado
// ===========================================================================

function EstadoBadge({ estado }: { estado: EstadoGuiaRemision | null | undefined }) {
  const info = ESTADOS_GUIA[estado ?? ""] ?? {
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
// Dialog de subida de una Guía de Remisión
// ===========================================================================

const FASES_GUIA = [
  "Subiendo a OneDrive",
  "Analizando el documento",
  "Extrayendo datos",
  "Preparando revisión",
]

function UploadGuiaDialog({
  open,
  onOpenChange,
  onProcesada,
  resultadoExterno,
  guiasRevisadas,
  onSeleccionarGuia,
  onRegistrarTodas,
  carpetas,
  carpetaInicial,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProcesada: (resultado: ResultadoSubidaGuia) => void
  resultadoExterno?: ResultadoSubidaMultiGuia | null
  guiasRevisadas?: Set<number>
  onSeleccionarGuia?: (resultado: ResultadoSubidaMultiGuia, indice: number, meta: MetaGuia) => void
  onRegistrarTodas?: (resultado: ResultadoSubidaMultiGuia, metas: MetaGuia[], carpetaId: number | null) => Promise<void>
  carpetas?: GuiaRemisionCarpeta[]
  carpetaInicial?: FiltroCarpetaGuia
}) {
  const [archivos, setArchivos] = useState<File[]>([])
  const [procesando, setProcesando] = useState(false)
  const [fase, setFase] = useState(-1)
  const [indiceActual, setIndiceActual] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [duplicados, setDuplicados] = useState<string[]>([])
  const [resultado, setResultado] = useState<ResultadoSubidaMultiGuia | null>(null)
  const [guiasGuardadas, setGuiasGuardadas] = useState<Set<number>>(new Set())
  const [metas, setMetas] = useState<MetaGuia[]>([])
  const [registrandoTodas, setRegistrandoTodas] = useState(false)
  const [carpetaId, setCarpetaId] = useState<number | string>("")
  const archivoRef = useRef<HTMLInputElement>(null)
  const galeriaRef = useRef<HTMLInputElement>(null)
  const camaraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      if (resultadoExterno) {
        setResultado(resultadoExterno)
      } else {
        setArchivos([])
        setResultado(null)
        setMetas([])
        setGuiasGuardadas(new Set())
      }
      setProcesando(false)
      setFase(-1)
      setIndiceActual(0)
      setError(null)
      setDuplicados([])
      if (carpetaInicial && carpetaInicial !== "TODAS" && carpetaInicial !== "SIN_CARPETA") {
        setCarpetaId(String(carpetaInicial))
      } else {
        setCarpetaId("")
      }
    }
  }, [open, resultadoExterno, carpetaInicial])

  useEffect(() => {
    if (!procesando) return
    const interval = setInterval(() => {
      setFase((prev) => (prev < FASES_GUIA.length - 1 ? prev + 1 : prev))
    }, 1600)
    return () => clearInterval(interval)
  }, [procesando])

  const validarArchivo = (file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase() || ""
    if (!["pdf", "jpg", "jpeg", "png"].includes(ext)) {
      return `"${file.name}" no es un archivo PDF o imagen válida.`
    }
    if (file.size > 20 * 1024 * 1024) {
      return `"${file.name}" supera el tamaño máximo de 20MB.`
    }
    return null
  }

  const aceptarArchivo = (lista: FileList | null | undefined) => {
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
    setResultado(null)
    setArchivos((prev) => [...prev, ...files])
  }

  const quitarArchivo = (index: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== index))
    setResultado(null)
  }

  const procesar = async () => {
    if (archivos.length === 0) return
    setProcesando(true)
    setFase(0)
    setError(null)
    setDuplicados([])
    setIndiceActual(0)

    const guiasAcumuladas: Array<{
      guia: GuiaRemisionDatos
      bienes: BienGuiaRemision[]
    }> = []
    const metasAcumuladas: MetaGuia[] = []
    const archivosOK: ResultadoSubidaMultiGuia["archivo"][] = []
    let origenGlobal: ResultadoSubidaMultiGuia["origen"] = "PDF"
    let hashGlobal = ""

    try {
      for (let i = 0; i < archivos.length; i++) {
        setIndiceActual(i)
        const archivo = archivos[i]
        const formData = new FormData()
        formData.append("file", archivo)

        const res = await fetch("/api/oscar/guias-remision/upload", {
          method: "POST",
          body: formData,
        })
        const data = await res.json()

        if (res.status === 409 && data.duplicado) {
          setDuplicados((prev) => [...prev, archivo.name])
          continue
        }

        if (!res.ok) {
          throw new Error(data.error || `Error al procesar "${archivo.name}".`)
        }

        const multi = data as ResultadoSubidaMultiGuia
        const meta = JSON.parse(JSON.stringify(multi.archivo || {})) as MetaArchivo
        const archMeta: ResultadoSubidaMultiGuia["archivo"] = {
          nombre: meta.nombre || archivo.name,
          itemId: meta.itemId ?? "",
          webUrl: meta.webUrl ?? "",
        }
        for (const g of multi.guias) {
          guiasAcumuladas.push(g)
          metasAcumuladas.push({
            nombreArchivo: archMeta.nombre,
            itemId: archMeta.itemId,
            webUrl: archMeta.webUrl,
            hashArchivo: multi.hashArchivo,
          })
          archivosOK.push(archMeta)
        }
        origenGlobal = multi.origen
        hashGlobal = multi.hashArchivo
      }

      setResultado({
        origen: origenGlobal,
        hashArchivo: hashGlobal,
        guias: guiasAcumuladas,
        archivo: archivosOK[0] ?? { nombre: "", itemId: "", webUrl: "" },
      })
      setMetas(metasAcumuladas)
    } catch (e: any) {
      setError(e.message || "Error al procesar los archivos.")
    } finally {
      setProcesando(false)
    }
  }

  const guiasDetectadas = resultado?.guias ?? []
  const totalGuias = guiasDetectadas.length
  const guiasRevisadasEffective = guiasRevisadas ?? guiasGuardadas
  const guiasPendientes = guiasDetectadas.filter(
    (_, i) => !guiasRevisadasEffective.has(i)
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && procesando) return
        onOpenChange(o)
      }}
    >
      <DialogContent className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FilePlus2 className="h-5 w-5" />
            </div>
            Importar Guía de Remisión
          </DialogTitle>
          <DialogDescription>
            {resultado
              ? guiasPendientes.length > 0
                ? `Quedan ${guiasPendientes.length} guía${guiasPendientes.length === 1 ? "" : "s"} por revisar.`
                : "Todas las guías fueron revisadas."
              : "Elige de la galería, toma una foto o sube un archivo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!resultado && (
            <>
              {!procesando && (
                <>
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
                    PDF, JPG, PNG (máx 20MB c/u) · puedes elegir varios
                  </p>

                  <input
                    ref={archivoRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      aceptarArchivo(e.target.files)
                      e.target.value = ""
                    }}
                  />
                  <input
                    ref={galeriaRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      aceptarArchivo(e.target.files)
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
                      aceptarArchivo(e.target.files)
                      e.target.value = ""
                    }}
                  />
                </>
              )}

              {archivos.length > 0 && (
                <div className="space-y-2">
                  {archivos.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm"
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
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={procesando}
                        onClick={() => quitarArchivo(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {procesando && (
                <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
                  {archivos.length > 1 && (
                    <div className="space-y-1.5">
                      <p className="text-sm">
                        Procesando archivo <span className="font-medium">{indiceActual + 1}</span> de{" "}
                        <span className="font-medium">{archivos.length}</span>
                        <span className="ml-1 truncate text-muted-foreground">
                          ({archivos[indiceActual]?.name})
                        </span>
                      </p>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{
                            width: `${((indiceActual + 1) / archivos.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {FASES_GUIA.map((nombre, i) => {
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

          {resultado && (
            <div className="space-y-3">
              {totalGuias > 1 && (
                <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                  <Layers className="h-4 w-4" />
                  Se detectaron {totalGuias} guías de remisión en los archivos procesados.
                </div>
              )}

              {guiasDetectadas.map((item, i) => {
                const nro = numeroGuia(item.guia.serie, item.guia.numero)
                const guardada = guiasRevisadasEffective.has(i)
                return (
                  <div
                    key={i}
                    className={`overflow-hidden rounded-2xl border bg-card transition-colors ${
                      guardada
                        ? "border-emerald-500/30 opacity-60"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {guardada ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <FileSpreadsheet className="h-4 w-4 text-primary" />
                        )}
                        {totalGuias > 1 ? `Guía ${i + 1}` : "Guía detectada"}
                        {guardada && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600">
                            Guardada
                          </span>
                        )}
                      </span>
                      {resultado.origen ? (
                        <span className="text-xs text-muted-foreground">
                          {ORIGEN_LABEL[resultado.origen] ?? resultado.origen}
                        </span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Guía de Remisión</p>
                        <p className="font-medium">{nro || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha de traslado</p>
                        <p className="font-medium">{fechaLegible(item.guia.fechaInicioTraslado)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Motivo</p>
                        <p className="font-medium">{item.guia.motivoTraslado || "-"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Destinatario</p>
                        <p className="font-medium">{item.guia.destinatario || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">RUC</p>
                        <p className="font-medium">{item.guia.rucCliente || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {item.bienes.length > 0
                          ? `${item.bienes.length} bien${item.bienes.length === 1 ? "" : "es"} por transportar detectado${item.bienes.length === 1 ? "" : "s"}.`
                          : "No se detectaron bienes."}
                      </span>
                      {!guardada && (
                        <Button
                          size="sm"
                          onClick={() => {
                            const meta = metas[i] ?? {
                              nombreArchivo: "",
                              itemId: null,
                              webUrl: null,
                              hashArchivo: "",
                            }
                            const datosParaRevisar: ResultadoSubidaGuia = {
                              origen: resultado!.origen,
                              hashArchivo: meta.hashArchivo || resultado!.hashArchivo,
                              guia: item.guia,
                              bienes: item.bienes,
                              archivo: {
                                nombre: meta.nombreArchivo || resultado!.archivo.nombre,
                                itemId: meta.itemId || resultado!.archivo.itemId,
                                webUrl: meta.webUrl || resultado!.archivo.webUrl,
                              },
                            }
                            if (onSeleccionarGuia && totalGuias > 1) {
                              onSeleccionarGuia(resultado!, i, meta)
                            } else {
                              onProcesada(datosParaRevisar)
                              onOpenChange(false)
                            }
                          }}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Revisar y guardar
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {duplicados.length > 0 && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {duplicados.length === 1
                  ? `"${duplicados[0]}" ya está registrada y no se procesará (duplicada).`
                  : `${duplicados.length} guías ya están registradas y no se procesarán (duplicadas):`}
                {duplicados.length > 1 && (
                  <ul className="mt-1 list-inside list-disc">
                    {duplicados.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                )}
              </span>
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
            disabled={procesando}
            className="w-full sm:w-auto"
          >
            {guiasPendientes.length === 0 && totalGuias > 0 ? "Cerrar" : "Cancelar"}
          </Button>

          {resultado && guiasPendientes.length > 0 && (
            <>
              {carpetas && carpetas.length > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Registrar en:</span>
                  <select
                    value={String(carpetaId)}
                    onChange={(e) => setCarpetaId(e.target.value)}
                    className="h-7 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="">Sin carpeta</option>
                    {carpetas.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setRegistrandoTodas(true)
                  const carpetaIdFinal = carpetaId === "" ? null : Number(carpetaId)
                  onRegistrarTodas?.(resultado, metas, carpetaIdFinal).finally(() => setRegistrandoTodas(false))
                }}
                disabled={registrandoTodas}
                className="w-full sm:w-auto"
              >
                {registrandoTodas ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Registrar todas ({guiasPendientes.length})
              </Button>
            </>
          )}

          {!resultado && !error && (
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
                  Procesar {archivos.length === 1 ? "guía" : `${archivos.length} archivos`}
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
// Dialog de revisión / edición de la Guía
// ===========================================================================

type DatosRevisarGuia = {
  guia: GuiaRemisionDatos
  bienes: BienGuiaRemision[]
  origen: OrigenGuiaRemision | null
  nombreArchivo: string | null
  onedriveItemId: string | null
  onedriveWebUrl: string | null
  hashArchivo: string | null
  carpetaId?: number | null
}

function RevisarGuiaDialog({
  open,
  onOpenChange,
  modo,
  guiaId,
  datos,
  carpetas,
  onGuardada,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  modo: "crear" | "editar"
  guiaId?: number
  datos: DatosRevisarGuia | null
  carpetas: GuiaRemisionCarpeta[]
  onGuardada: () => void
}) {
  const [guia, setGuia] = useState<GuiaForm>(guiaACampos(null))
  const [bienes, setBienes] = useState<BienForm[]>([bienVacio()])
  const [guardando, setGuardando] = useState(false)
  const [mostrarDuplicado, setMostrarDuplicado] = useState(false)
  const [carpetaId, setCarpetaId] = useState<number | string>("")
  const cuerpoPendiente = useRef<any>(null)

  const hayNroParteF = bienes.some((b) => b.nroParte.trim() !== "")
  const hayLoteF = bienes.some((b) => b.lote.trim() !== "")
  const hayExpiraF = bienes.some((b) => b.expira.trim() !== "")
  const hayAccesoriosF = bienes.some((b) => b.accesorios.trim() !== "")

  useEffect(() => {
    if (open && datos) {
      setGuia(guiaACampos(datos.guia))
      setBienes(bienesDesdeLista(datos.bienes))
      setCarpetaId(datos.carpetaId ? String(datos.carpetaId) : "")
      setGuardando(false)
      setMostrarDuplicado(false)
      cuerpoPendiente.current = null
    }
  }, [open, datos])

  const actualizarGuia = (campo: keyof GuiaForm, valor: string) => {
    setGuia((prev) => ({ ...prev, [campo]: valor }))
  }

  const actualizarBien = (index: number, campo: keyof BienForm, valor: string) => {
    setBienes((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [campo]: valor } : b))
    )
  }

  const agregarBien = () => setBienes((prev) => [...prev, bienVacio()])

  const quitarBien = (index: number) => {
    setBienes((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
    )
  }

  const construirCuerpo = (estado: EstadoGuiaRemision, forzar?: boolean) => ({
    guia: camposAGuia(guia),
    bienes: bienesDesdeForm(bienes),
    estado,
    carpetaId: carpetaId === "" ? null : Number(carpetaId),
    nombreArchivo: datos?.nombreArchivo || null,
    onedriveItemId: datos?.onedriveItemId || null,
    onedriveWebUrl: datos?.onedriveWebUrl || null,
    hashArchivo: datos?.hashArchivo || null,
    origen: datos?.origen || null,
    forzar: forzar === true,
  })

  const guardar = async (estado: EstadoGuiaRemision) => {
    if (estado === "REVISADO" && !guia.serie.trim() && !guia.numero.trim()) {
      toast.error("La serie y el número de la guía son obligatorios para confirmar.")
      return
    }

    setGuardando(true)
    const cuerpo = construirCuerpo(estado)
    cuerpoPendiente.current = cuerpo

    try {
      const url =
        modo === "crear"
          ? "/api/oscar/guias-remision"
          : `/api/oscar/guias-remision/${guiaId}`

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
        estado === "REVISADO"
          ? "Guía de Remisión confirmada correctamente."
          : "Guía de Remisión guardada como borrador."
      )
      onGuardada()
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message || "Error al guardar la guía de remisión.")
    } finally {
      setGuardando(false)
    }
  }

  const guardarForzado = async (estado: EstadoGuiaRemision) => {
    setMostrarDuplicado(false)
    setGuardando(true)
    try {
      const url =
        modo === "crear"
          ? "/api/oscar/guias-remision"
          : `/api/oscar/guias-remision/${guiaId}`

      const res = await fetch(url, {
        method: modo === "crear" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(construirCuerpo(estado, true)),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Error al guardar.")
      }

      toast.success("Guía de Remisión registrada de todos modos.")
      onGuardada()
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message || "Error al guardar la guía de remisión.")
    } finally {
      setGuardando(false)
    }
  }

  const campoDuplicado =
    cuerpoPendiente.current?.estado === "PENDIENTE" ? "PENDIENTE" : "REVISADO"

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
              {modo === "crear" ? "Revisión de la Guía de Remisión" : "Editar Guía de Remisión"}
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
                  <Label className="text-xs">Serie</Label>
                  <Input
                    className="mt-1 uppercase"
                    placeholder="EG07"
                    value={guia.serie}
                    onChange={(e) => actualizarGuia("serie", e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <Label className="text-xs">Número</Label>
                  <Input
                    className="mt-1"
                    placeholder="00000596"
                    value={guia.numero}
                    onChange={(e) => actualizarGuia("numero", e.target.value.replace(/\D+/g, ""))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Fecha de inicio de traslado</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={guia.fechaInicioTraslado}
                    onChange={(e) => actualizarGuia("fechaInicioTraslado", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Motivo de traslado</Label>
                  <Input
                    className="mt-1"
                    placeholder="Venta"
                    value={guia.motivoTraslado}
                    onChange={(e) => actualizarGuia("motivoTraslado", e.target.value)}
                  />
                </div>
                <div className="lg:col-span-2">
                  <Label className="text-xs">Destinatario</Label>
                  <Input
                    className="mt-1"
                    placeholder="Razón social del destinatario"
                    value={guia.destinatario}
                    onChange={(e) => actualizarGuia("destinatario", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">RUC cliente</Label>
                  <Input
                    className="mt-1"
                    placeholder="20452578949"
                    value={guia.rucCliente}
                    onChange={(e) => actualizarGuia("rucCliente", e.target.value.replace(/\D+/g, "").slice(0, 11))}
                  />
                </div>
                <div className="lg:col-span-2">
                  <Label className="text-xs">Dirección (punto de partida)</Label>
                  <Input
                    className="mt-1"
                    value={guia.direccion}
                    onChange={(e) => actualizarGuia("direccion", e.target.value)}
                  />
                </div>
                <div className="lg:col-span-2">
                  <Label className="text-xs">Carpeta</Label>
                  <select
                    value={String(carpetaId)}
                    onChange={(e) => setCarpetaId(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Sin carpeta</option>
                    {carpetas.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bienes */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Layers className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Bienes por transportar
                  </h3>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={agregarBien} className="h-8">
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Agregar bien
                </Button>
              </div>

              {/* Bienes en móvil */}
              <div className="space-y-3 md:hidden">
                {bienes.map((b, i) => (
                  <div key={i} className="rounded-xl border border-border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Bien {i + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => quitarBien(i)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Código</Label>
                        <Input
                          className="mt-1"
                          value={b.codigoBien}
                          onChange={(e) => actualizarBien(i, "codigoBien", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Cantidad</Label>
                        <Input
                          type="number"
                          step="any"
                          className="mt-1"
                          value={b.cantidad}
                          onChange={(e) => actualizarBien(i, "cantidad", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <Label className="text-xs">Descripción</Label>
                      <Textarea
                        rows={2}
                        className="mt-1 resize-none"
                        value={b.descripcion}
                        onChange={(e) => actualizarBien(i, "descripcion", e.target.value)}
                      />
                    </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Marca</Label>
                        <Input
                          className="mt-1"
                          value={b.marca}
                          onChange={(e) => actualizarBien(i, "marca", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Modelo</Label>
                        <Input
                          className="mt-1"
                          value={b.modelo}
                          onChange={(e) => actualizarBien(i, "modelo", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Serie</Label>
                        <Input
                          className="mt-1"
                          value={b.serie}
                          onChange={(e) => actualizarBien(i, "serie", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">REF</Label>
                        <Input
                          className="mt-1"
                          value={b.ref}
                          onChange={(e) => actualizarBien(i, "ref", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Unidad de medida</Label>
                        <Input
                          className="mt-1"
                          value={b.unidadMedida}
                          onChange={(e) => actualizarBien(i, "unidadMedida", e.target.value)}
                        />
                      </div>
                      {hayNroParteF && (
                        <div>
                          <Label className="text-xs">N° Parte</Label>
                          <Input
                            className="mt-1"
                            value={b.nroParte}
                            onChange={(e) => actualizarBien(i, "nroParte", e.target.value)}
                          />
                        </div>
                      )}
                      {hayLoteF && (
                        <div>
                          <Label className="text-xs">Lote</Label>
                          <Input
                            className="mt-1"
                            value={b.lote}
                            onChange={(e) => actualizarBien(i, "lote", e.target.value)}
                          />
                        </div>
                      )}
                      {hayExpiraF && (
                        <div>
                          <Label className="text-xs">Expira</Label>
                          <Input
                            type="date"
                            className="mt-1"
                            value={b.expira}
                            onChange={(e) => actualizarBien(i, "expira", e.target.value)}
                          />
                        </div>
                      )}
                      {hayAccesoriosF && (
                        <div className="col-span-2">
                          <Label className="text-xs">Accesorios</Label>
                          <Input
                            className="mt-1"
                            value={b.accesorios}
                            onChange={(e) => actualizarBien(i, "accesorios", e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bienes en escritorio */}
              <div className="hidden overflow-x-auto md:block">
                <Table className="border-collapse [&_th]:border [&_th]:border-border/70 [&_td]:border [&_td]:border-border/70">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-20">CÓDIGO</TableHead>
                      <TableHead className="w-[26%] min-w-48">DESCRIPCIÓN</TableHead>
                      <TableHead className="min-w-24">MARCA</TableHead>
                      <TableHead className="min-w-24">MODELO</TableHead>
                      <TableHead className="min-w-24">SERIE</TableHead>
                      <TableHead className="min-w-20">REF</TableHead>
                      {hayNroParteF && <TableHead className="min-w-20">N° PARTE</TableHead>}
                      {hayLoteF && <TableHead className="min-w-20">LOTE</TableHead>}
                      {hayExpiraF && <TableHead className="min-w-24">EXPIRA</TableHead>}
                      {hayAccesoriosF && <TableHead className="min-w-32">ACCESORIOS</TableHead>}
                      <TableHead className="min-w-20">UNID.</TableHead>
                      <TableHead className="text-center">CANT.</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bienes.map((b, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Input
                            value={b.codigoBien}
                            onChange={(e) => actualizarBien(i, "codigoBien", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Textarea
                            rows={2}
                            className="min-w-44 resize-none"
                            value={b.descripcion}
                            onChange={(e) => actualizarBien(i, "descripcion", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={b.marca}
                            onChange={(e) => actualizarBien(i, "marca", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={b.modelo}
                            onChange={(e) => actualizarBien(i, "modelo", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={b.serie}
                            onChange={(e) => actualizarBien(i, "serie", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={b.ref}
                            onChange={(e) => actualizarBien(i, "ref", e.target.value)}
                          />
                        </TableCell>
                        {hayNroParteF && (
                          <TableCell>
                            <Input
                              value={b.nroParte}
                              onChange={(e) => actualizarBien(i, "nroParte", e.target.value)}
                            />
                          </TableCell>
                        )}
                        {hayLoteF && (
                          <TableCell>
                            <Input
                              value={b.lote}
                              onChange={(e) => actualizarBien(i, "lote", e.target.value)}
                            />
                          </TableCell>
                        )}
                        {hayExpiraF && (
                          <TableCell>
                            <Input
                              type="date"
                              value={b.expira}
                              onChange={(e) => actualizarBien(i, "expira", e.target.value)}
                            />
                          </TableCell>
                        )}
                        {hayAccesoriosF && (
                          <TableCell>
                            <Input
                              value={b.accesorios}
                              onChange={(e) => actualizarBien(i, "accesorios", e.target.value)}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <Input
                            value={b.unidadMedida}
                            onChange={(e) => actualizarBien(i, "unidadMedida", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            className="w-20 text-center"
                            value={b.cantidad}
                            onChange={(e) => actualizarBien(i, "cantidad", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => quitarBien(i)}
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
                "Confirmar guía"
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
              Guía de Remisión posiblemente duplicada
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta Guía de Remisión ya está registrada. ¿Deseas registrarla de todos modos?
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

function DetalleGuiaDialog({
  guia,
  open,
  onOpenChange,
  onEditar,
}: {
  guia: GuiaRemisionOscar | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditar: (guia: GuiaRemisionOscar) => void
}) {
  if (!guia) return null
  const datos = guia.guia
  const nro = numeroGuia(datos.serie, datos.numero)
  const hayNroParte = guia.bienes.some((b) => !!b.nroParte?.trim())
  const hayLote = guia.bienes.some((b) => !!b.lote?.trim())
  const hayExpira = guia.bienes.some((b) => !!b.expira?.trim())
  const hayAccesorios = guia.bienes.some((b) => !!b.accesorios?.trim())
  // offset de columna para el case de "Sin bienes"
  const colSpanBase = 8 + (hayNroParte ? 1 : 0) + (hayLote ? 1 : 0) + (hayExpira ? 1 : 0) + (hayAccesorios ? 1 : 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:max-w-[min(72rem,100dvw-2rem)] sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            {nro || "Guía de Remisión"}
            <EstadoBadge estado={guia.estado} />
          </DialogTitle>
          <DialogDescription>
            {datos.destinatario || datos.rucCliente || "Destinatario desconocido"}
            {guia.nombreArchivo ? ` · ${guia.nombreArchivo}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card p-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Guía de Remisión</p>
            <p className="font-medium">{nro || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fecha de inicio de traslado</p>
            <p className="font-medium">{fechaLegible(datos.fechaInicioTraslado)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Motivo de traslado</p>
            <p className="font-medium">{datos.motivoTraslado || "-"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Destinatario</p>
            <p className="font-medium">{datos.destinatario || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">RUC cliente</p>
            <p className="font-medium">{datos.rucCliente || "-"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Dirección</p>
            <p className="font-medium">{datos.direccion || "-"}</p>
          </div>
        </div>

        <div className="max-h-[40vh] overflow-auto rounded-2xl border border-border bg-card">
          <Table className="border-collapse [&_th]:border [&_th]:border-border/70 [&_td]:border [&_td]:border-border/70">
            <TableHeader>
              <TableRow>
                <TableHead>CÓDIGO</TableHead>
                <TableHead>DESCRIPCIÓN</TableHead>
                <TableHead>MARCA</TableHead>
                <TableHead>MODELO</TableHead>
                <TableHead>SERIE</TableHead>
                <TableHead>REF</TableHead>
                {hayNroParte && <TableHead>N° PARTE</TableHead>}
                {hayLote && <TableHead>LOTE</TableHead>}
                {hayExpira && <TableHead>EXPIRA</TableHead>}
                {hayAccesorios && <TableHead>ACCESORIOS</TableHead>}
                <TableHead>UNID.</TableHead>
                <TableHead className="text-center">CANT.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guia.bienes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpanBase} className="py-6 text-center text-muted-foreground">
                    Sin bienes por transportar.
                  </TableCell>
                </TableRow>
              ) : (
                guia.bienes.map((b, i) => (
                  <TableRow key={i}>
                    <TableCell>{b.codigoBien || "-"}</TableCell>
                    <TableCell className="max-w-72 whitespace-normal break-words">
                      {b.descripcion || "-"}
                    </TableCell>
                    <TableCell>{b.marca || "-"}</TableCell>
                    <TableCell>{b.modelo || "-"}</TableCell>
                    <TableCell>{b.serie || "-"}</TableCell>
                    <TableCell>{b.ref || "-"}</TableCell>
                    {hayNroParte && <TableCell>{b.nroParte || "-"}</TableCell>}
                    {hayLote && <TableCell>{b.lote || "-"}</TableCell>}
                    {hayExpira && <TableCell>{fechaLegible(b.expira) || "-"}</TableCell>}
                    {hayAccesorios && (
                      <TableCell className="whitespace-normal break-words align-top">
                        {accesoriosComoLista(b.accesorios).length > 0 ? (
                          <ul className="space-y-0.5">
                            {accesoriosComoLista(b.accesorios).map((acc, idx) => (
                              <li key={idx} className="flex gap-1.5">
                                <span className="shrink-0">•</span>
                                <span>{acc}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    )}
                    <TableCell>{b.unidadMedida || "-"}</TableCell>
                    <TableCell className="text-center">{formatoNumero(b.cantidad)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="gap-2 sm:flex-wrap">
          {guia.onedriveItemId && (
            <Button
              variant="outline"
              onClick={() =>
                window.open(`/api/oscar/guias-remision/${guia.id}/documento`, "_blank")
              }
              className="w-full sm:w-auto"
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver documento original
            </Button>
          )}
          <Button onClick={() => onEditar(guia)} className="w-full sm:w-auto">
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

export function OscarGuiasRemisionContent() {
  const [guias, setGuias] = useState<GuiaRemisionOscar[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS")
  const [totalGuias, setTotalGuias] = useState(0)
  const [carpetas, setCarpetas] = useState<GuiaRemisionCarpeta[]>([])
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState<FiltroCarpetaGuia>("TODAS")
  const [exportando, setExportando] = useState(false)
  const [carpetaDialogOpen, setCarpetaDialogOpen] = useState(false)
  const [carpetaEditando, setCarpetaEditando] = useState<GuiaRemisionCarpeta | null>(null)
  const [nombreCarpeta, setNombreCarpeta] = useState("")
  const [moverGuia, setMoverGuia] = useState<GuiaRemisionOscar | null>(null)
  const [carpetaMoverTarget, setCarpetaMoverTarget] = useState<string>("")

  const [uploadOpen, setUploadOpen] = useState(false)
  const [revisarOpen, setRevisarOpen] = useState(false)
  const [datosRevisar, setDatosRevisar] = useState<DatosRevisarGuia | null>(null)
  const [modoRevisar, setModoRevisar] = useState<"crear" | "editar">("crear")
  const [guiaIdEditar, setGuiaIdEditar] = useState<number | undefined>()

  const [resultadoUpload, setResultadoUpload] = useState<ResultadoSubidaMultiGuia | null>(null)
  const [guiasRevisadas, setGuiasRevisadas] = useState<Set<number>>(new Set())

  const [detalleGuia, setDetalleGuia] = useState<GuiaRemisionOscar | null>(null)
  const [detalleOpen, setDetalleOpen] = useState(false)

  const [eliminarGuia, setEliminarGuia] = useState<GuiaRemisionOscar | null>(null)

  const cargarCarpetas = useCallback(async () => {
    try {
      const res = await fetch("/api/oscar/guias-remision/carpetas")
      if (res.ok) {
        const data = await res.json()
        setCarpetas(data.carpetas || [])
      }
    } catch {}
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams({ porPagina: "0" })
      if (filtroEstado && filtroEstado !== "TODOS") params.set("estado", filtroEstado)
      if (busqueda.trim()) params.set("busqueda", busqueda.trim())
      if (carpetaSeleccionada === "SIN_CARPETA") {
        params.set("carpeta", "SIN_CARPETA")
      } else if (typeof carpetaSeleccionada === "number") {
        params.set("carpeta", String(carpetaSeleccionada))
      }
      const res = await fetch(`/api/oscar/guias-remision?${params.toString()}`)
      if (!res.ok) throw new Error("Error al cargar las guías de remisión.")
      const data = await res.json()
      setGuias(data.guias || [])
      setTotalGuias(data.total || 0)
    } catch (e: any) {
      toast.error(e.message || "No se pudieron cargar las guías de remisión.")
    } finally {
      setCargando(false)
    }
  }, [carpetaSeleccionada, busqueda, filtroEstado])

  useEffect(() => {
    cargarCarpetas()
  }, [cargarCarpetas])

  useEffect(() => {
    const t = setTimeout(() => {
      cargar()
    }, 300)
    return () => clearTimeout(t)
  }, [cargar])

  const abrirDetalle = useCallback(async (guia: GuiaRemisionOscar) => {
    try {
      const res = await fetch(`/api/oscar/guias-remision/${guia.id}`)
      if (res.ok) {
        const data = await res.json()
        setDetalleGuia(data.guia || guia)
      } else {
        setDetalleGuia(guia)
      }
    } catch {
      setDetalleGuia(guia)
    }
    setDetalleOpen(true)
  }, [])

  const procesarResultado = (resultado: ResultadoSubidaGuia) => {
    setModoRevisar("crear")
    setGuiaIdEditar(undefined)
    const carpetaId =
      carpetaSeleccionada && carpetaSeleccionada !== "TODAS" && carpetaSeleccionada !== "SIN_CARPETA"
        ? carpetaSeleccionada
        : null
    setDatosRevisar({
      guia: resultado.guia,
      bienes: resultado.bienes,
      origen: resultado.origen,
      nombreArchivo: resultado.archivo.nombre,
      onedriveItemId: resultado.archivo.itemId,
      onedriveWebUrl: resultado.archivo.webUrl,
      hashArchivo: resultado.hashArchivo,
      carpetaId,
    })
    setUploadOpen(false)
    setRevisarOpen(true)
  }

  const procesarGuiaDelUpload = (
    resultado: ResultadoSubidaMultiGuia,
    indice: number,
    meta?: MetaGuia
  ) => {
    setModoRevisar("crear")
    setGuiaIdEditar(undefined)
    const carpetaId =
      carpetaSeleccionada && carpetaSeleccionada !== "TODAS" && carpetaSeleccionada !== "SIN_CARPETA"
        ? carpetaSeleccionada
        : null
    const item = resultado.guias[indice]
    setDatosRevisar({
      guia: item.guia,
      bienes: item.bienes,
      origen: resultado.origen,
      nombreArchivo: meta?.nombreArchivo || resultado.archivo.nombre,
      onedriveItemId: meta?.itemId ?? resultado.archivo.itemId,
      onedriveWebUrl: meta?.webUrl ?? resultado.archivo.webUrl,
      hashArchivo: meta?.hashArchivo || resultado.hashArchivo,
      carpetaId,
    })
    setResultadoUpload(resultado)
    setUploadOpen(false)
    setRevisarOpen(true)
  }

  const onGuiaGuardadaDelUpload = () => {
    cargar()
    cargarCarpetas()
    if (resultadoUpload) {
      const indiceActual = resultadoUpload.guias.findIndex(
        (_, i) => !guiasRevisadas.has(i)
      )
      if (indiceActual !== -1) {
        setGuiasRevisadas((prev) => new Set([...prev, indiceActual]))
      }
      const totalPendientes = resultadoUpload.guias.length - guiasRevisadas.size - 1
      if (totalPendientes > 0) {
        toast.info(
          `Guía guardada. Quedan ${totalPendientes} guía${totalPendientes === 1 ? "" : "s"} por revisar.`
        )
        setUploadOpen(true)
      } else {
        setResultadoUpload(null)
        setGuiasRevisadas(new Set())
      }
    }
  }

  const registrarTodas = async (
    resultado: ResultadoSubidaMultiGuia,
    metas: MetaGuia[],
    carpetaId?: number | null
  ) => {
    let ok = 0
    let duplicadas = 0
    try {
      for (let i = 0; i < resultado.guias.length; i++) {
        const item = resultado.guias[i]
        if (guiasRevisadas.has(i)) continue
        const meta = metas[i]
        const res = await fetch("/api/oscar/guias-remision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guia: item.guia,
            bienes: item.bienes,
            estado: "REVISADO",
            carpetaId: carpetaId ?? null,
            nombreArchivo: meta?.nombreArchivo || resultado.archivo.nombre,
            onedriveItemId: meta?.itemId ?? resultado.archivo.itemId,
            onedriveWebUrl: meta?.webUrl ?? resultado.archivo.webUrl,
            hashArchivo: meta?.hashArchivo || resultado.hashArchivo,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          if (res.status === 409) duplicadas++
          continue
        }
        ok++
      }
      await cargar()
      setResultadoUpload(null)
      setGuiasRevisadas(new Set())
      setUploadOpen(false)
      toast.success(
        `Se registraron ${ok} guía${ok === 1 ? "" : "s"}.` +
          (duplicadas
            ? ` ${duplicadas} duplicada${duplicadas === 1 ? "" : "s"} omitida${duplicadas === 1 ? "" : "s"}.`
            : "")
      )
    } catch {
      toast.error("No se pudieron registrar todas las guías.")
    }
  }

  const iniciarEdicion = async (guia: GuiaRemisionOscar) => {
    setModoRevisar("editar")
    setGuiaIdEditar(guia.id)
    let completa = guia
    if (!guia.bienes || guia.bienes.length === 0) {
      try {
        const res = await fetch(`/api/oscar/guias-remision/${guia.id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.guia) completa = data.guia
        }
      } catch {}
    }
    setDatosRevisar({
      guia: completa.guia,
      bienes: completa.bienes || [],
      origen: null,
      nombreArchivo: completa.nombreArchivo,
      onedriveItemId: completa.onedriveItemId,
      onedriveWebUrl: completa.onedriveWebUrl,
      hashArchivo: completa.hashArchivo,
      carpetaId: completa.carpetaId ?? null,
    })
    setDetalleOpen(false)
    setRevisarOpen(true)
  }

  const confirmarEliminar = async () => {
    if (!eliminarGuia) return
    try {
      const res = await fetch(`/api/oscar/guias-remision/${eliminarGuia.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Error al eliminar.")
      toast.success("Guía de Remisión eliminada.")
      setEliminarGuia(null)
      cargar()
    } catch {
      toast.error("No se pudo eliminar la guía de remisión.")
    }
  }

  const abrirCarpeta = (carpeta: FiltroCarpetaGuia) => {
    setCarpetaSeleccionada(carpeta)
  }

  const abrirDialogoNuevaCarpeta = () => {
    setCarpetaEditando(null)
    setNombreCarpeta("")
    setCarpetaDialogOpen(true)
  }

  const abrirDialogoEditarCarpeta = (carpeta: GuiaRemisionCarpeta) => {
    setCarpetaEditando(carpeta)
    setNombreCarpeta(carpeta.nombre)
    setCarpetaDialogOpen(true)
  }

  const guardarCarpeta = async () => {
    const nombre = nombreCarpeta.trim()
    if (!nombre) {
      toast.error("Escribe un nombre para la carpeta.")
      return
    }
    try {
      if (carpetaEditando) {
        const res = await fetch(
          `/api/oscar/guias-remision/carpetas/${carpetaEditando.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre }),
          }
        )
        if (!res.ok) throw new Error("Error al renombrar la carpeta.")
        toast.success("Carpeta renombrada.")
      } else {
        const res = await fetch("/api/oscar/guias-remision/carpetas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre }),
        })
        if (!res.ok) throw new Error("Error al crear la carpeta.")
        toast.success("Carpeta creada.")
      }
      setCarpetaDialogOpen(false)
      await cargarCarpetas()
    } catch {
      toast.error("No se pudo guardar la carpeta.")
    }
  }

  const eliminarCarpeta = async (carpeta: GuiaRemisionCarpeta) => {
    if (
      !confirm(
        `¿Eliminar la carpeta "${carpeta.nombre}"? Las guías se moverán a "Sin carpeta".`
      )
    )
      return
    try {
      const res = await fetch(
        `/api/oscar/guias-remision/carpetas/${carpeta.id}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error("Error al eliminar la carpeta.")
      toast.success("Carpeta eliminada.")
      setCarpetaSeleccionada("TODAS")
      await cargarCarpetas()
      cargar()
    } catch {
      toast.error("No se pudo eliminar la carpeta.")
    }
  }

  const exportar = async (filtro?: FiltroCarpetaGuia) => {
    setExportando(true)
    try {
      const objetivo = filtro ?? carpetaSeleccionada
      const params = new URLSearchParams()
      if (objetivo === "SIN_CARPETA") params.set("carpeta", "SIN_CARPETA")
      else if (typeof objetivo === "number") params.set("carpeta", String(objetivo))
      const qs = params.toString()
      const res = await fetch(
        `/api/oscar/guias-remision/export${qs ? `?${qs}` : ""}`
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Error al exportar.")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `guias_remision_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Exportación completada.")
    } catch (e: any) {
      toast.error(e.message || "No se pudo exportar.")
    } finally {
      setExportando(false)
    }
  }

  const abrirMoverGuia = (guia: GuiaRemisionOscar) => {
    setMoverGuia(guia)
    setCarpetaMoverTarget(guia.carpetaId ? String(guia.carpetaId) : "")
  }

  const confirmarMoverGuia = async () => {
    if (!moverGuia) return
    const objetivo =
      carpetaMoverTarget === "" || carpetaMoverTarget === "SIN_CARPETA"
        ? null
        : Number(carpetaMoverTarget)
    try {
      const res = await fetch(
        `/api/oscar/guias-remision/${moverGuia.id}/carpeta`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carpetaId: objetivo }),
        }
      )
      if (!res.ok) throw new Error("Error al mover la guía.")
      toast.success("Guía movida a la carpeta.")
      setMoverGuia(null)
      await cargarCarpetas()
      cargar()
    } catch {
      toast.error("No se pudo mover la guía.")
    }
  }

  const opcionesCarpetaMover = [
    { value: "", label: "Sin carpeta" },
    ...carpetas.map((c) => ({ value: String(c.id), label: c.nombre })),
  ]

  return (
    <div className="w-full space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold tracking-tight">
            Guías de Remisión
          </h2>
          <p className="mt-1 text-muted-foreground">
            Gestión y extracción de guías de remisión dentro del módulo Oscar.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => exportar()}
            disabled={exportando}
            className="flex-1 sm:flex-none"
          >
            {exportando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar todo
          </Button>
          <Button variant="outline" onClick={abrirDialogoNuevaCarpeta} className="flex-1 sm:flex-none">
            <FolderPlus className="mr-2 h-4 w-4" />
            Nueva carpeta
          </Button>
          <Button onClick={() => setUploadOpen(true)} className="flex-1 sm:flex-none">
            <UploadCloud className="mr-2 h-4 w-4" />
            Importar
          </Button>
        </div>
      </div>

      {/* Búsqueda y filtro por estado */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, destinatario, RUC o motivo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-44"
        >
          <option value="TODOS">Todos los estados</option>
          <option value="PENDIENTE">Borrador</option>
          <option value="REVISADO">Revisada</option>
        </select>
      </div>

      {/* Carpetas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <button
          onClick={() => abrirCarpeta("TODAS")}
          className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all ${
            carpetaSeleccionada === "TODAS"
              ? "border-primary bg-primary/5 ring-1 ring-primary/40"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <Folder className="h-5 w-5 text-primary" />
          <span className="mt-1 truncate text-sm font-semibold">Todas</span>
          <span className="text-xs text-muted-foreground">
            {totalGuias} guía{totalGuias === 1 ? "" : "s"}
          </span>
        </button>

        <button
          onClick={() => abrirCarpeta("SIN_CARPETA")}
          className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all ${
            carpetaSeleccionada === "SIN_CARPETA"
              ? "border-primary bg-primary/5 ring-1 ring-primary/40"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <Folder className="h-5 w-5 text-muted-foreground" />
          <span className="mt-1 truncate text-sm font-semibold">Sin carpeta</span>
          <span className="text-xs text-muted-foreground">Guías sin asignar</span>
        </button>

        {carpetas.map((c) => (
          <div
            key={c.id}
            className={`group flex flex-col rounded-2xl border p-4 transition-all ${
              carpetaSeleccionada === c.id
                ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                : "border-border bg-card hover:bg-muted/40"
            }`}
          >
            <div className="flex w-full items-start justify-between gap-1">
              <button
                onClick={() => abrirCarpeta(c.id)}
                className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
              >
                <Folder className="h-5 w-5 text-sky-500" />
                <span className="mt-1 w-full truncate text-sm font-semibold">
                  {c.nombre}
                </span>
              </button>
              <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  title="Exportar carpeta"
                  onClick={() => exportar(c.id)}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  title="Renombrar"
                  onClick={() => abrirDialogoEditarCarpeta(c)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md text-destructive"
                  title="Eliminar"
                  onClick={() => eliminarCarpeta(c)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <button
              onClick={() => abrirCarpeta(c.id)}
              className="text-left text-xs text-muted-foreground"
            >
              {c.totalGuias} guía{c.totalGuias === 1 ? "" : "s"} ·{" "}
              {c.totalBienes} bien{c.totalBienes === 1 ? "" : "es"}
            </button>
          </div>
        ))}
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
      ) : totalGuias === 0 ? (
        <>
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-muted-foreground/25 bg-card px-6 py-14 text-center md:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Inbox className="h-7 w-7" />
            </div>
            <div>
              <p className="font-medium">Aún no tienes guías de remisión registradas</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Importa tu primera guía desde un archivo, la galería o la cámara.
              </p>
            </div>
            <Button onClick={() => setUploadOpen(true)}>
              <UploadCloud className="mr-2 h-4 w-4" />
              Importar guías
            </Button>
          </div>

          <div className="oscar-glow-card hidden overflow-hidden rounded-2xl md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Guía</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Fecha de traslado</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Motivo</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Destinatario</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">RUC</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Inbox className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Aún no tienes guías de remisión registradas</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Importa tu primera guía desde un archivo, la galería o la cámara.
                          </p>
                        </div>
                        <Button onClick={() => setUploadOpen(true)}>
                          <UploadCloud className="mr-2 h-4 w-4" />
                          Importar guías
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      ) : guias.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">
          No se encontraron guías de remisión con los filtros aplicados.
        </div>
      ) : (
        <>
          {/* Vista móvil: lista de tarjetas */}
          <div className="space-y-2.5 md:hidden">
                  {guias.map((g) => (
              <div
                key={g.id}
                onClick={() => abrirDetalle(g)}
                className="oscar-glow-card cursor-pointer rounded-xl border p-3.5 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileSpreadsheet className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {numeroGuia(g.guia.serie, g.guia.numero) || "Sin número"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {g.guia.destinatario || "Destinatario desconocido"}
                      </p>
                    </div>
                  </div>
                  <EstadoBadge estado={g.estado} />
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {fechaLegible(g.guia.fechaInicioTraslado)}
                    {g.guia.rucCliente ? ` · ${g.guia.rucCliente}` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {g.guia.motivoTraslado || "Sin motivo"}
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
                      iniciarEdicion(g)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {g.onedriveItemId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 rounded-lg p-0"
                      title="Ver documento"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(`/api/oscar/guias-remision/${g.id}/documento`, "_blank")
                      }}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-lg p-0"
                    title="Mover a carpeta"
                    onClick={(e) => {
                      e.stopPropagation()
                      abrirMoverGuia(g)
                    }}
                  >
                    <FolderUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-lg p-0 text-destructive"
                    title="Eliminar"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEliminarGuia(g)
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
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Guía</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Fecha de traslado</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Motivo</TableHead>
                    <TableHead className="min-w-0 text-xs uppercase tracking-wider text-muted-foreground">Destinatario</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">RUC</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Bienes</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Estado</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
            {guias.map((g) => (
                    <TableRow
                      key={g.id}
                      className="cursor-pointer border-border transition-colors hover:bg-muted/40"
                      onClick={() => abrirDetalle(g)}
                    >
                      <TableCell className="whitespace-nowrap font-medium">
                        {numeroGuia(g.guia.serie, g.guia.numero) || "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {fechaLegible(g.guia.fechaInicioTraslado)}
                      </TableCell>
                      <TableCell className="max-w-[220px] whitespace-normal align-top text-muted-foreground">
                        {g.guia.motivoTraslado || "-"}
                      </TableCell>
                      <TableCell className="max-w-[340px] whitespace-normal align-top">
                        {g.guia.destinatario || "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {g.guia.rucCliente || "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {g.conteoBienes ?? g.bienes.length}
                      </TableCell>
                      <TableCell>
                        <EstadoBadge estado={g.estado} />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar"
                            onClick={() => iniciarEdicion(g)}
                            className="rounded-lg"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {g.onedriveItemId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver documento"
                              onClick={() =>
                                window.open(`/api/oscar/guias-remision/${g.id}/documento`, "_blank")
                              }
                              className="rounded-lg"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Mover a carpeta"
                            onClick={() => abrirMoverGuia(g)}
                            className="rounded-lg"
                          >
                            <FolderUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Eliminar"
                            onClick={() => setEliminarGuia(g)}
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

      {/* Contador de resultados */}
      {totalGuias > 0 && (
        <p className="pt-2 text-sm text-muted-foreground">
          {totalGuias} guía{totalGuias === 1 ? "" : "s"}
          {typeof carpetaSeleccionada === "number"
            ? " en esta carpeta"
            : carpetaSeleccionada === "SIN_CARPETA"
            ? " sin carpeta"
            : ` registrada${totalGuias === 1 ? "" : "s"}`}
        </p>
      )}

      {/* Dialogs */}
      <UploadGuiaDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onProcesada={procesarResultado}
        resultadoExterno={resultadoUpload}
        guiasRevisadas={guiasRevisadas}
        onSeleccionarGuia={procesarGuiaDelUpload}
        onRegistrarTodas={registrarTodas}
        carpetas={carpetas}
        carpetaInicial={carpetaSeleccionada}
      />

      <RevisarGuiaDialog
        open={revisarOpen}
        onOpenChange={setRevisarOpen}
        modo={modoRevisar}
        guiaId={guiaIdEditar}
        datos={datosRevisar}
        carpetas={carpetas}
        onGuardada={
          resultadoUpload
            ? onGuiaGuardadaDelUpload
            : () => {
                cargar()
                cargarCarpetas()
              }
        }
      />

      <DetalleGuiaDialog
        guia={detalleGuia}
        open={detalleOpen}
        onOpenChange={setDetalleOpen}
        onEditar={iniciarEdicion}
      />

      <AlertDialog open={eliminarGuia !== null} onOpenChange={(o) => !o && setEliminarGuia(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar Guía de Remisión
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas eliminar la guía{" "}
              <span className="font-medium text-foreground">
                {eliminarGuia ? numeroGuia(eliminarGuia.guia.serie, eliminarGuia.guia.numero) : ""}
              </span>
              ? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEliminarGuia(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminar}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo crear/renombrar carpeta */}
      <Dialog open={carpetaDialogOpen} onOpenChange={setCarpetaDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {carpetaEditando ? "Renombrar carpeta" : "Nueva carpeta"}
            </DialogTitle>
            <DialogDescription>
              {carpetaEditando
                ? "Cambia el nombre de la carpeta."
                : "Crea una carpeta para agrupar guías y exportarlas a Excel."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="nombre-carpeta">Nombre</Label>
            <Input
              id="nombre-carpeta"
              value={nombreCarpeta}
              onChange={(e) => setNombreCarpeta(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  guardarCarpeta()
                }
              }}
              placeholder="Ej: Visita técnica - Lima"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCarpetaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarCarpeta}>
              {carpetaEditando ? "Guardar" : "Crear carpeta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo mover guía a carpeta */}
      <Dialog
        open={moverGuia !== null}
        onOpenChange={(o) => !o && setMoverGuia(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderUp className="h-5 w-5 text-primary" />
              Mover guía a carpeta
            </DialogTitle>
            <DialogDescription>
              {moverGuia
                ? `Guía ${
                    numeroGuia(moverGuia.guia.serie, moverGuia.guia.numero) || ""
                  } → elige la carpeta destino.`
                : "Elige la carpeta destino."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Destino</Label>
            <select
              value={carpetaMoverTarget}
              onChange={(e) => setCarpetaMoverTarget(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {opcionesCarpetaMover.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoverGuia(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarMoverGuia}>Mover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}