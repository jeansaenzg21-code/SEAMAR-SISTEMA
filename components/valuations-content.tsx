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
  id: number
  client: string
  orden_servicio: string
  type: string
  description: string
  amount: number
  status: Status
  date: string
  encargado: string
  archivo_nombre?: string
  observacion_sistema?: string
archivo_url?: string
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
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {label[status]}
    </span>
  )
}

export function ValuationsContent() {
  const [valuations, setValuations] = useState<Valuation[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [clientFilter, setClientFilter] = useState("all")
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
  const [archivo, setArchivo] = useState<File | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState("")
  useEffect(() => {
  cargarValorizaciones()
}, [])

const cargarValorizaciones = async () => {
  try {
    const response = await fetch("/api/valorizaciones")
    const data = await response.json()

    const valorizaciones = data.map((item: any) => ({
  id: item.id,

  client: item.proveedor || "",

  orden_servicio:
    item.numero_orden_servicio || "",

  type:
    item.negocio_operacion || "",

  description:
    item.descripcion || "",

  amount:
    Number(item.monto || 0),

  status:
    item.estado === "BORRADOR"
      ? "draft"
      : item.estado === "EN_REVISION"
      ? "under_review"
      : item.estado === "OBSERVADO"
      ? "observed"
      : item.estado === "APROBADO"
      ? "approved"
      : "draft",

  date:
    item.fecha_ejecucion
      ?.split("T")[0] || "",

  encargado:
    item.encargado || "",

  archivo_nombre:
    item.archivo_nombre || "",

  observacion_sistema:
    item.observacion_sistema || "",
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
    if (clientFilter !== "all" && v.client !== clientFilter) return false
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

  const limpiarFormulario = () => {
  setEditingValuation(null)
  setClient("")
  setType("")
  setOrdenServicio("")
  setDescription("")
  setAmount("")
  setFecha("")
  setEncargado("")
  setArchivo(null)
}

  const guardarValorizacion = async () => {
  if (!client || !description || !amount) {
    alert("Completa los campos principales")
    return
  }

  try {
    const response = await fetch("/api/valorizaciones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
  proveedor: client,
  ruc: null,
  negocio_operacion: type,
  numero_orden_servicio: ordenServicio,
  descripcion: description,
  monto: Number(amount),

  estado: "BORRADOR",

  moneda: "PEN",
  periodo: fecha,
  fecha_ejecucion: fecha,
  encargado,
  archivo_nombre: archivo?.name || null,
  archivo_onedrive_id: null,
  archivo_url: null,
  respaldo_nombre: archivo?.name || null,
  respaldo_onedrive_id: null,
  respaldo_url: null,
  
}),
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
    setArchivo(null)
    setIsNewModalOpen(true)
  }

  const enviarRevision = async (
  item: Valuation

) => {

  try {
    if (item.observacion_sistema) {

  const enviarAObservaciones =
    confirm(
      `Se detectó la siguiente observación:\n\n${item.observacion_sistema}\n\n¿Desea enviar la valorización a Observaciones?`
    );

  if (!enviarAObservaciones) {
    return;
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
          estado: "OBSERVADO",
        }),
      }
    );

  const data =
    await response.json();

  if (!data.success) {
    alert("No se pudo actualizar");
    return;
  }

  await cargarValorizaciones();

  alert(
    "Valorización enviada a Observaciones"
  );

  return;
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
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Clientes</SelectItem>
                <SelectItem value="Repsol">Repsol</SelectItem>
                <SelectItem value="TDP">TDP</SelectItem>
                <SelectItem value="Tralza">Tralza</SelectItem>
                <SelectItem value="BPO">BPO</SelectItem>
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
                        <SelectItem value="Repsol">Repsol</SelectItem>
                        <SelectItem value="TDP">TDP</SelectItem>
                        <SelectItem value="Tralza">Tralza</SelectItem>
                        <SelectItem value="BPO">BPO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Tipo de valorización</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="service">Servicio</SelectItem>
                        <SelectItem value="maintenance">Mantenimiento</SelectItem>
                        <SelectItem value="project">Proyecto</SelectItem>
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
                    <Label>Descripción / Nombre del Proyecto</Label>
                    <Textarea
                      placeholder="Introduzca la descripción o Nombre del Proyecto..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2 col-span-2">
                    <Label>Documento de respaldo</Label>
                    <label
                      htmlFor="archivo"
                      className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center hover:bg-muted/50"
                    >
                      <span className="text-sm font-medium">Subir archivos</span>
                      <span className="text-xs text-muted-foreground">
                        PDF, Excel, Word o imagen
                      </span>
                    </label>

                    <Input
                      id="archivo"
                      type="file"
                      className="hidden"
                      onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                    />

                    {(archivo || editingValuation?.archivo_nombre) && (
  <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
    <p className="mb-2 text-sm font-medium">
      Documentos adjuntos
    </p>

    <div className="flex items-center gap-3">
  <FileText className="h-5 w-5 text-blue-400" />

  <div>
    <p className="text-sm font-medium">
      {archivo?.name || editingValuation?.archivo_nombre}
    </p>

    <p className="text-xs text-muted-foreground">
      Documento de respaldo
    </p>
  </div>
</div>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">ID</th>
<th className="px-4 py-3 text-left font-medium">Cliente</th>
<th className="px-4 py-3 text-left font-medium">Nombre P.</th>
<th className="px-4 py-3 text-left font-medium">N° O/S</th>
<th className="px-4 py-3 text-left font-medium">Tipo</th>
<th className="px-4 py-3 text-left font-medium">Monto</th>
<th className="px-4 py-3 text-left font-medium">Estado</th>
<th className="px-4 py-3 text-left font-medium">Encargado</th>
<th className="px-4 py-3 text-left font-medium">Fecha Inicio</th>
<th className="px-4 py-3 text-left font-medium">Documentos</th>
<th className="px-4 py-3 text-left font-medium">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredValuations.map((item) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="px-4 py-4 font-medium">
                        VAL-2026-{String(item.id).padStart(3, "0")}
                      </td>
                      <td className="px-4 py-4">{item.client}</td>

<td className="px-4 py-4 max-w-[220px]">
  <p className="line-clamp-2 text-sm font-medium">
    {item.description || "Sin proyecto"}
  </p>
</td>

<td className="px-4 py-4">{item.orden_servicio}</td>
<td className="px-4 py-4">{item.type}</td>
                      <td className="px-4 py-4">
                        S/ {item.amount.toLocaleString("es-PE")}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-4">{item.encargado}</td>
                      <td className="px-4 py-4">{item.date}</td>
                      <td className="px-4 py-4">
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
      Sin adjunto
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
        onClick={() =>
          alert(
            `Valorización: VAL-2026-${String(item.id).padStart(3, "0")}\nCliente: ${item.client}\nMonto: S/ ${item.amount}\nServicio: ${item.description}`
          )
        }
      >
        Ver
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={() => editarValorizacion(item)}
      >
        Editar
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={() => enviarRevision(item)}
      >
        Enviar a revisión
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={() => descargarExcel(item)}
      >
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
    </div>
  )
}