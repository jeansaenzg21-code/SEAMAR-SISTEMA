"use client"

import { useState } from "react"
import { Plus, Filter, Download, Search, Pencil, Eye, Send } from "lucide-react"

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
  end_date: string
  cesionario: string
  archivo_nombre?: string
}

const initialValuations: Valuation[] = [
  {
    id: 1,
    client: "Repsol",
    orden_servicio: "OS-000112",
    type: "service",
    description: "Valorización por mantenimiento de equipos marítimos",
    amount: 125000,
    status: "under_review",
    date: "2024-03-15",
    end_date: "2024-03-30",
    cesionario: "María García",
    archivo_nombre: "reporte-servicio.pdf",
  },
  {
    id: 2,
    client: "TDP",
    orden_servicio: "OS-000113",
    type: "maintenance",
    description: "Evaluación de flota operativa",
    amount: 89500,
    status: "observed",
    date: "2024-03-14",
    end_date: "2024-03-28",
    cesionario: "Carlos Rodríguez",
  },
]

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
  const [valuations, setValuations] = useState<Valuation[]>(initialValuations)
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
  const [fechaFin, setFechaFin] = useState("")
  const [cesionario, setCesionario] = useState("")
  const [archivo, setArchivo] = useState<File | null>(null)

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
    setFechaFin("")
    setCesionario("")
    setArchivo(null)
  }

  const guardarValorizacion = () => {
    if (!client || !type || !description || !amount) {
      alert("Completa los campos principales")
      return
    }

    if (editingValuation) {
      setValuations((prev) =>
        prev.map((item) =>
          item.id === editingValuation.id
            ? {
                ...item,
                client,
                type,
                orden_servicio: ordenServicio,
                description,
                amount: Number(amount),
                date: fecha,
                end_date: fechaFin,
                cesionario,
                archivo_nombre: archivo?.name || item.archivo_nombre,
              }
            : item
        )
      )

      alert("Valorización actualizada correctamente")
    } else {
      const nuevaValorizacion: Valuation = {
        id: valuations.length + 1,
        client,
        type,
        orden_servicio: ordenServicio,
        description,
        amount: Number(amount),
        status: "draft",
        date: fecha,
        end_date: fechaFin,
        cesionario,
        archivo_nombre: archivo?.name,
      }

      setValuations([nuevaValorizacion, ...valuations])
      alert("Valorización creada correctamente")
    }

    limpiarFormulario()
    setIsNewModalOpen(false)
  }

  const editarValorizacion = (item: Valuation) => {
    setEditingValuation(item)
    setClient(item.client)
    setType(item.type)
    setOrdenServicio(item.orden_servicio)
    setDescription(item.description)
    setAmount(String(item.amount))
    setFecha(item.date)
    setFechaFin(item.end_date)
    setCesionario(item.cesionario)
    setArchivo(null)
    setIsNewModalOpen(true)
  }

  const enviarRevision = (item: Valuation) => {
    setValuations((prev) =>
      prev.map((v) =>
        v.id === item.id ? { ...v, status: "under_review" } : v
      )
    )

    alert("Valorización enviada a revisión")
  }

  const descargarExcel = (item: Valuation) => {
    const encabezados = [
      "ID Valorización",
      "Cliente",
      "N° Orden de Servicio",
      "Tipo",
      "Descripción",
      "Monto",
      "Estado",
      "Cesionario",
      "Fecha de Inicio",
      "Fecha de Fin",
    ]

    const datos = [
      `VAL-2026-${String(item.id).padStart(3, "0")}`,
      item.client,
      item.orden_servicio,
      item.type,
      item.description,
      `S/ ${item.amount.toLocaleString("es-PE")}`,
      item.status,
      item.cesionario,
      item.date,
      item.end_date,
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
    <div className="min-h-screen">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Valorizaciones</h1>
          <p className="text-muted-foreground">
            Gestión visual de valorizaciones asociadas a clientes, proyectos y órdenes de servicio.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar valorizaciones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
            </div>

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
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="border-border">
              <Download className="h-4 w-4 mr-2" />
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

                  <div className="grid gap-2">
                    <Label>Fecha de Fin</Label>
                    <Input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2 col-span-2">
                    <Label>Cesionario</Label>
                    <Input
                      placeholder="Ingrese cesionario"
                      value={cesionario}
                      onChange={(e) => setCesionario(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2 col-span-2">
                    <Label>Descripción</Label>
                    <Textarea
                      placeholder="Introduzca la descripción de la valorización..."
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
                      <span className="text-sm font-medium">Subir archivo</span>
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
                      <p className="text-xs text-muted-foreground">
                        Archivo: {archivo?.name || editingValuation?.archivo_nombre}
                      </p>
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
                    <th className="px-4 py-3 text-left font-medium">N° O/S</th>
                    <th className="px-4 py-3 text-left font-medium">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium">Monto</th>
                    <th className="px-4 py-3 text-left font-medium">Estado</th>
                    <th className="px-4 py-3 text-left font-medium">Cesionario</th>
                    <th className="px-4 py-3 text-left font-medium">Fecha Inicio</th>
                    <th className="px-4 py-3 text-left font-medium">Fecha Fin</th>
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
                      <td className="px-4 py-4">{item.orden_servicio}</td>
                      <td className="px-4 py-4">{item.type}</td>
                      <td className="px-4 py-4">
                        S/ {item.amount.toLocaleString("es-PE")}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-4">{item.cesionario}</td>
                      <td className="px-4 py-4">{item.date}</td>
                      <td className="px-4 py-4">{item.end_date || "-"}</td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() =>
                              alert(
                                `Valorización: VAL-2026-${String(item.id).padStart(3, "0")}\nCliente: ${item.client}\nMonto: S/ ${item.amount}\nServicio: ${item.description}`
                              )
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => editarValorizacion(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => enviarRevision(item)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => descargarExcel(item)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
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