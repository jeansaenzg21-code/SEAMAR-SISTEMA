"use client"

import { useEffect, useState } from "react"
import {
  Plus,
  Filter,
  Download,
  Pencil,
  Eye,
  Send,
  RefreshCw
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "lucide-react"
import { MoreVertical } from "lucide-react"
import { FileText } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Status = "draft" | "under_review" | "observed" | "approved" | "invoiced"

type Valuation = {
  id: string

  codigo: string

  client: string
  orden_servicio: string
  type: string
  description: string
  projectName: string
  amount: number
  status: Status
  date: string
  encargado: string
  archivo_nombre?: string
  observacion_sistema?: string
archivo_url?: string
fecha_fin?: string | null

 pu: number

  

documentos_completos: number  
documentos_adjuntos?: number
documentos?: any[]
}



function StatusBadge({ status }: { status: Status }) {
  const label = {
    draft: "Borrador",
    under_review: "En revisión",
    observed: "Observado",
    approved: "Aprobado",
    invoiced: "Facturado",
  }

  const styles = {
    draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    under_review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    observed: "bg-red-500/10 text-red-400 border-red-500/20",
    approved: "bg-green-500/10 text-green-400 border-green-500/20",
    invoiced: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  }

  return (
    
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {label[status]}
    </span>
  )
}

export function ValuationsContent() {
  
  const enviarAObservado = async (
  item: Valuation,
  comentario?: string
) => {
  try {
    const observacion =
      comentario && comentario.trim() !== ""
        ? comentario.trim()
        : "Corrección solicitada desde Valorizaciones"

    const response = await fetch(
      `/api/valorizaciones/${item.id}/estado`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          estado: "OBSERVADO",
          observacion,
        }),
      }
    )

    const data = await response.json()

    if (!data.success) {
      alert(data.message || "No se pudo enviar a Observaciones")
      return
    }

    await cargarValorizaciones()

    setComentarioObservacion("")
    setIsViewOpen(false)

    alert("Enviado a Observaciones")
  } catch (error) {
    console.error(error)
    alert("Error al enviar a Observaciones")
  }
}
 const getAvanceValorizacion = (status: string) => {
  if (status === "draft") return 10
  if (status === "under_review") return 40
  if (status === "observed") return 40
  if (status === "approved") return 100
  return 0
} 
const [valuations, setValuations] = useState<Valuation[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [clientFilter, setClientFilter] = useState("all")
  const [clienteFiltro, setClienteFiltro] = useState("TODOS")
  const [searchQuery, setSearchQuery] = useState("")
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [editingValuation, setEditingValuation] = useState<Valuation | null>(null)

  const [client, setClient] = useState("")
  const [type, setType] = useState("")
  const [ordenServicio, setOrdenServicio] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [fecha, setFecha] = useState("")
  const [encargado, setEncargado] = useState("")
  const [documentos, setDocumentos] = useState<File[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState("")
  useEffect(() => {
  cargarValorizaciones()
}, [])

const [selectedValuation, setSelectedValuation] =
  useState<Valuation | null>(null)
  const [comentarioObservacion, setComentarioObservacion] =
  useState("")
const [clientes, setClientes] = useState<any[]>([])
const [proyectosCliente, setProyectosCliente] =
  useState<any[]>([])
 

useEffect(() => {
  const cargarClientes = async () => {
  try {
    const res = await fetch("/api/clientes")
    const data = await res.json()

    setClientes(Array.isArray(data) ? data : [])
  } catch (error) {
    console.error(error)
    setClientes([])
  }
}

  cargarClientes()
},[])


useEffect(() => {
  const cargarProyectosCliente = async () => {
    if (!client) {
      setProyectosCliente([])
      return
    }

    const clienteEncontrado =
      clientes.find(
        (c) => c.razon_social === client
      )

    if (!clienteEncontrado) return

    try {
      const res = await fetch(
        `/api/proyectos/cliente/${clienteEncontrado.id}`
      )

      const data = await res.json()

      setProyectosCliente(
        Array.isArray(data) ? data : []
      )
    } catch (error) {
      console.error(error)
      setProyectosCliente([])
    }
  }

  cargarProyectosCliente()
}, [client, clientes])

const [isViewOpen, setIsViewOpen] =
  useState(false)


  const documentosPorEmpresa: Record<string, number> = {
  REPSOL: 4,
  TDP: 3,
  TRALZA: 5,
}

const getCantidadDocumentosRequeridos = (empresa: string) => {
  const nombre =
    empresa.toUpperCase()

  if (nombre.includes("REPSOL")) return 4

  if (
    nombre.includes("TDP") ||
    nombre.includes("TERMINALES")
  ) return 3

  if (nombre.includes("TRALSA")) return 5

  return 0
}

const cantidadDocumentosRequeridos =
  getCantidadDocumentosRequeridos(client)

const cantidadDocumentosAdjuntos =
  documentos.length




const cargarValorizaciones = async () => {
  try {
    const response = await fetch("/api/valorizaciones")
    const data = await response.json()
    console.log(data)

  if (!Array.isArray(data)) {
  alert(data.message || "Error al cargar valorizaciones")
  console.error("ERROR API VALORIZACIONES:", data)
  setValuations([])
  return
}



    const valorizaciones = data.map((item: any) => ({
  codigo: item.codigo || "",

  projectName: item.proyecto_nombre || "",

  client: item.proveedor || "",

  orden_servicio:
    item.numero_orden_servicio || "",

  type:
    item.negocio_operacion || "",

  description:
    item.descripcion || "",

  amount:
    Number(item.monto || 0),

    id: item.id,
  
  pu:
  Number(item.pu || 0),
  

  documentos_adjuntos:
  Number(item.documentos_adjuntos || 0),

  status:
  (
    item.estado === "BORRADOR"
      ? "draft"
      : item.estado === "EN_REVISION"
      ? "under_review"
      : item.estado === "OBSERVADO"
      ? "observed"
      : item.estado === "APROBADO"
      ? "approved"
      : "draft"
  ) as Status,

  date:
    item.fecha_ejecucion
      ?.split("T")[0] || "",

  encargado:
    item.encargado || "",

  archivo_nombre:
    item.archivo_nombre || "",

  archivo_url: item.archivo_url || "",

  observacion_sistema:
    item.observacion_sistema || "",

    documentos_completos:
  Number(item.documentos_adjuntos || 0),
    
}))

    setValuations(valorizaciones)
  } catch (error) {
    console.error(error)
  }
}
const sincronizarOneDrive = async () => {

  try {
    

    const response =
      await fetch(
        "/api/sincronizar-valorizaciones",
        {
          method: "POST"
        }
      );

    const data =
      await response.json();

    console.log(data);

    await cargarValorizaciones();

    alert(
      `Sincronización completada.
Nuevos archivos: ${data.nuevos}`
    );

  } catch (error) {

    console.error(error);

    alert(
      "Error al sincronizar"
    );

  }

}

  const filteredValuations = valuations.filter((v) => {



  if (statusFilter !== "all" && v.status !== statusFilter) return false

  if (
    clientFilter !== "all" &&
    clientFilter !== "TODOS" &&
    v.client !== clientFilter
  ) return false

  if (
    selectedPeriod &&
    !v.date.startsWith(selectedPeriod)
  ) return false

  if (
    searchQuery &&
      !String(v.id).includes(searchQuery) &&
      !v.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !v.orden_servicio.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }

    return true
  })

  const vistaCliente =
  clientFilter?.toUpperCase().includes("REPSOL")
    ? "repsol"
    : "general"

  const limpiarFormulario = () => {
  setEditingValuation(null)
  setClient("")
  setType("")
  setOrdenServicio("")
  setDescription("")
  setAmount("")
  setFecha("")
  setEncargado("")
  setDocumentos([])
  }

  const guardarValorizacion = async () => {
  if (!client || !description || !amount) {
    alert("Completa los campos principales")
    return
  }

  if (
    cantidadDocumentosRequeridos > 0 &&
    cantidadDocumentosAdjuntos < cantidadDocumentosRequeridos
  ) {
    alert(
      `Para ${client} debes adjuntar ${cantidadDocumentosRequeridos} documentos.`
    )
    return
  }

  try {
  const url = editingValuation
    ? `/api/valorizaciones/${editingValuation.id}`
    : "/api/valorizaciones"

  const method = editingValuation
  ? "PATCH"
  : "POST"

const formData = new FormData()

formData.append("proveedor", client)
formData.append("ruc", "")
formData.append("proyecto_id", type)

const proyectoSeleccionado =
  proyectosCliente.find(
    (p: any) => String(p.id) === String(type)
  )

formData.append(
  "negocio_operacion",
  proyectoSeleccionado?.nombre || ""
)

formData.append("numero_orden_servicio", ordenServicio)
formData.append("descripcion", description)
formData.append("monto", String(amount))
formData.append("estado", "BORRADOR")
formData.append("moneda", "PEN")
formData.append("periodo", fecha)
formData.append("fecha_ejecucion", fecha)
formData.append("encargado", encargado)

documentos.forEach((doc) => {
  formData.append("documentos", doc)
})




const response = await fetch(url, {
  method,
  headers:
    editingValuation
      ? {
          "Content-Type":
            "application/json",
        }
      : undefined,

  body: editingValuation
    ? JSON.stringify({
        proveedor: client,
        negocio_operacion: type,
        numero_orden_servicio:
          ordenServicio,
        descripcion: description,
        monto: Number(amount),
        moneda: "PEN",
        periodo: fecha,
        fecha_ejecucion: fecha,
        encargado,
      })
    : formData,
})




    const data = await response.json()
    if (!data.success) {
      alert(data.message)
      return
    }

    await cargarValorizaciones()

    alert("Valorización registrada correctamente")

    limpiarFormulario()
    setIsNewModalOpen(false)
  } catch (error) {
    console.error(error)
    alert("Error al registrar valorización")
  }
}

  const editarValorizacion = (item: Valuation) => {
    setEditingValuation(item)
    setClient(item.client)
    setType(item.type)
    setOrdenServicio(item.orden_servicio)
    setDescription(item.description)
    setAmount(String(item.amount))
    setFecha(item.date)
    setEncargado(item.encargado)
    setDocumentos([])
    setIsNewModalOpen(true)
  }

  const enviarRevision = async (
  item: Valuation

) => {

  try {
    const observacionAutomatica =
  !item.archivo_nombre
    ? "Falta adjuntar el documento principal de valorización"
    : ""

if (observacionAutomatica) {
  const enviarAObservaciones = confirm(
    `Se detectó la siguiente observación:\n\n${observacionAutomatica}\n\n¿Desea enviar la valorización a Observaciones?`
  )

  if (!enviarAObservaciones) return

  const response = await fetch(`/api/valorizaciones/${item.id}/estado`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      estado: "OBSERVADO",
      observacion: observacionAutomatica,
    }),
  })

  const data = await response.json()

  if (!data.success) {
    alert("No se pudo enviar a Observaciones")
    return
  }

  await cargarValorizaciones()
  alert("Valorización enviada a Observaciones")
  return
}
    


        const response =
      await fetch(
        `/api/valorizaciones/${item.id}/estado`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            estado: "EN_REVISION",
          }),
        }
      );

    const data =
      await response.json();


      console.log(data)


    if (!data.success) {
      alert("No se pudo enviar a revisión");
      return;
    }

    await cargarValorizaciones();

    alert("Valorización enviada a revisión");

  } catch (error) {
    console.error(error);
    alert("Error al enviar a revisión");
  }
};

  



  const descargarExcel = (item: Valuation) => {
    const encabezados = [
  "ID Valorización",
  "Cliente",
  "N° Orden de Servicio",
  "Tipo",
  "Descripción",
  "Monto",
  "Estado",
  "Encargado",
  "Fecha"
]

    const datos = [
      `VAL-2026-${String(item.id).padStart(3, "0")}`,
      item.client,
      item.orden_servicio,
      item.type,
      item.description,
      `S/ ${item.amount.toLocaleString("es-PE")}`,
      item.status,
      item.encargado,
      item.date,
    ]

    const contenido = [
      encabezados.map((v) => `"${v}"`).join(";"),
      datos.map((v) => `"${v}"`).join(";"),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + contenido], {
      type: "text/csv;charset=utf-8;",
    })

    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `valorizacion-${item.id}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Valorizaciones</h1>
          <p className="text-muted-foreground">
            Gestión visual de valorizaciones asociadas a clientes, proyectos y órdenes de servicio.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-3">


            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 bg-secondary border-border">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="under_review">En revisión</SelectItem>
                <SelectItem value="observed">Observado</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="invoiced">Facturado</SelectItem>
              </SelectContent>
            </Select>
<Select value={clientFilter} onValueChange={setClientFilter}>
  <SelectTrigger className="w-44 bg-secondary border-border">
    <SelectValue placeholder="Clientes" />
  </SelectTrigger>

  <SelectContent>
    <SelectItem value="all">Clientes</SelectItem>

    {Array.isArray(clientes) &&
      clientes.map((cliente) => (
        <SelectItem
          key={cliente.id}
          value={cliente.razon_social}
        >
          {cliente.razon_social}
        </SelectItem>
      ))}
  </SelectContent>
</Select>
            <input
  type="month"
  value={selectedPeriod}
  onChange={(e) => setSelectedPeriod(e.target.value)}
  className="h-10 w-[180px] rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none [color-scheme:dark]"
/>
          </div>

          <div className="flex gap-3">

  <Button
    variant="ghost"
    size="icon"
    title="Sincronizar OneDrive"
    onClick={sincronizarOneDrive}
  >
    <RefreshCw
      className="h-4 w-4 text-blue-500"
    />
  </Button>

  <Button
    variant="outline"
    className="border-border"
  >
    <Download />
    Exportar
  </Button>

            <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={limpiarFormulario}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Valorización
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingValuation ? "Editar Valorización" : "Nueva Valorización"}
                  </DialogTitle>
                  <DialogDescription>
                    Complete los datos principales de la valorización.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Cliente</Label>
                    <Select value={client} onValueChange={setClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
  {clientes.map((cliente) => (
    <SelectItem key={cliente.id} value={cliente.razon_social}>
      {cliente.razon_social}
    </SelectItem>
  ))}
</SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Servicio / Proyecto</Label>
                    <Select
  value={type}
  onValueChange={(value) => {
    setType(value)

    const proyecto =
      proyectosCliente.find(
        (p) => String(p.id) === value
      )

    if (proyecto) {
      setDescription(
        proyecto.descripcion ||
        proyecto.nombre ||
        ""
      )

      if (proyecto.monto) {
        setAmount(String(proyecto.monto))
      }
    }
  }}
>
  <SelectTrigger>
    <SelectValue placeholder="Seleccionar proyecto o servicio" />
  </SelectTrigger>

  <SelectContent>
    {proyectosCliente.length === 0 ? (
      <SelectItem value="sin-proyectos" disabled>
        No hay proyectos/servicios
      </SelectItem>
    ) : (
      proyectosCliente.map((proyecto) => (
        <SelectItem
          key={proyecto.id}
          value={String(proyecto.id)}
        >
          {proyecto.tipo} - {proyecto.nombre}
        </SelectItem>
      ))
    )}
  </SelectContent>
</Select>


                  </div>

                  <div className="grid gap-2">
                    <Label>N° Orden de Servicio</Label>
                    <Input
                      placeholder="Ej: OS-000112"
                      value={ordenServicio}
                      onChange={(e) => setOrdenServicio(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Monto estimado (S/)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Fecha de Inicio</Label>
                    <Input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                    />
                  </div>

                

                  <div className="grid gap-2 col-span-2">
                    <Label>Encargado</Label>
                    <Input
                      placeholder="Ingrese Encargado"
                      value={encargado}
                      onChange={(e) => setEncargado(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2 col-span-2">
                    <Label>Descripción</Label>
                    <Textarea
                      placeholder="Introduzca la descripción..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
 
                  <div className="grid gap-2 col-span-2">
  <Label>Documentos de respaldo</Label>

{client && (
  <div className="rounded-lg border p-3 mb-2">
    <p className="font-medium">
      Empresa: {client}
    </p>

    <p>
      Requiere: {cantidadDocumentosRequeridos} documentos
    </p>

    <p>
      Adjuntados: {cantidadDocumentosAdjuntos}
    </p>
  </div>
)}

  <label
    htmlFor="documentos"
    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center hover:bg-muted/50"
  >
    <span className="text-sm font-medium">
      Subir documentos
    </span>

    <span className="text-xs text-muted-foreground">
      Adjunta los archivos requeridos según la empresa
    </span>
  </label>

  <Input
  id="documentos"
  type="file"
  multiple
  className="hidden"
  onChange={(e) => {
    const nuevos =
      Array.from(e.target.files || [])

    setDocumentos((prev) => [
      ...prev,
      ...nuevos,
    ])

    e.target.value = ""
  }}
/>

  {client && cantidadDocumentosRequeridos > 0 && (
  <div className="rounded-md bg-muted/40 p-3 text-sm">
    <span className="font-medium">
      {cantidadDocumentosAdjuntos}/{cantidadDocumentosRequeridos}
    </span>{" "}
    documentos adjuntos requeridos para {client}
  </div>
)}

  {documentos.length > 0 && (
    <div className="space-y-1">
      {documentos.map((doc, index) => (
        <p
          key={index}
          className="text-xs text-muted-foreground"
        >
          {index + 1}. {doc.name}
        </p>
      ))}
    </div>
  )}
</div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={guardarValorizacion}>
                    {editingValuation ? "Actualizar Valorización" : "Crear Valorización"}
                  </Button>
                </DialogFooter>
              </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto rounded-md">
                <table className="w-full table-auto text-sm">
                  <thead className="border-b bg-secondary">
  <tr>
    <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide min-w-[120px] whitespace-nowrap">
      ID
    </th>

    <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
      Cliente
    </th>

    {vistaCliente === "repsol" && (
      <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
        N° O/T
      </th>
    )}

    <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
      Proyecto
    </th>

    <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
      Descripción
    </th>

    {vistaCliente === "repsol" && (
      <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
        P. U.
      </th>
    )}

    <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
      Total
    </th>

    <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
      Fecha Inicio
    </th>

    <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
      Fecha Fin
    </th>

    <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
      Estado
    </th>

    <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
      Encargado
    </th>

    <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
      Documentos
    </th>

    <th className="px-4 py-3 text-left font-medium">
      Acciones
    </th>
  </tr>
</thead>

<tbody>
  {filteredValuations.map((item) => (
    <tr key={item.id} className="border-b border-border">
      <td className="px-5 py-4 font-medium min-w-[120px] whitespace-nowrap">
        {item.codigo || `VAL-2026-${String(item.id).padStart(3, "0")}`}
      </td>

      <td className="px-5 py-4 align-top">
        {item.client || "-"}
      </td>

      {vistaCliente === "repsol" && (
        <td className="px-5 py-4 whitespace-nowrap align-top">
          {item.orden_servicio || "-"}
        </td>
      )}

      <td className="px-5 py-4 max-w-[260px] align-top">
        <p className="line-clamp-2 text-sm font-medium">
          {item.projectName || "-"}
        </p>
      </td>

      <td className="px-5 py-4 max-w-[320px] align-top">
        <p className="line-clamp-2 text-sm">
          {item.description || "-"}
        </p>
      </td>

      {vistaCliente === "repsol" && (
  <td className="px-5 py-4 whitespace-nowrap align-top">
    {item.pu
      ? `S/ ${Number(item.pu).toLocaleString("es-PE")}`
      : "-"}
  </td>
)}

      <td className="px-5 py-4 whitespace-nowrap align-top">
        {item.amount != null
          ? `S/ ${item.amount.toLocaleString("es-PE")}`
          : "-"}
      </td>

      <td className="px-5 py-4 whitespace-nowrap align-top">
        {item.date || "-"}
      </td>

      <td className="px-5 py-4 whitespace-nowrap align-top">
        {item.fecha_fin
          ? new Date(item.fecha_fin).toLocaleDateString("es-PE")
          : "-"}
      </td>

      <td className="px-5 py-4 min-w-[120px] whitespace-nowrap align-top">
        <StatusBadge status={item.status} />
      </td>

      <td className="px-5 py-4 whitespace-nowrap align-top">
        {item.encargado || "-"}
      </td>

      <td className="px-5 py-4 align-top">
        {item.archivo_url ? (
          <a
            href={item.archivo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 text-xs hover:underline"
          >
            Ver documento
          </a>
        ) : (
          <span className="text-muted-foreground text-xs">
            {(item.documentos_adjuntos || 0) > 0 ? (
              <span className="text-green-500 font-medium">
                Archivos completos
              </span>
            ) : (
              <span className="text-red-500 font-medium">
                Sin documentos
              </span>
            )}
          </span>
        )}
      </td>

      <td className="px-4 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="outline">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={async () => {
                const res = await fetch(
                  `/api/valorizaciones/${item.id}/documentos`
                )

                const documentos = await res.json()

                setSelectedValuation({
                  ...item,
                  documentos,
                })

                setIsViewOpen(true)
              }}
            >
              Ver
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => editarValorizacion(item)}>
              Editar
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => enviarRevision(item)}>
              Enviar a revisión
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => descargarExcel(item)}>
              Descargar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  ))}
</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
            </div>

      {selectedValuation && (
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  VAL-2026-{String(selectedValuation.id).padStart(3, "0")}
                </p>

                <DialogTitle className="text-xl">
                  {selectedValuation.description || "Sin proyecto"}
                </DialogTitle>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <StatusBadge status={selectedValuation.status} />
                  <span>{selectedValuation.client}</span>
                  <span>·</span>
                  <span>{selectedValuation.date}</span>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3 border-y py-6">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground">MONTO</p>
                <p className="text-lg font-bold">
                  S/ {Number(selectedValuation.amount).toLocaleString("es-PE")}
                </p>
              </div>

              <div className="rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground">AVANCE</p>
                <p className="text-lg font-bold">
  {getAvanceValorizacion(selectedValuation.status)}%
</p>
              </div>

              <div className="rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground">RESP.</p>
                <p className="text-lg font-bold">
                  {selectedValuation.encargado || "Sin responsable"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground">
                DOCUMENTOS ADJUNTOS
              </p>

              
</div>
              <div className="space-y-2">
  {(selectedValuation.documentos || []).length > 0 ? (

    (selectedValuation.documentos || []).map(
      (doc: any, index: number) => (
        <a
          key={index}
          href={doc.url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 hover:bg-muted/40"
        >
          <div>
            <p className="text-sm font-medium">
              {doc.nombre}
            </p>
          </div>

          <span className="text-xs text-muted-foreground">
            Abrir
          </span>
        </a>
      )
    )

  ) : (

    <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
      No hay documentos adjuntos
    </div>

  )}
</div>
            

            <div className="space-y-4 pt-4">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground">
                LÍNEA DE APROBACIÓN
              </p>

              <div className="border-l pl-4 space-y-5">
                <div>
                  <p className="font-semibold">A. Rivas · SEAMAR</p>
                  <p className="text-sm text-muted-foreground">
                    Creación de borrador
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedValuation.date}
                  </p>
                </div>

                <div>
                  <p className="font-semibold">
                    {selectedValuation.encargado || "Responsable"} · SEAMAR
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Envió a cliente para revisión
                  </p>
                  <p className="text-xs text-muted-foreground">
                    En revisión
                  </p>
                </div>

                <div>
                  <p className="font-semibold">Cliente · {selectedValuation.client}</p>
                  <p className="text-sm text-muted-foreground">
                    Pendiente de aprobación
                  </p>
                  <p className="text-xs text-muted-foreground">—</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground">
                OBSERVACIONES
              </p>

              <div className="rounded-lg border bg-muted/30 p-4">
                {selectedValuation.observacion_sistema ? (
                  <p className="text-sm">
                    {selectedValuation.observacion_sistema}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hay observaciones registradas.
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  <Input
  placeholder="Responder observación..."
  value={comentarioObservacion}
  onChange={(e) =>
    setComentarioObservacion(e.target.value)
  }
/>

<Button
  variant="outline"
  onClick={() =>
    enviarAObservado(
      selectedValuation,
      comentarioObservacion
    )
  }
>
  Enviar
</Button> 
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 border-t bg-background pt-4">
  <Button
    variant="outline"
    className="w-full"
    onClick={() =>
  enviarAObservado(
    selectedValuation,
    comentarioObservacion
  )
}
  >
    Solicitar corrección
  </Button>
</div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
