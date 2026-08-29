"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DatabaseBackup,
  Download,
  Eraser,
  FileCheck2,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  HardDrive,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface BackupItem {
  id: number
  tipo: "daily" | "weekly" | "monthly" | "manual" | "prerestore" | "archivo"
  nombre_archivo: string
  ruta: string
  tamano: number | null
  checksum: string | null
  estado: "EN_PROCESO" | "COMPLETADO" | "ERROR" | "RESTAURADO"
  fase: string | null
  error: string | null
  motivo: string | null
  usuario_id: number | null
  usuario_nombre: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  created_at: string
}

interface ResumenRespaldo {
  ultimo: BackupItem | null
  EnProceso: boolean
  espacioTotal: number
  cantidad: number
  retencion: { daily: number; weekly: number; monthly: number }
  dir: string
  mysqldumpDisponible: boolean
}

const TIPO_LABEL: Record<string, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
  manual: "Manual",
  prerestore: "Pre-restauración",
  archivo: "Archivo histórico",
}

const ESTADO_LABEL: Record<string, string> = {
  EN_PROCESO: "En proceso",
  COMPLETADO: "Completado",
  ERROR: "Error",
  RESTAURADO: "Restaurado",
}

function formatearFecha(valor: string | null): string {
  if (!valor) return "—"
  const d = new Date(valor)
  if (isNaN(d.getTime())) return valor
  return d.toLocaleString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatearBytes(bytes: number | null): string {
  if (bytes == null) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const deleteDialog = "/api/backups"

export function RespaldoSection() {
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [resumen, setResumen] = useState<ResumenRespaldo | null>(null)
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [tipoNuevo, setTipoNuevo] = useState<string>("manual")
  const [motivoNuevo, setMotivoNuevo] = useState("")
  const [aplicandoRetencion, setAplicandoRetencion] = useState(false)
  const [validando, setValidando] = useState<number | null>(null)
  const [eliminando, setEliminando] = useState<number | null>(null)
  const [restaurando, setRestaurando] = useState<number | null>(null)
  const [eliminarCandidato, setEliminarCandidato] = useState<BackupItem | null>(null)
  const [restaurarCandidato, setRestaurarCandidato] = useState<BackupItem | null>(null)
  const [confirmacionRestaurar, setConfirmacionRestaurar] = useState("")
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const hayEnProceso = useMemo(
    () => backups.some((b) => b.estado === "EN_PROCESO") || resumen?.EnProceso,
    [backups, resumen]
  )

  const cargar = useCallback(async (silencioso = false) => {
    try {
      const res = await fetch("/api/backups?resumen=1")
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.message || "Error al cargar respaldos")
      }
      const json = await res.json()
      setBackups(json.backups || [])
      setResumen(json.resumen || null)
    } catch (error) {
      if (!silencioso) {
        toast.error(error instanceof Error ? error.message : "Error al cargar respaldos")
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Mientras haya un backup EN_PROCESO (posiblemente lanzado por cron/CLI),
  // se consulta el progreso cada 3 segundos.
  useEffect(() => {
    if (hayEnProceso && !timerRef.current) {
      timerRef.current = setInterval(() => cargar(true), 3000)
    }
    if (!hayEnProceso && timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [hayEnProceso, cargar])

  async function crearBackup() {
    if (!tipoNuevo) return
    setCreando(true)
    try {
      const res = await fetch(deleteDialog, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: tipoNuevo, motivo: motivoNuevo || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Error al crear respaldo")

      toast.success(`Respaldo ${TIPO_LABEL[tipoNuevo]?.toLowerCase() ?? tipoNuevo} creado correctamente.`)
      setMotivoNuevo("")
      await cargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear respaldo")
    } finally {
      setCreando(false)
    }
  }

  async function aplicarRetencion() {
    setAplicandoRetencion(true)
    try {
      const res = await fetch(`${deleteDialog}/retencion`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Error al aplicar retención")

      toast.success(`Retención aplicada: ${json.eliminados ?? 0} respaldo(s) eliminado(s).`)
      await cargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al aplicar retención")
    } finally {
      setAplicandoRetencion(false)
    }
  }

  async function validar(id: number) {
    setValidando(id)
    try {
      const res = await fetch(`${deleteDialog}/${id}/validate`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Error al validar respaldo")

      if (json.valido) {
        toast.success("Respaldo válido: integridad correcta (checksum SHA-256 coincide).")
      } else {
        toast.warning(`Respaldo NO válido: ${json.motivo || "el checksum no coincide."}`)
      }
      await cargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al validar respaldo")
    } finally {
      setValidando(null)
    }
  }

  async function descargar(id: number, nombre: string) {
    window.open(`${deleteDialog}/${id}/download`, "_blank")
  }

  async function confirmarEliminar() {
    if (!eliminarCandidato) return
    setEliminando(eliminarCandidato.id)
    try {
      const res = await fetch(`${deleteDialog}/${eliminarCandidato.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Error al eliminar respaldo")

      toast.success("Respaldo eliminado correctamente.")
      setEliminarCandidato(null)
      await cargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar respaldo")
    } finally {
      setEliminando(null)
    }
  }

  async function confirmarRestaurar() {
    if (!restaurarCandidato) return
    if (confirmacionRestaurar !== "RESTAURAR") {
      toast.error("Debes escribir RESTAURAR para confirmar la restauración.")
      return
    }
    setRestaurando(restaurarCandidato.id)
    try {
      const res = await fetch(`${deleteDialog}/${restaurarCandidato.id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmacion: "RESTAURAR" }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Error al restaurar")

      toast.success(`Base de datos restaurada desde "${restaurarCandidato.nombre_archivo}".`)
      setRestaurarCandidato(null)
      setConfirmacionRestaurar("")
      await cargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al restaurar la base de datos")
    } finally {
      setRestaurando(null)
    }
  }

  const ultimo = resumen?.ultimo ?? null
  const backupRestaurar = restaurarCandidato

  return (
    <div className="space-y-6">
      {/* Estado general */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/80 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Último respaldo</p>
              <p className="truncate text-sm font-semibold">
                {ultimo ? ultimo.nombre_archivo : "Sin respaldos aún"}
              </p>
              <p className="text-xs text-muted-foreground">
                {ultimo ? `${ESTADO_LABEL[ultimo.estado]} · ${formatearFecha(ultimo.fecha_inicio)}` : "Genera tu primer respaldo"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <DatabaseBackup className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Frecuencia automática</p>
              <p className="text-sm font-semibold">Diario 7 · Semanal 4 · Mensual 6</p>
              <p className="text-xs text-muted-foreground">
                Respaldos de retención conservados (política actual)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
              <HardDrive className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Espacio utilizado</p>
              <p className="text-sm font-semibold">{formatearBytes(resumen?.espacioTotal ?? 0)}</p>
              <p className="text-xs text-muted-foreground">{resumen?.cantidad ?? 0} respaldo(s) almacenado(s)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
              <RefreshCw className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Programador</p>
              <p className="text-sm font-semibold">Daily es el día hábil</p>
              <p className="text-xs text-muted-foreground">
                Se ejecuta vía cron / PM2: diario, domingos weekly, último día mensual
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Crear respaldo */}
      <Card className="border-border/80 bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <p className="text-base font-semibold tracking-tight">Crear respaldo</p>
          <p className="mb-6 mt-1.5 text-sm text-muted-foreground/80">
            Genera un respaldo completo y verificable de la base de datos con mysqldump.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full space-y-2 sm:max-w-xs">
              <Label htmlFor="tipo-nuevo" className="text-sm font-medium text-foreground/90">
                Tipo de respaldo
              </Label>
              <Select value={tipoNuevo} onValueChange={setTipoNuevo}>
                <SelectTrigger id="tipo-nuevo" className="h-11">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="archivo">Archivo histórico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full flex-1 space-y-2">
              <Label htmlFor="motivo-nuevo" className="text-sm font-medium text-foreground/90">
                Motivo (opcional)
              </Label>
              <Input
                id="motivo-nuevo"
                value={motivoNuevo}
                onChange={(e) => setMotivoNuevo(e.target.value)}
                placeholder="Ej. Previo a actualización de versión"
                className="h-11 transition-shadow focus-visible:ring-2"
              />
            </div>

            <Button onClick={crearBackup} disabled={creando || hayEnProceso} size="lg" className="h-11 px-6">
              {creando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseBackup className="mr-2 h-4 w-4" />}
              Generar respaldo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de respaldos */}
      <Card className="border-border/80 bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold tracking-tight">Respaldos recientes</p>
              <p className="mt-1 text-sm text-muted-foreground/80">
                Validar, descargar, restaurar o eliminar respaldos. Solo administradores.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={aplicarRetencion}
              disabled={aplicandoRetencion}
              size="sm"
            >
              {aplicandoRetencion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eraser className="mr-2 h-4 w-4" />}
              Aplicar retención
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <DatabaseBackup className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">Aún no hay respaldos</p>
              <p className="text-xs text-muted-foreground/70">Genera tu primer respaldo con el botón de arriba.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Archivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead>Checksum</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="max-w-[14rem]">
                        <p className="truncate font-medium" title={b.nombre_archivo}>
                          {b.nombre_archivo}
                        </p>
                        <p className="text-xs text-muted-foreground">ID #{b.id}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{TIPO_LABEL[b.tipo] ?? b.tipo}</Badge>
                      </TableCell>
                      <TableCell>
                        {b.estado === "EN_PROCESO" ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                            <span className="text-sm text-blue-400">{b.fase || "En proceso"}</span>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn(
                              b.estado === "COMPLETADO" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                              b.estado === "RESTAURADO" && "border-sky-500/30 bg-sky-500/10 text-sky-400",
                              b.estado === "ERROR" && "border-red-500/30 bg-red-500/10 text-red-400"
                            )}
                          >
                            {ESTADO_LABEL[b.estado] ?? b.estado}
                          </Badge>
                        )}
                        {b.error && (
                          <p className="mt-1 max-w-[16rem] text-xs text-red-500" title={b.error}>
                            {b.error}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatearFecha(b.fecha_inicio)}
                        {b.usuario_nombre && <span className="block text-xs">por {b.usuario_nombre}</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatearBytes(b.tamano)}</TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground" title={b.checksum ?? ""}>
                          {b.checksum ? `${b.checksum.slice(0, 16)}…` : "—"}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Validar integridad"
                            onClick={() => validar(b.id)}
                            disabled={validando === b.id || b.estado === "EN_PROCESO"}
                          >
                            {validando === b.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileCheck2 className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Descargar"
                            onClick={() => descargar(b.id, b.nombre_archivo)}
                            disabled={b.estado === "EN_PROCESO"}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Restaurar"
                            onClick={() => {
                              setRestaurarCandidato(b)
                              setConfirmacionRestaurar("")
                            }}
                            disabled={b.estado !== "COMPLETADO" || restaurando === b.id}
                          >
                            {restaurando === b.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Eliminar"
                            onClick={() => setEliminarCandidato(b)}
                            disabled={b.estado === "EN_PROCESO" || eliminando === b.id}
                          >
                            {eliminando === b.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-400" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo eliminar */}
      <AlertDialog open={!!eliminarCandidato} onOpenChange={(open) => !open && setEliminarCandidato(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar respaldo</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el archivo <strong>{eliminarCandidato?.nombre_archivo}</strong> del servidor. Esta acción
              se registra en el historial. Continúa solo si estás seguro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminar} className="bg-red-600 hover:bg-red-500 text-white">
              {eliminando === eliminarCandidato?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar respaldo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo restaurar */}
      <AlertDialog open={!!restaurarCandidato} onOpenChange={(open) => !open && setRestaurarCandidato(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar base de datos</AlertDialogTitle>
            <AlertDialogDescription>
              {backupRestaurar ? (
                <>
                  Se reemplazará TODA la información actual de la base de datos con el respaldo{" "}
                  <strong>{backupRestaurar.nombre_archivo}</strong> (ID #{backupRestaurar.id}).
                  <br />
                  Antes de restaurar, el sistema crea <strong>automáticamente un respaldo previo de seguridad</strong>{" "}
                  por si necesitas deshacer la operación. El checksum se verifica antes de comenzar.
                  <br />
                  <br />
                  Para confirmar, escribe <strong>RESTAURAR</strong>:
                </>
              ) : (
                "Cargando…"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Input
            value={confirmacionRestaurar}
            onChange={(e) => setConfirmacionRestaurar(e.target.value)}
            placeholder="Escribe RESTAURAR"
            className="mt-2 h-11"
            autoFocus
          />

          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!restaurando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarRestaurar}
              disabled={confirmacionRestaurar !== "RESTAURAR" || !!restaurando}
              className="bg-amber-600 text-white hover:bg-amber-500"
            >
              {restaurando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Restaurar ahora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}