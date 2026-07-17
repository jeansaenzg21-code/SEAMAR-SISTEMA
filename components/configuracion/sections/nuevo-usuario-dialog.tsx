"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
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
import { Loader2 } from "lucide-react"
import type { Usuario, UsuarioRol } from "@/components/configuracion/sections/usuarios-section"

const ROL_OPTIONS: { value: string; label: string }[] = [
  { value: "ADMINISTRADOR", label: "Administrador" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "OPERADOR", label: "Operador" },
]

const MAP_ROL_DB_TO_FRONT: Record<string, UsuarioRol> = {
  ADMINISTRADOR: "administrador",
  SUPERVISOR: "supervisor",
  OPERADOR: "operador",
}

const MAP_ROL_FRONT_TO_DB: Record<string, string> = {
  administrador: "ADMINISTRADOR",
  supervisor: "SUPERVISOR",
  operador: "OPERADOR",
}

interface NuevoUsuarioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (usuario: Usuario) => void
  editUsuario?: Usuario | null
}

const EMPTY_FORM = { usuario: "", nombre: "", correo: "", password: "", cargo: "", rol: "OPERADOR" }

export function NuevoUsuarioDialog({ open, onOpenChange, onCreated, editUsuario }: NuevoUsuarioDialogProps) {
  const isEditing = !!editUsuario

  function buildInitialForm() {
    if (editUsuario) {
      return {
        usuario: editUsuario.usuario,
        nombre: editUsuario.nombre,
        correo: editUsuario.correo,
        cargo: editUsuario.cargo,
        password: "",
        rol: MAP_ROL_FRONT_TO_DB[editUsuario.rol] || "OPERADOR",
      }
    }
    return EMPTY_FORM
  }

  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM)
      return
    }
    if (editUsuario) {
      setForm({
        usuario: editUsuario.usuario,
        nombre: editUsuario.nombre,
        correo: editUsuario.correo,
        cargo: editUsuario.cargo,
        password: "",
        rol: MAP_ROL_FRONT_TO_DB[editUsuario.rol] || "OPERADOR",
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [open, editUsuario])

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) onOpenChange(nextOpen)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)

    try {
      if (isEditing) {
        const payload: Record<string, string> = {
          usuario: form.usuario,
          nombre: form.nombre,
          correo: form.correo,
          cargo: form.cargo,
          rol: form.rol,
        }
        if (form.password) payload.password = form.password

        const res = await fetch(`/api/configuracion/usuarios/${editUsuario!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        const json = await res.json()
        if (!res.ok) throw new Error(json.message || "Error al actualizar usuario")

        const actualizado: Usuario = {
          id: editUsuario!.id,
          usuario: form.usuario,
          nombre: form.nombre,
          correo: form.correo,
          cargo: form.cargo,
          rol: MAP_ROL_DB_TO_FRONT[form.rol] || "operador",
          estado: editUsuario!.estado,
        }

        onCreated(actualizado)
        toast.success("Usuario actualizado correctamente")
        handleOpenChange(false)
      } else {
        const res = await fetch("/api/configuracion/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })

        const json = await res.json()
        if (!res.ok) throw new Error(json.message || "Error al crear usuario")

        const nuevo: Usuario = {
          id: String(json.usuario.id),
          usuario: json.usuario.usuario,
          nombre: json.usuario.nombre,
          correo: json.usuario.correo,
          cargo: json.usuario.cargo || "",
          rol: MAP_ROL_DB_TO_FRONT[json.usuario.rol] || "operador",
          estado: "activo",
        }

        onCreated(nuevo)
        toast.success("Usuario creado correctamente")
        handleOpenChange(false)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar usuario")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Actualiza los datos del usuario." : "Dale acceso a un nuevo miembro de tu equipo."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="usuario">Usuario</Label>
              <Input
                id="usuario"
                required
                value={form.usuario}
                onChange={(e) => setForm((prev) => ({ ...prev, usuario: e.target.value }))}
                placeholder="mtorres"
              />
            </div>
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
                placeholder="usuario@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={form.cargo}
                onChange={(e) => setForm((prev) => ({ ...prev, cargo: e.target.value }))}
                placeholder="Analista de Operaciones"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Contraseña {isEditing && <span className="text-muted-foreground text-xs">(opcional - dejar vacío para mantener la actual)</span>}
              </Label>
              <Input
                id="password"
                type="password"
                required={!isEditing}
                minLength={6}
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder={isEditing ? "Nueva contraseña (opcional)" : "Mínimo 6 caracteres"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rol">Rol</Label>
              <Select
                value={form.rol}
                onValueChange={(value) => setForm((prev) => ({ ...prev, rol: value }))}
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
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
