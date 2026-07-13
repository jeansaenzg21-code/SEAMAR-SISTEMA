"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Plus, UserX, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { NuevoUsuarioDialog } from "@/components/configuracion/sections/nuevo-usuario-dialog"

// Los roles y el estado son identificadores que en el futuro vendrán del
// backend. Esta sección es la única responsable de traducirlos a etiqueta
// y estilo, igual que ALERT_STATUS_CONFIG / CLIENT_STATUS_CONFIG en el
// Dashboard.
export type UsuarioRol = "administrador" | "supervisor" | "operador" | "consulta"
export type UsuarioEstado = "activo" | "inactivo"

export interface Usuario {
  id: string
  nombre: string
  correo: string
  rol: UsuarioRol
  estado: UsuarioEstado
}

const ROL_CONFIG: Record<UsuarioRol, { label: string; className: string }> = {
  administrador: { label: "Administrador", className: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  supervisor: { label: "Supervisor", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  operador: { label: "Operador", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  consulta: { label: "Consulta", className: "bg-secondary text-muted-foreground border-border" },
}

function getIniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

const ESTADO_CONFIG: Record<UsuarioEstado, { label: string; className: string; dotColor: string }> = {
  activo: {
    label: "Activo",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dotColor: "bg-emerald-400",
  },
  inactivo: {
    label: "Inactivo",
    className: "bg-secondary text-muted-foreground border-border",
    dotColor: "bg-muted-foreground",
  },
}

// Datos simulados solo para revisar el diseño. Cuando exista el backend,
// esto se reemplaza por un fetch a GET /api/configuracion/usuarios
// (ver INTEGRACION.md).
const MOCK_USUARIOS: Usuario[] = [
  { id: "1", nombre: "Sheran Saenz", correo: "sheran.saenz@seamar.pe", rol: "administrador", estado: "activo" },
  { id: "2", nombre: "Carlos Mendoza", correo: "carlos.mendoza@seamar.pe", rol: "supervisor", estado: "activo" },
  { id: "3", nombre: "María Torres", correo: "maria.torres@seamar.pe", rol: "operador", estado: "activo" },
  { id: "4", nombre: "Luis Ramos", correo: "luis.ramos@seamar.pe", rol: "consulta", estado: "inactivo" },
]

export function UsuariosSection() {
  const [usuarios, setUsuarios] = useState<Usuario[]>(MOCK_USUARIOS)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Simulado: solo actualiza el estado local, sin backend todavía.
  function handleToggleEstado(usuario: Usuario) {
    const nuevoEstado: UsuarioEstado = usuario.estado === "activo" ? "inactivo" : "activo"
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuario.id ? { ...u, estado: nuevoEstado } : u))
    )
    toast.success(
      nuevoEstado === "inactivo" ? `${usuario.nombre} fue desactivado` : `${usuario.nombre} fue reactivado`
    )
  }

  function handleUsuarioCreado(usuario: Usuario) {
    setUsuarios((prev) => [usuario, ...prev])
    toast.success("Usuario creado correctamente")
  }

  return (
    <Card className="border-border/80 bg-card shadow-sm">
      <CardContent className="p-8 sm:p-10">
        <div className="mb-7 flex items-center justify-between">
          <p className="text-sm text-muted-foreground/80">
            {usuarios.length} {usuarios.length === 1 ? "usuario" : "usuarios"} con acceso al sistema
          </p>
          <Button onClick={() => setDialogOpen(true)} size="lg" className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/70">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-secondary/30 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="py-3.5 pl-5 pr-4">Nombre</th>
                  <th className="py-3.5 pr-4">Correo</th>
                  <th className="py-3.5 pr-4">Rol</th>
                  <th className="py-3.5 pr-4">Estado</th>
                  <th className="py-3.5 pr-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => {
                  const estadoConfig = ESTADO_CONFIG[usuario.estado]
                  const rolConfig = ROL_CONFIG[usuario.rol]
                  return (
                    <tr
                      key={usuario.id}
                      className="border-b border-border/50 transition-colors duration-150 last:border-0 hover:bg-secondary/30"
                    >
                      <td className="py-4 pl-5 pr-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {getIniciales(usuario.nombre)}
                          </span>
                          <span className="font-medium">{usuario.nombre}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-muted-foreground">{usuario.correo}</td>
                      <td className="py-4 pr-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                            rolConfig.className
                          )}
                        >
                          {rolConfig.label}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium",
                            estadoConfig.className
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", estadoConfig.dotColor)} />
                          {estadoConfig.label}
                        </span>
                      </td>
                      <td className="py-4 pr-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="transition-colors">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toast.info("Edición de usuario próximamente")}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleEstado(usuario)}>
                              <UserX className="mr-2 h-4 w-4" />
                              {usuario.estado === "activo" ? "Desactivar" : "Reactivar"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>

      <NuevoUsuarioDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={handleUsuarioCreado} />
    </Card>
  )
}