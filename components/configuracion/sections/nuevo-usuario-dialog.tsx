"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Usuario, UsuarioRol } from "@/components/configuracion/sections/usuarios-section"

const ROL_OPTIONS: { value: UsuarioRol; label: string }[] = [
  { value: "administrador", label: "Administrador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "operador", label: "Operador" },
  { value: "consulta", label: "Consulta" },
]

interface NuevoUsuarioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (usuario: Usuario) => void
}

const EMPTY_FORM = { nombre: "", correo: "", rol: "operador" as UsuarioRol }

export function NuevoUsuarioDialog({ open, onOpenChange, onCreated }: NuevoUsuarioDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM)

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setForm(EMPTY_FORM)
    onOpenChange(nextOpen)
  }

  // Simulado: sin backend todavía, arma el usuario en el cliente y lo
  // agrega directo al estado de la tabla.
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const usuario: Usuario = {
      id: crypto.randomUUID(),
      nombre: form.nombre,
      correo: form.correo,
      rol: form.rol,
      estado: "activo",
    }
    onCreated(usuario)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
            <DialogDescription>Dale acceso a un nuevo miembro de tu equipo.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                required
                value={form.nombre}
                onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="María Torres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correo">Correo</Label>
              <Input
                id="correo"
                type="email"
                required
                value={form.correo}
                onChange={(e) => setForm((prev) => ({ ...prev, correo: e.target.value }))}
                placeholder="maria.torres@seamar.pe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rol">Rol</Label>
              <Select
                value={form.rol}
                onValueChange={(value) => setForm((prev) => ({ ...prev, rol: value as UsuarioRol }))}
              >
                <SelectTrigger id="rol">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {ROL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear usuario</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}