"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  FolderKanban,
  MoreVertical,
  FileText,
  DollarSign,
  Users,
  Mail,
  Phone,
  MapPin,
  Building2,
  TrendingUp,
  Plus,
  DollarSignIcon,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
interface ProviderDetailProps {
  providerId: string
}
interface Provider {
  id: number
  razon_social: string
  ruc: string
  estado: string
  contacto_principal: string | null
  correo: string | null
  telefono: string | null
  direccion: string | null
}


const cobranza = {
  cobrado: 0,
  pendiente: 0,
  porcentajeCobrado: 0,
  porcentajePendiente: 0,
  total: 0,
}


export function ProviderDetailContent({ providerId }: ProviderDetailProps) {

  const [provider, setProvider] = useState<Provider | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedProvider, setEditedProvider] = useState({
  razon_social: "",
  contacto_principal: "",
  correo: "",
  telefono: "",
  direccion: "",
})
const [errors, setErrors] = useState({
  razon_social: "",
  correo: "",
  telefono: "",
})
const [openProjectModal, setOpenProjectModal] =
  useState(false)

const [projectForm, setProjectForm] =
  useState({
    nombre: "",
    descripcion: "",
  })
  const [projectErrors, setProjectErrors] =
  useState({
    nombre: "",
  })
  const [projects, setProjects] = useState<any[]>([])

  const [movimientos, setMovimientos] = useState<any[]>([])

const validarFormulario = () => {
  const nuevosErrores = {
    razon_social: "",
    correo: "",
    telefono: "",
  }

  if (!editedProvider.razon_social.trim()) {
    nuevosErrores.razon_social =
      "La razón social es obligatoria"
  }

  if (
    editedProvider.correo &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
  editedProvider.correo
)
  ) {
    nuevosErrores.correo =
      "Correo inválido"
  }

  if (
    editedProvider.telefono &&
    editedProvider.telefono.length !== 9
  ) {
    nuevosErrores.telefono =
      "El teléfono debe tener 9 dígitos"
  }

  setErrors(nuevosErrores)

  return !Object.values(
    nuevosErrores
  ).some(Boolean)
}
const validarProyecto = () => {
  const nuevosErrores = {
    nombre: "",
  }

  if (!projectForm.nombre.trim()) {
    nuevosErrores.nombre =
      "El nombre del proyecto es obligatorio"
  }

  setProjectErrors(nuevosErrores)

  return !Object.values(
    nuevosErrores
  ).some(Boolean)
}
const cargarProvider = async () => {
  try {
    const response = await fetch(
      `/api/proveedores/${providerId}`
    )

    const data = await response.json()

    setProvider(data)
    setEditedProvider({
  razon_social:
    data.razon_social || "",
  contacto_principal:
    data.contacto_principal || "",
  correo: data.correo || "",
  telefono: data.telefono || "",
  direccion: data.direccion || "",
})
  } catch (error) {
    console.error(error)
  }
}
const cargarProyectos = async () => {
  try {
    const response = await fetch(
      `/api/proyectos/proveedor/${providerId}`
    )

    const data = await response.json()

    setProjects(data)

  } catch (error) {
    console.error(error)
  }
}

const cargarMovimientos = async () => {
  try {

    const response = await fetch(
      `/api/movimientos/proveedor/${providerId}`
    )

    const data = await response.json()

    setMovimientos(data)

  } catch (error) {
    console.error(error)
  }
}
const cambiarEstadoProyecto =
  async (
    id: number,
    estado: string
  ) => {
    try {
      const response =
        await fetch(
          `/api/proyectos/${id}/estado`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                estado,
              }),
          }
        )

      const data =
        await response.json()

      if (data.success) {
        await cargarProyectos()
      }

    } catch (error) {
      console.error(error)
    }
  }

const [selectedProject, setSelectedProject] =
  useState("Todos los proyectos")

const [selectedService, setSelectedService] =
  useState("Todos los servicios")

const [selectedStatus, setSelectedStatus] =
  useState("Todos")

const totalPendiente = movimientos
  .filter(
    (m) => m.estado === "PENDIENTE"
  )
  .reduce(
    (acc, mov) =>
      acc + Number(mov.monto),
    0
  )

const totalPagado = movimientos
  .filter(
    (m) => m.estado === "PAGADO"
  )
  .reduce(
    (acc, mov) =>
      acc + Number(mov.monto),
    0
  )

const totalMovimientos = movimientos.length

const totalGeneral =
  totalPendiente + totalPagado

const porcentajePendiente =
  totalGeneral > 0
    ? (totalPendiente * 100) / totalGeneral
    : 0

const porcentajePagado =
  totalGeneral > 0
    ? (totalPagado * 100) / totalGeneral
    : 0

const movimientosFiltrados = movimientos.filter((mov) => {

  if (
    selectedStatus !== "Todos" &&
    mov.estado !== selectedStatus.toUpperCase()
  ) {
    return false
  }

  if (
    selectedProject !== "Todos los proyectos" &&
    mov.proyecto_nombre !== selectedProject
  ) {
    return false
  }

  if (
    selectedService !== "Todos los servicios" &&
    mov.servicio !== selectedService
  ) {
    return false
  }

  return true
})

useEffect(() => {
  cargarProvider()
  cargarMovimientos()
}, [providerId])

if (!provider) {
  return (
    <div className="p-6">
      Cargando proveedor...
    </div>
  )
}
  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <Link href="/providers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-4 flex-1">
          <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-xl font-bold text-white">
              {provider.razon_social.charAt(0)}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{provider.razon_social}</h1>
            <p className="text-muted-foreground">Información del proveedor</p>
          </div>
        </div>
        <Button>
  <Plus className="mr-2 h-4 w-4" />
  Subir Cuenta
</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-md bg-primary/10 p-3">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
  {totalMovimientos}
</p>
                <p className="text-sm text-muted-foreground">Cuentas por Pagar</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-md bg-success/10 p-3">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
  {movimientos.filter(
  (m) => m.estado === "PAGADO"
).length}
</p>
                <p className="text-sm text-muted-foreground">Cuentas Pagadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-md bg-primary/10 p-3">
                <DollarSignIcon className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  S/ {totalPendiente.toLocaleString(
  "es-PE",
  {
    minimumFractionDigits: 2
  }
)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Monto Pendiente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-md bg-warning/10 p-3">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">S/ {totalPagado.toLocaleString(
  "es-PE",
  {
    minimumFractionDigits: 2
  }
)}</p>
                <p className="text-sm text-muted-foreground">Monto pagado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */} 
      <div className="grid gap-6 lg:grid-cols-3">
      {/* Contact Info */} 
      <Card className="bg-card border-border lg:col-span-1">
  <CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle>
      Información de Contacto
    </CardTitle>

    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
  setEditedProvider({
  razon_social: provider.razon_social,
  contacto_principal: provider.contacto_principal || "",
  correo: provider.correo || "",
  telefono: provider.telefono || "",
  direccion: provider.direccion || "",
})

  setEditMode(true)
}}
        >
          Editar Proveedor
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</CardHeader>

  <CardContent className="space-y-4 pb-6">
    {editMode && (
  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
    Modo edición activado
  </div>
)}
    <div className="flex items-center gap-3">
  <div className="rounded-md bg-muted p-2">
    <Building2 className="h-4 w-4 text-muted-foreground" />
  </div>
  <div className="flex-1">
    <p className="text-sm text-muted-foreground">
      Razón Social
    </p>
    {editMode ? (
  <>
    <Input
      value={editedProvider.razon_social}
      onChange={(e) => {
  setEditedProvider({
    ...editedProvider,
    razon_social: e.target.value,
  })

  setErrors({
    ...errors,
    razon_social: "",
  })
}}
      className={
        errors.razon_social
          ? "border-red-500"
          : ""
      }
    />

    {errors.razon_social && (
      <p className="text-xs text-red-500 mt-1">
        {errors.razon_social}
      </p>
    )}
  </>
) : (
  <p className="font-medium">
    {provider.razon_social || "-"}
  </p>
)}
  </div>
</div>

{!editMode && (
  <div className="flex items-center gap-3">
    <div className="rounded-md bg-muted p-2">
      <FileText className="h-4 w-4 text-muted-foreground" />
    </div>

    <div>
      <p className="text-sm text-muted-foreground">
        RUC
      </p>

      <p className="font-medium">
        {provider.ruc || "-"}
      </p>
    </div>
  </div>
)}
      <div className="flex items-center gap-3">
  <div className="rounded-md bg-muted p-2">
    <Users className="h-4 w-4 text-muted-foreground" />
  </div>
  <div className="flex-1">
    <p className="text-sm text-muted-foreground">
      Contacto principal
    </p>
    {editMode ? (
  <Input
    value={editedProvider.contacto_principal}
    onChange={(e) =>
      setEditedProvider({
        ...editedProvider,
        contacto_principal: e.target.value,
      })
    }
  />
) : (
  <p className="font-medium">
    {provider.contacto_principal || "-"}
  </p>
)}
  </div>
</div>

<div className="flex items-center gap-3">
  <div className="rounded-md bg-muted p-2">
    <Mail className="h-4 w-4 text-muted-foreground" />
  </div>
  <div className="flex-1">
    <p className="text-sm text-muted-foreground">
      Correo
    </p>
    {editMode ? (
      <>
  <Input
    value={editedProvider.correo}
    onChange={(e) => {
  setEditedProvider({
    ...editedProvider,
    correo: e.target.value,
  })

  setErrors({
    ...errors,
    correo: "",
  })
}}
    className={
  errors.correo
    ? "border-red-500"
    : ""
    
}

  />
  {errors.correo && (
  <p className="text-xs text-red-500 mt-1">
    {errors.correo}
  </p>
)}
</>
) : (
  <p className="font-medium">
    {provider.correo || "-"}
  </p>
)}
  </div>
</div>

<div className="flex items-center gap-3">
  <div className="rounded-md bg-muted p-2">
    <Phone className="h-4 w-4 text-muted-foreground" />
  </div>
  <div className="flex-1">
    <p className="text-sm text-muted-foreground">
      Teléfono
    </p>
    {editMode ? (
  <>
    <Input
      value={editedProvider.telefono}
      onChange={(e) => {
  setEditedProvider({
    ...editedProvider,
    telefono: e.target.value
      .replace(/\D/g, "")
      .slice(0, 9),
  })

  setErrors({
    ...errors,
    telefono: "",
  })
}}
      maxLength={9}
      className={
        errors.telefono
          ? "border-red-500"
          : ""
      }
    />

    {errors.telefono && (
      <p className="text-xs text-red-500 mt-1">
        {errors.telefono}
      </p>
    )}
  </>
) : (
  <p className="font-medium">
    {provider.telefono || "-"}
  </p>
)}
  </div>
</div>

<div className="flex items-center gap-3">
  <div className="rounded-md bg-muted p-2">
    <MapPin className="h-4 w-4 text-muted-foreground" />
  </div>
  <div className="flex-1">
    <p className="text-sm text-muted-foreground">
      Dirección
    </p>
    {editMode ? (
  <Input
    value={editedProvider.direccion}
    onChange={(e) =>
      setEditedProvider({
        ...editedProvider,
        direccion: e.target.value,
      })
    }
  />
) : (
  <p className="font-medium text-sm">
    {provider.direccion || "-"}
  </p>
)}
  </div>
</div>
{editMode && (
  <div className="flex justify-end gap-2 pt-4">
    <Button
      variant="outline"
      onClick={() => setEditMode(false)}
    >
      Cancelar
    </Button>

    <Button
  onClick={async () => {
    if (!validarFormulario()) return

    try {
      const response = await fetch(
        `/api/proveedores/${provider.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            editedProvider
          ),
        }
      )

      const data =
        await response.json()

      if (!data.success) {
        alert(
          "Error al actualizar proveedor"
        )
        return
      }

      await cargarProvider()

      setEditMode(false)

    } catch (error) {
      console.error(error)

      alert(
        "Error al actualizar proveedor"
      )
    }
  }}
>
  Guardar
</Button>
  </div>
)}
 </CardContent>
</Card>
        {/* Estado de Pagos */}
<Card className="bg-card border-border lg:col-span-2">

  <CardHeader>
    <CardTitle>
      Estado de Pagos
    </CardTitle>

    <CardDescription>
      Resumen de cuentas por pagar
    </CardDescription>
  </CardHeader>

  <CardContent>

    <div className="grid gap-3 md:grid-cols-3 mb-6">

      <select
  value={selectedProject}
  onChange={(e) =>
    setSelectedProject(e.target.value)
  }
  className="h-10 rounded-md border border-border bg-background px-3"
>
  <option>
    Todos los proyectos
  </option>

  {[
    ...new Set(
      movimientos
        .map(
          (m) => m.proyecto_nombre
        )
        .filter(Boolean)
    )
  ].map((nombre) => (
    <option
      key={nombre}
      value={nombre}
    >
      {nombre}
    </option>
  ))}
</select>

      <select
  value={selectedService}
  onChange={(e) =>
    setSelectedService(e.target.value)
  }
  className="h-10 rounded-md border border-border bg-background px-3"
>
  <option>
    Todos los servicios
  </option>

  {[
    ...new Set(
      movimientos
        .map((m) => m.servicio)
        .filter(Boolean)
    )
  ].map((servicio) => (
    <option
      key={servicio}
      value={servicio}
    >
      {servicio}
    </option>
  ))}
</select>

      <select
        value={selectedStatus}
        onChange={(e) =>
          setSelectedStatus(e.target.value)
        }
        className="h-10 rounded-md border border-border bg-background px-3"
      >
        <option>Todos</option>
        <option>Pendiente</option>
        <option>Pagado</option>
      </select>

    </div>

    <div className="space-y-6 rounded-lg border border-border p-6">

  {(selectedStatus === "Todos" ||
    selectedStatus === "Pendiente") && (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span>Monto Pendiente</span>
        <span>
  S/ {totalPendiente.toLocaleString(
    "es-PE",
    {
      minimumFractionDigits: 2
    }
  )}
</span>
      </div>

      <div className="h-6 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-red-500"
          style={{
  width: `${porcentajePendiente}%`
}}
        />
      </div>
    </div>
  )}

  {(selectedStatus === "Todos" ||
    selectedStatus === "Pagado") && (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span>Monto Pagado</span>
        <span>
  S/ {totalPagado.toLocaleString(
    "es-PE",
    {
      minimumFractionDigits: 2
    }
  )}
</span>
      </div>

      <div className="h-6 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-green-500"
          style={{
  width: `${porcentajePagado}%`
}}
        />
      </div>
    </div>
  )}

</div>
<div className="mt-6 border-t pt-4">
  <div className="flex justify-between font-semibold">
    <span>Total cuentas</span>
    <span>S/ {totalGeneral.toLocaleString(
    "es-PE",
    {
      minimumFractionDigits: 2
    }
  )}</span>
  </div>
</div>

  </CardContent>

</Card>
    </div>



      {/* Recent Projects */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Movimientos</CardTitle>
              <CardDescription>Documentos procesados asociados al proveedor</CardDescription>
            </div>
            



              <Button variant="outline" size="sm">Ver Todos</Button>
            
          </div>
        </CardHeader>
        <CardContent className="space-y-4">

  {projects.length === 0 ? (

    <div className="rounded-lg border border-border p-8 text-center">
      <p className="text-muted-foreground">
        No hay proyectos registrados
      </p>
    </div>

  ) : (

    <div className="grid gap-4 lg:grid-cols-3">

  {projects.map((project) => (

    <Card
      key={project.id}
      className="bg-card border-border"
    >

      <CardHeader className="pb-2">

        <div className="flex items-center justify-between">

          <CardTitle className="text-base">
            {project.nombre}
          </CardTitle>

          <div className="flex items-center gap-2">

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium
              ${
                project.estado === "EN_CURSO"
                  ? "bg-green-500/15 text-green-500"
                  : project.estado ===
                    "FINALIZADO"
                  ? "bg-blue-500/15 text-blue-500"
                  : "bg-red-500/15 text-red-500"
              }`}
            >
              {project.estado ===
              "EN_CURSO"
                ? "Activo"
                : project.estado ===
                  "FINALIZADO"
                ? "Finalizado"
                : "Cancelado"}
            </span>

            <DropdownMenu>

              <DropdownMenuTrigger
                asChild
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
              >
                <DropdownMenuItem
  onClick={() =>
    cambiarEstadoProyecto(
      project.id,
      "EN_CURSO"
    )
  }
>
  Activo
</DropdownMenuItem>

                <DropdownMenuItem
  onClick={() =>
    cambiarEstadoProyecto(
      project.id,
      "FINALIZADO"
    )
  }
>
  Finalizado
</DropdownMenuItem>

                <DropdownMenuItem
  onClick={() =>
    cambiarEstadoProyecto(
      project.id,
      "CANCELADO"
    )
  }
>
  Cancelado
</DropdownMenuItem>
              </DropdownMenuContent>

            </DropdownMenu>

          </div>

        </div>

      </CardHeader>

      <CardContent>

        <div className="space-y-3 text-sm">

  <div className="flex justify-between">
    <span className="text-muted-foreground">
      Inicio
    </span>

    <span className="font-medium">
      {new Date(
        project.fecha_inicio
      ).toLocaleDateString("es-PE")}
    </span>
  </div>

  <div className="flex justify-between">
    <span className="text-muted-foreground">
      Fin
    </span>

    <span className="font-medium">
      {project.fecha_fin
        ? new Date(
            project.fecha_fin
          ).toLocaleDateString("es-PE")
        : "En curso"}
    </span>
  </div>

</div>


      </CardContent>

      <div className="flex justify-end border-t border-border pt-4">
  <Button
    variant="ghost"
    size="sm"
    className="text-primary hover:text-primary"
  >
    Ver detalles 
  </Button>
</div>

    </Card>

  ))}

</div>

  )}

</CardContent>
      </Card>
      <Dialog
  open={openProjectModal}
  onOpenChange={
    setOpenProjectModal
  }
>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>
        Nuevo Proyecto
      </DialogTitle>

    </DialogHeader>

    <div className="space-y-4">

      <div>
        <label className="text-sm">
          Nombre
        </label>

        <Input
          value={projectForm.nombre}
          onChange={(e) => {
            setProjectForm({
              ...projectForm,
              nombre:
                e.target.value,
            })

            setProjectErrors({
              nombre: "",
            })
          }}
          className={
            projectErrors.nombre
              ? "border-red-500"
              : ""
          }
        />

        {projectErrors.nombre && (
          <p className="text-xs text-red-500 mt-1">
            {projectErrors.nombre}
          </p>
        )}
      </div>

      <div>
        <label className="text-sm">
          Descripción
        </label>

        <Input
          value={
            projectForm.descripcion
          }
          onChange={(e) =>
            setProjectForm({
              ...projectForm,
              descripcion:
                e.target.value,
            })
          }
        />
      </div>

    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onClick={() =>
          setOpenProjectModal(
            false
          )
        }
      >
        Cancelar
      </Button>

      <Button
        onClick={async () => {
          if (
            !validarProyecto()
          )
            return

          try {
            const response =
              await fetch(
                "/api/proyectos",
                {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body:
                    JSON.stringify({
                      proveedor_id:
                        provider.id,
                      nombre:
                        projectForm.nombre,
                      descripcion:
                        projectForm.descripcion,
                    }),
                }
              )

            const data =
              await response.json()

            if (
              !data.success
            ) {
              alert(
                "Error al registrar proyecto"
              )
              return
            }

            setProjectForm({
  nombre: "",
  descripcion: "",
})

await cargarProyectos()

setOpenProjectModal(
  false
)

            alert(
              "Proyecto registrado"
            )

          } catch (error) {
            console.error(
              error
            )

            alert(
              "Error al registrar proyecto"
            )
          }
        }}
      >
        Registrar
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>


    </div>
     
  )
}
