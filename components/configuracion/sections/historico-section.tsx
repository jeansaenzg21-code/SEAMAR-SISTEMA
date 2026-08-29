"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Archive, ArchiveRestore, Loader2, Lock, Unlock } from "lucide-react"
import { cn } from "@/lib/utils"

interface PeriodoItem {
  id: number
  anio: number
  mes: number
  estado: "ABIERTO" | "CERRADO" | "ARCHIVADO"
  fecha_cierre: string | null
  usuario_cierre: string | null
  backup_id: number | null
}

const ESTADO_LABEL: Record<string, string> = {
  ABIERTO: "Abierto",
  CERRADO: "Cerrado",
  ARCHIVADO: "Archivado",
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
  })
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export function HistoricoSection() {
  const now = new Date()
  const [periodos, setPeriodos] = useState<PeriodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [archivando, setArchivando] = useState(false)
  const [reabriendo, setReabriendo] = useState(false)
  const [anio, setAnio] = useState<string>(String(now.getFullYear()))
  const [mes, setMes] = useState<string>(String(now.getMonth() + 1))
  const [reabrirCandidato, setReabrirCandidato] = useState<PeriodoItem | null>(null)

  const cargar = useCallback(async (silencioso = false) => {
    try {
      const res = await fetch("/api/periodos")
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.message || "Error al cargar periodos")
      }
      const json = await res.json()
      setPeriodos(json.periodos || [])
    } catch (error) {
      if (!silencioso) toast.error(error instanceof Error ? error.message : "Error al cargar periodos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const aniosDisponibles = Array.from(
    new Set([...periodos.map((p) => p.anio), now.getFullYear(), now.getFullYear() - 1])
  ).sort((a, b) => b - a)

  async function archivar() {
    if (!anio || !mes) {
      toast.error("Selecciona año y mes.")
      return
    }
    setArchivando(true)
    try {
      const res = await fetch("/api/periodos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anio: Number(anio), mes: Number(mes) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Error al archivar periodo")

      const p = json.periodo
      toast.success(
        `Periodo ${p?.anio}-${String(p?.mes).padStart(2, "0")} archivado con respaldo #${json.backup?.id ?? "—"}.`
      )
      await cargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al archivar periodo")
    } finally {
      setArchivando(false)
    }
  }

  async function confirmarReabrir() {
    if (!reabrirCandidato) return
    setReabriendo(true)
    try {
      const res = await fetch(`/api/periodos/${reabrirCandidato.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "ABIERTO" }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Error al reabrir periodo")

      toast.success("Periodo reabierto. Ya puedes registrar información en él.")
      setReabrirCandidato(null)
      await cargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al reabrir periodo")
    } finally {
      setReabriendo(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/80 bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start gap-4 rounded-xl border border-blue-500/15 bg-blue-500/[0.04] p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <Archive className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight">Cerrar y archivar periodo</p>
              <p className="mt-1 text-sm text-muted-foreground/80">
                Al archivar un periodo, el sistema genera un respaldo histórico tipo archivo (se conserva intacto),
                lo asocia al periodo y lo bloquea contra nuevos registros. La información NO se borra.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end">
            <div className="w-full space-y-2 md:max-w-[12rem]">
              <label className="text-sm font-medium text-foreground/90">Año</label>
              <Select value={anio} onValueChange={setAnio}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {aniosDisponibles.map((a) => (
                    <SelectItem key={a} value={String(a)}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full space-y-2 md:max-w-[14rem]">
              <label className="text-sm font-medium text-foreground/90">Mes</label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={archivar}
              disabled={archivando}
              size="lg"
              className={cn("h-11 px-6", "bg-blue-600 hover:bg-blue-500 text-white")}
            >
              {archivando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
              Cerrar y archivar periodo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <p className="text-base font-semibold tracking-tight">Periodos contables</p>
          <p className="mb-5 mt-1.5 text-sm text-muted-foreground/80">
            Control de estados de cada año/mes. Solo administradores.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : periodos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Archive className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">Sin periodos registrados</p>
              <p className="text-xs text-muted-foreground/70">
                El sistema registra automáticamente cada periodo al cerrarlo.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha de cierre</TableHead>
                    <TableHead>Cerrado por</TableHead>
                    <TableHead>Respaldo asociado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.anio} - {MESES[p.mes - 1]}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            p.estado === "ABIERTO" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                            p.estado === "CERRADO" && "border-amber-500/30 bg-amber-500/10 text-amber-400",
                            p.estado === "ARCHIVADO" && "border-blue-500/30 bg-blue-500/10 text-blue-400"
                          )}
                        >
                          {ESTADO_LABEL[p.estado] ?? p.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatearFecha(p.fecha_cierre)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.usuario_cierre || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.backup_id ? (
                          <span title="Archivo de respaldo generado al archivar">
                            Respaldos #{p.backup_id}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={p.estado === "ARCHIVADO" ? "Reabrir periodo" : "Reabrir periodo"}
                            onClick={() => setReabrirCandidato(p)}
                            disabled={p.estado === "ABIERTO" || !!reabriendo}
                          >
                            <Unlock className="h-4 w-4" />
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

      {/* Diálogo reabrir */}
      <AlertDialog open={!!reabrirCandidato} onOpenChange={(open) => !open && setReabrirCandidato(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir periodo</AlertDialogTitle>
            <AlertDialogDescription>
              El periodo {reabrirCandidato?.anio} - {reabrirCandidato?.mes ? MESES[reabrirCandidato.mes - 1] : ""} volverá
              a estado <strong>abierto</strong> y se permitirán nuevos registros. El respaldo histórico generado se
              conserva intacto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!reabriendo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarReabrir} disabled={!!reabriendo}>
              {reabriendo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reabrir periodo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}