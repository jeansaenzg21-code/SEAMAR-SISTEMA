"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw } from "lucide-react"
import { Briefcase } from "lucide-react";
import { UploadCloud } from "lucide-react";
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
  ArrowUpRight
} from "lucide-react"
import Link from "next/link"  
import { useEffect, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
interface ClientDetailProps {
  clientId: string
}
interface Client {
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


export function ClientDetailContent({ clientId }: ClientDetailProps) {

  const [contrato, setContrato] = useState<File | null>(null)
  const [analizandoContrato, setAnalizandoContrato] = useState(false)

  const [client, setClient] = useState<Client | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedClient, setEditedClient] = useState({
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
    tipo: "PROYECTO",
    monto: "",
    moneda: "PEN",
    fecha_inicio: "",
    fecha_fin: "",
  })
  const [projectErrors, setProjectErrors] =
  useState({
    nombre: "",
  })
  const [projects, setProjects] = useState<any[]>([])
  const extraerNombreContrato = (nombreArchivo: string) => {
  const sinExtension = nombreArchivo.replace(/\.[^/.]+$/, "")

  const partes = sinExtension.split(" - ")

  return partes[partes.length - 1]
    .replace(/^Firmado\s*/i, "")
    .trim()
}



const abrirContrato = () => {
  if (!contrato) return

  const url = URL.createObjectURL(contrato)
  window.open(url, "_blank")

  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}

  const recentProjects = projects
  const seleccionarContrato = async (file: File | null) => {
  setContrato(file)

  if (!file) return

  try {
    setAnalizandoContrato(true)

    const formData = new FormData()
    formData.append("contrato", file)

    const response = await fetch(
      "/api/extraer-datos-contrato",
      {
        method: "POST",
        body: formData,
      }
    )

    const data = await response.json()

    if (data.success) {
  console.log("DATOS IA CONTRATO:", data.data)

  setProjectForm((prev) => ({
    ...prev,
    tipo: data.data.tipo || prev.tipo,
    nombre: data.data.nombre || prev.nombre,
    descripcion:
      data.data.descripcion || prev.descripcion,
    monto:
      data.data.monto !== null &&
      data.data.monto !== undefined
        ? String(data.data.monto)
        : prev.monto,
    moneda:
      data.data.moneda || prev.moneda,
    fecha_inicio:
      data.data.fecha_inicio || prev.fecha_inicio,
    fecha_fin:
      data.data.fecha_fin || prev.fecha_fin,
  }))
}
  } catch (error) {
    console.error(error)
    alert("No se pudo analizar el contrato con IA")
  } finally {
    setAnalizandoContrato(false)
  }
}
const validarFormulario = () => {
  const nuevosErrores = {
    razon_social: "",
    correo: "",
    telefono: "",
  }
{
    nuevosErrores.razon_social =
      "La razón social es obligatoria"
  }

  if (
    editedClient.correo &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      editedClient.correo
    )
  ) {
    nuevosErrores.correo =
      "Correo inválido"
  }

  if (
    editedClient.telefono &&
    editedClient.telefono.length !== 9
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
const cargarCliente = async () => {
  try {
    const response = await fetch(
      `/api/clientes/${clientId}`
    )

    const data = await response.json()

    setClient(data)
    setEditedClient({
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
      `/api/proyectos/cliente/${clientId}`
    )

    const data = await response.json()

    setProjects(data)

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
  useState("Todos")

const [selectedService, setSelectedService] =
  useState("Todos")

const [selectedStatus, setSelectedStatus] =
  useState("Todos")

useEffect(() => {
  cargarCliente()
}, [clientId])

useEffect(() => {
  cargarProyectos()
}, [clientId])

if (!client) {
  return (
    <div className="p-6">
      Cargando cliente...
    </div>
  )
}
  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-4 flex-1">
          <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-xl font-bold text-white">
              {(client?.razon_social || "C").charAt(0)}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{client.razon_social}</h1>
            <p className="text-muted-foreground">Información del cliente</p>
          </div>
        </div>
        <div className="flex items-center gap-2">

  <Button
  variant="outline"
  size="icon"
  onClick={async () => {
    try {
      const response = await fetch(
        "/api/sincronizar-contratos",
        {
          method: "POST",
        }
      )

      const data = await response.json()

      if (!data.success) {
        alert("Error al sincronizar contratos")
        return
      }

      await cargarProyectos()

      alert("Proyectos sincronizados correctamente")
    } catch (error) {
      console.error(error)
      alert("Error de conexión")
    }
  }}
>
  <RefreshCw className="h-4 w-4" />
</Button>

  <Button
    onClick={() =>
      setOpenProjectModal(true)
    }
  >
    <Plus className="mr-2 h-4 w-4" />
    Nuevo Proyecto/Servicio
  </Button>

</div>
      </div>

      {/* Stats Cards */}
      {/* Stats Cards */}
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-md bg-primary/10 p-3">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
  {projects.length}
</p>
                <p className="text-sm text-muted-foreground">Proyectos/Servicios Totales</p>
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
  {(Array.isArray(projects) ? projects : []).filter((p) => p.estado === "EN_CURSO").length}

</p>
                <p className="text-sm text-muted-foreground">Proyectos/Servicios Activos</p>
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
                  S/ 0.00
                </p>
                <p className="text-sm text-muted-foreground">
                  Cobrado
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
                <p className="text-2xl font-bold">S/ 0.00</p>
                <p className="text-sm text-muted-foreground">Cuentas por Cobrar</p>
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
  setEditedClient({
    razon_social: client.razon_social,
    contacto_principal:
      client.contacto_principal || "",
    correo: client.correo || "",
    telefono: client.telefono || "",
    direccion: client.direccion || "",
  })

  setEditMode(true)
}}
        >
          Editar Cliente
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</CardHeader>
<CardContent className="space-y-4">
  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
    <div
      className="h-full bg-primary rounded-full"
      style={{ width: "0%" }}
    />
  </div>

  <div className="flex justify-end text-sm text-muted-foreground">
    0%
  </div>
</CardContent>
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
      value={editedClient.razon_social}
      onChange={(e) => {
  setEditedClient({
    ...editedClient,
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
    {client.razon_social || "-"}
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
        {client.ruc || "-"}
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
    value={editedClient.contacto_principal}
    onChange={(e) =>
      setEditedClient({
        ...editedClient,
        contacto_principal: e.target.value,
      })
    }
  />
) : (
  <p className="font-medium">
    {client.contacto_principal || "-"}
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
    value={editedClient.correo}
    onChange={(e) => {
  setEditedClient({
    ...editedClient,
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
    {client.correo || "-"}
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
      value={editedClient.telefono}
      onChange={(e) => {
  setEditedClient({
    ...editedClient,
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
    {client.telefono || "-"}
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
    value={editedClient.direccion}
    onChange={(e) =>
      setEditedClient({
        ...editedClient,
        direccion: e.target.value,
      })
    }
  />
) : (
  <p className="font-medium text-sm">
    {client.direccion || "-"}
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
        `/api/clientes/${client.id}`,
        {
          method: "PATCH",
          
          body: JSON.stringify(
            editedClient
          ),
        }
      )

      const data =
        await response.json()

      if (!data.success) {
        alert(
          "Error al actualizar cliente"
        )
        return
      }

      await cargarCliente()

      setEditMode(false)

    } catch (error) {
      console.error(error)

      alert(
        "Error al actualizar cliente"
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
        {/* Estado de Cobranza */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader> <CardTitle>Estado de Cobranza</CardTitle>
          <CardDescription>
            Resumen de cuentas por cobrar
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
    <option>Todos los proyectos</option>
  </select>

  <select
    value={selectedService}
    onChange={(e) =>
      setSelectedService(e.target.value)
    }
    className="h-10 rounded-md border border-border bg-background px-3"
  >
    <option>Todos los servicios</option>
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
        <span>Monto por Cobrar</span>
        <span>S/ 0.00</span>
      </div>

      <div className="h-6 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-red-500"
          style={{ width: "0%" }}
        />
      </div>
    </div>
  )}

  {(selectedStatus === "Todos" ||
    selectedStatus === "Pagado") && (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span>Monto Cobrado</span>
        <span>S/ 0.00</span>
      </div>

      <div className="h-6 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-green-500"
          style={{ width: "0%" }}
        />
      </div>
    </div>
  )}

</div>

          <div className="mt-6 border-t pt-4">
  <div className="flex justify-between font-semibold">
    <span>Total cartera</span>
    <span>S/ {cobranza.total.toLocaleString()}</span>
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
              <CardTitle>Proyectos/Servicios Registrados</CardTitle>
<CardDescription>Proyectos/Servicios activos y recientemente completados</CardDescription>
            </div>
           



              <Button variant="outline" size="sm">Ver Todos</Button>
           
          </div>
        </CardHeader>
        <CardContent className="space-y-4">

  {projects.length === 0 ? (

    <div className="rounded-lg border border-border p-8 text-center">
      <p className="text-muted-foreground">
        No hay proyectos/servicios registrados
      </p>
    </div>

  ) : (

    <div className="space-y-4">

  {(Array.isArray(recentProjects) ? recentProjects : []).map((project) => (

    <div
  key={project.id}
  className="rounded-lg border border-border bg-card p-6"
>
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <h3 className="text-lg font-semibold">
        {project.nombre}
      </h3>

      <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-medium text-cyan-400">
        {project.estado === "EN_CURSO"
          ? "Activo"
          : project.estado === "FINALIZADO"
          ? "Finalizado"
          : "Cancelado"}
      </span>
    </div>

   <div className="flex items-center gap-6">
  <span className="text-sm text-muted-foreground">
    0%
  </span>

  <Link href={`/projects/${project.id}`}>
  <Button variant="ghost" size="sm">
    Ver
    <ArrowUpRight className="ml-2 h-4 w-4" />
  </Button>
</Link>
</div>
  </div>

  <div className="mt-4 h-2 w-full rounded-full bg-muted overflow-hidden">
    <div
      className="h-full rounded-full bg-cyan-400"
      style={{ width: "0%" }}
    />
  </div>
</div>

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
        Nuevo Proyecto/Servicio
      </DialogTitle>

    </DialogHeader>

    <div className="space-y-4">
<div className="space-y-2">
  <label className="text-sm font-medium">
    Contrato 
  </label>

  <label
    htmlFor="contrato"
    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-5 text-center hover:bg-muted/50"
  >
    <UploadCloud className="mb-2 h-6 w-6 text-muted-foreground" />

    <span className="text-sm font-medium">
      {contrato
        ? contrato.name
        : "Adjuntar contrato"}
    </span>

    <span className="mt-1 text-xs text-muted-foreground">
      PDF, Word o Excel
    </span>

    <input
      id="contrato"
      type="file"
      className="hidden"
      accept=".pdf,.doc,.docx,.xls,.xlsx"
      onChange={(e) =>
  seleccionarContrato(e.target.files?.[0] || null)
}
    />
  </label>
  {analizandoContrato && (
  <p className="text-xs text-blue-500">
    Analizando contrato con IA...
  </p>
)}
  {contrato && (
  <Button
    type="button"
    variant="outline"
    className="w-full"
    onClick={abrirContrato}
  >
    Ver 
    <ArrowUpRight className="ml-2 h-4 w-4" />
  </Button>
)}
</div>
      <div>
        <div>
  <label className="text-sm">
    Tipo
  </label>

  <select
    value={projectForm.tipo}
    onChange={(e) =>
      setProjectForm({
        ...projectForm,
        tipo: e.target.value,
      })
    }
    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
  >
    <option value="PROYECTO">
      Proyecto
    </option>
    <option value="SERVICIO">
      Servicio
    </option>
  </select>
</div>
<div>
  

  
    
  
</div>
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
<div className="grid grid-cols-2 gap-3">
  <div>
    <label className="text-sm">
      Monto
    </label>
    <Input
      value={projectForm.monto}
      onChange={(e) =>
        setProjectForm({
          ...projectForm,
          monto: e.target.value,
        })
      }
    />
  </div>

  <div>
    <label className="text-sm">
      Moneda
    </label>
    <select
      value={projectForm.moneda}
      onChange={(e) =>
        setProjectForm({
          ...projectForm,
          moneda: e.target.value,
        })
      }
      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
    >
      <option value="PEN">PEN</option>
      <option value="USD">USD</option>
    </select>
  </div>
</div>

<div className="grid grid-cols-2 gap-3">
  <div>
    <label className="text-sm">
      Fecha inicio
    </label>
    <Input
      type="date"
      value={projectForm.fecha_inicio}
      onChange={(e) =>
        setProjectForm({
          ...projectForm,
          fecha_inicio: e.target.value,
        })
      }
    />
  </div>

  <div>
    <label className="text-sm">
      Fecha fin
    </label>
    <Input
      type="date"
      value={projectForm.fecha_fin}
      onChange={(e) =>
        setProjectForm({
          ...projectForm,
          fecha_fin: e.target.value,
        })
      }
    />
  </div>
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
            const formData = new FormData()

formData.append(
  "cliente_id",
  String(client.id)
)

formData.append(
  "nombre",
  projectForm.nombre
)

formData.append(
  "descripcion",
  projectForm.descripcion
)

if (contrato) {
  formData.append(
    "contrato",
    contrato
  )
}

const projectData = new FormData()

projectData.append("cliente_id", String(client.id))
projectData.append("nombre", projectForm.nombre)
projectData.append("descripcion", projectForm.descripcion)
projectData.append("tipo", projectForm.tipo)
projectData.append("monto", projectForm.monto)
projectData.append("moneda", projectForm.moneda)
projectData.append("fecha_inicio", projectForm.fecha_inicio)
projectData.append("fecha_fin", projectForm.fecha_fin)

if (contrato) {
  projectData.append("contrato", contrato)
}

const response =
  await fetch(
    "/api/proyectos",
    {
      method: "POST",
      body: projectData,
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
  tipo: "PROYECTO",
  monto: "",
  moneda: "PEN",
  fecha_inicio: "",
  fecha_fin: "",
})

setContrato(null)



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
