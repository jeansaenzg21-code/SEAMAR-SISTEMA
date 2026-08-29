"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Pencil, Lock, Loader2, CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type OrigenVencimiento = "FACTURA" | "SISTEMA" | "MANUAL" | null | undefined

interface EditarVencimientoProps {
  cuentaId: number | string
  fechaVencimiento: string | null
  origen: OrigenVencimiento
  modulo: "cxc" | "cxp"
  onGuardado: () => void
}

function formatear(fecha: string | null): string {
  if (!fecha) return "-"
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return String(fecha).slice(0, 10)
  return d.toLocaleDateString("es-PE")
}

function esEditable(origen: OrigenVencimiento): boolean {
  return origen !== "FACTURA"
}

export function EditarVencimiento({
  cuentaId,
  fechaVencimiento,
  origen,
  modulo,
  onGuardado,
}: EditarVencimientoProps) {
  const [open, setOpen] = useState(false)
  const [fecha, setFecha] = useState("")
  const [guardando, setGuardando] = useState(false)

  const editable = esEditable(origen)

  function abrir() {
    setFecha(fechaVencimiento ? String(fechaVencimiento).slice(0, 10) : "")
    setOpen(true)
  }

  async function guardar() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      toast.error("Selecciona una fecha válida.")
      return
    }
    setGuardando(true)
    try {
      const ruta = modulo === "cxc" ? "cuentas-por-cobrar" : "cuentas-por-pagar"
      const res = await fetch(`/api/${ruta}/${cuentaId}/vencimiento`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha_vencimiento: fecha }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "No se pudo actualizar el vencimiento")

      toast.success("Fecha de vencimiento actualizada.")
      setOpen(false)
      onGuardado()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar el vencimiento")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <div className="inline-flex items-center gap-1">
        <span
          className={origen === "SISTEMA" ? "text-muted-foreground" : ""}
          title={
            origen === "SISTEMA"
              ? "Vencimiento asignado automáticamente (día de registro + 15 días)"
              : undefined
          }
        >
          {formatear(fechaVencimiento)}
        </span>

        {editable ? (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            title="Editar fecha de vencimiento"
            onClick={abrir}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Lock
            className="h-3.5 w-3.5 text-muted-foreground/40"
            aria-label="Vencimiento de la factura, no editable"
          />
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Editar fecha de vencimiento
            </DialogTitle>
            <DialogDescription>
              {origen === "SISTEMA"
                ? "Esta cuenta recibió el vencimiento automático (día de registro + 15 días). Puedes cambiarla aquí."
                : "Actualiza la fecha límite de vencimiento de esta cuenta."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="fecha-vencimiento">Fecha de vencimiento</Label>
            <Input
              id="fecha-vencimiento"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-11"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}