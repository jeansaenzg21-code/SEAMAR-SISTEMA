"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FilePlus2,
  FileText,
  FolderUp,
  ImagePlus,
  Loader2,
  RefreshCw,
  UploadCloud,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Targeta = "pagar" | "cobrar"

type FacturaImportada = {
  rucEmisor: string | null
  proveedor: string | null
  rucCliente: string | null
  cliente: string | null
  servicio: string | null
  numeroDocumento: string | null
  detraccion: number | null
  formaPago: string | null
  categorizacion: string
  monto: number | null
  moneda: string | null
  fechaEmision: string | null
  fechaVencimiento: string | null
  archivo: { nombre: string; itemId: string; webUrl: string }
}

type Detectada = {
  id: string
  nombre: string
  factura: FacturaImportada | null
  error: string | null
  duplicada?: boolean
}

const FASES = [
  "Subiendo a OneDrive",
  "Leyendo el documento",
  "Extrayendo datos",
  "Preparando revisión",
]

function dinero(value: number | null, moneda: string | null) {
  if (value === null) return "-"
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: moneda === "DOLARES" ? "USD" : "PEN",
  }).format(value)
}

function fecha(value: string | null) {
  return value ? value.slice(0, 10).split("-").reverse().join("/") : "-"
}

export function ImportarFacturaDialog({
  target,
  open,
  onOpenChange,
  onImportadas,
}: {
  target: Targeta
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportadas: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [archivos, setArchivos] = useState<File[]>([])
  const [detectadas, setDetectadas] = useState<Detectada[]>([])
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())
  const [procesando, setProcesando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [fase, setFase] = useState(-1)
  const [indiceActual, setIndiceActual] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setArchivos([])
      setDetectadas([])
      setSeleccionadas(new Set())
      setProcesando(false)
      setGuardando(false)
      setFase(-1)
      setIndiceActual(0)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!procesando) return
    const interval = setInterval(() => {
      setFase((prev) => (prev < FASES.length - 1 ? prev + 1 : prev))
    }, 1600)
    return () => clearInterval(interval)
  }, [procesando])

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

  const procesar = async () => {
    if (archivos.length === 0) return
    setProcesando(true)
    setFase(0)
    setError(null)
    setIndiceActual(0)

    const resultados: Detectada[] = []

    for (const [index, archivo] of archivos.entries()) {
      setIndiceActual(index)
      try {
        const formData = new FormData()
        formData.append("file", archivo)
        const response = await fetch("/api/importar-factura", {
          method: "POST",
          body: formData,
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "No se pudo procesar la factura.")
        resultados.push({ id: `${index}`, nombre: archivo.name, factura: data.factura, error: null })
      } catch (error: any) {
        resultados.push({
          id: `${index}`,
          nombre: archivo.name,
          factura: null,
          error: error?.message || "Error al procesar el archivo.",
        })
      }
    }

    setDetectadas(resultados)
    const seleccion = new Set<string>()
    resultados.forEach((r) => {
      if (r.factura) seleccion.add(r.id)
    })
    setSeleccionadas(seleccion)
    setProcesando(false)
  }

  const alternarSeleccion = (id: string) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const importar = async () => {
    const elegidas = detectadas.filter((item) => seleccionadas.has(item.id) && item.factura)
    if (elegidas.length === 0) return
    setGuardando(true)
    let guardadas = 0

    for (const item of elegidas) {
      const response = await fetch(`/api/cuentas-por-${target}/importar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factura: item.factura }),
      })
      if (response.ok) guardadas++
      else {
        const data = await response.json().catch(() => ({}))
        if (data.duplicado) item.duplicada = true
      }
    }

    const omitidas = elegidas.length - guardadas

    if (omitidas > 0) {
      setDetectadas((prev) =>
        prev.map((d) => {
          const marcada = elegidas.find((e) => e.id === d.id)
          return marcada ? { ...d, duplicada: marcada.duplicada ?? d.duplicada } : d
        }),
      )
    }

    setGuardando(false)

    if (guardadas > 0) {
      toast.success(
        `${guardadas} factura${guardadas === 1 ? "" : "s"} importada${guardadas === 1 ? "" : "s"}${
          omitidas > 0 ? ` · ${omitidas} omitida${omitidas === 1 ? "" : "s"}` : ""
        }.`,
      )
      onImportadas()
      onOpenChange(false)
    } else {
      toast.error("No se pudo importar ninguna factura.")
    }
  }

  const tercero = target === "pagar" ? "Proveedor" : "Cliente"
  const hayDeteccion = detectadas.length > 0
  const seleccionandoArchivos = !hayDeteccion && !procesando
  const seleccionables = detectadas.filter((d) => d.factura && !d.duplicada)

  const resumenFactura = (factura: FacturaImportada) => {
    const partes = [
      target === "pagar" ? factura.proveedor : factura.cliente,
      factura.numeroDocumento,
      factura.monto != null ? dinero(factura.monto, factura.moneda) : null,
    ].filter(Boolean)
    return partes.join(" · ") || "Datos incompletos"
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && (procesando || guardando)) return
        onOpenChange(value)
      }}
    >
      <DialogContent className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FilePlus2 className="h-5 w-5" />
            </span>
            Importar facturas a cuentas por {target}
          </DialogTitle>
          <DialogDescription>
            {hayDeteccion
              ? `Se detectaron ${detectadas.length} factura${detectadas.length === 1 ? "" : "s"} en los archivos seleccionados.`
              : "Selecciona una o varias facturas. Se extraerán únicamente los datos financieros de SEAMAR."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!hayDeteccion && (
            <>
              {seleccionandoArchivos && (
                <>
                  {/* Fuentes de archivos */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { label: "Galería", hint: "Desde tus fotos", icon: ImagePlus, ref: galleryRef, accept: "image/*" },
                      { label: "Cámara", hint: "Tomar foto", icon: Camera, ref: cameraRef, accept: "image/*", capture: "environment" as const },
                      { label: "Archivo", hint: "PDF o imagen", icon: FolderUp, ref: inputRef, accept: ".pdf,.jpg,.jpeg,.png,.webp,.heic,application/pdf,image/*" },
                    ].map(({ label, hint, icon: Icon, ref, accept, capture }) => (
                      <button
                        key={label}
                        type="button"
                        disabled={procesando}
                        onClick={() => ref.current?.click()}
                        className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-2 py-4 text-center transition-colors hover:border-primary/40 hover:bg-muted/40"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="text-xs font-medium">{label}</span>
                        <span className="hidden text-[10px] text-muted-foreground sm:block">{hint}</span>
                        <input
                          ref={ref}
                          type="file"
                          accept={accept}
                          capture={capture}
                          multiple={label !== "Cámara"}
                          className="hidden"
                          onChange={(event) => {
                            aceptarArchivos(event.target.files)
                            event.target.value = ""
                          }}
                        />
                      </button>
                    ))}
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    Puedes elegir varios archivos · PDF, JPG, PNG (máx 20MB c/u)
                  </p>

                  {error && (
                    <div className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </>
              )}

              {/* Archivos seleccionados */}
              {archivos.length > 0 && (
                <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-border bg-card p-2">
                  {archivos.map((archivo, i) => (
                    <div
                      key={`${archivo.name}-${i}`}
                      className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="truncate font-medium">{archivo.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {(archivo.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => quitarArchivo(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Progreso masivo */}
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

              {/* Progreso individual con fases */}
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
                              ? "font-medium text-foreground"
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
                    onClick={() => setSeleccionadas(new Set(seleccionables.map((d) => d.id)))}
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

              <div className="max-h-[45vh] space-y-1 overflow-y-auto p-2">
                {detectadas.map((item) => {
                  const habilitada = !!item.factura && !item.duplicada
                  const seleccionada = seleccionadas.has(item.id)
                  return (
                    <div
                      key={item.id}
                      onClick={() => habilitada && alternarSeleccion(item.id)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                        habilitada ? "cursor-pointer hover:bg-muted/50" : "opacity-60"
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
                        <p className="truncate text-sm font-medium">{item.nombre}</p>
                        {item.factura ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {resumenFactura(item.factura)}
                          </p>
                        ) : (
                          <p className="truncate text-xs text-destructive">
                            {item.error || "No se pudieron extraer los datos"}
                          </p>
                        )}
                      </div>
                      {item.duplicada ? (
                        <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
                          Duplicada
                        </span>
                      ) : item.error ? (
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

          {guardando && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <div className="text-sm">
                <p className="font-medium">Guardando facturas seleccionadas...</p>
                <p className="text-xs text-muted-foreground">
                  Se registrarán en cuentas por {target === "pagar" ? "pagar" : "cobrar"} con estado PENDIENTE.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={procesando || guardando}
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
                  Procesar {archivos.length === 1 ? "factura" : `${archivos.length} archivos`}
                </>
              )}
            </Button>
          )}

          {hayDeteccion && (
            <Button
              onClick={importar}
              disabled={seleccionadas.size === 0 || guardando}
              className="w-full sm:w-auto"
            >
              {guardando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Importar {seleccionadas.size} factura{seleccionadas.size === 1 ? "" : "s"}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
