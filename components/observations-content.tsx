"use client"

import { useEffect, useState } from "react"
import { Search, MessageSquare, Check, AlertTriangle, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type ObservationStatus = "pending" | "in_progress" | "resolved"



const statusStyles = {
  pending: {
    label: "Pendiente",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: AlertTriangle,
  },
  in_progress: {
    label: "En progreso",
    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    icon: Clock,
  },
  resolved: {
    label: "Resuelto",
    className: "bg-green-500/10 text-green-400 border-green-500/20",
    icon: Check,
  },
}

export function ObservationsContent() {
  const [observations, setObservations] = useState<any[]>([])
useEffect(() => {

  cargarObservaciones()

}, [])

const cargarObservaciones =
  async () => {

    try {

      const response =
        await fetch(
          "/api/valorizaciones"
        )

      const data =
        await response.json()

      const observedData =
        data
          .filter(
            (v: any) =>
              v.estado ===
              "OBSERVADO"
          )
          .map(
            (v: any) => ({

              id:
                `OBS-${v.id}`,

              valuation:
                v.id,

              client:
                v.proveedor,

              observation:
  v.observacion_sistema && v.observacion_sistema.trim() !== ""
    ? v.observacion_sistema
    : "Orden de servicio no encontrada",

              createdBy:
                "Sistema",

              createdDate:
                v.fecha_observacion
                  ?.split("T")[0]
                || "",

              status:
  (v.observation_status || "pending") as ObservationStatus,

              assignedTo:
                v.encargado || "-",

              response:
                v.respuesta_observacion

            })
          )

      setObservations(
        observedData
      )

    } catch (error) {

      console.error(error)

    }

}

  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [selectedObservation, setSelectedObservation] =
    useState<(typeof observations)[0] | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [response, setResponse] = useState("")

  const filteredObservations = observations.filter((o) => {
    if (activeTab !== "all" && o.status !== activeTab) return false
    if (
      searchQuery &&
      !o.observation.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !o.valuation.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !o.client.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }

    return true
  })

  const pendingCount = observations.filter((o) => o.status === "pending").length
  const inProgressCount = observations.filter((o) => o.status === "in_progress").length
  const resolvedCount = observations.filter((o) => o.status === "resolved").length

  return (
    <div className="min-h-screen">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Observaciones</h1>
          <p className="text-muted-foreground">
            Seguimiento visual de observaciones generadas durante la revisión de valorizaciones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressCount}</p>
                <p className="text-sm text-muted-foreground">En progreso</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Check className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resolvedCount}</p>
                <p className="text-sm text-muted-foreground">Resueltas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar observaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-secondary">
            <TabsTrigger value="all">Todas ({observations.length})</TabsTrigger>
            <TabsTrigger value="pending">Pendientes ({pendingCount})</TabsTrigger>
            <TabsTrigger value="in_progress">En progreso ({inProgressCount})</TabsTrigger>
            <TabsTrigger value="resolved">Resueltas ({resolvedCount})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredObservations.map((observation) => {
              const statusConfig = statusStyles[observation.status as ObservationStatus]
              const StatusIcon = statusConfig.icon

              return (
                <Card key={observation.id} className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{observation.id}</h3>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-primary">{observation.valuation}</span>

                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusConfig.className}`}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </span>
                          </div>

                          <span className="text-sm text-muted-foreground">
                            {observation.client}
                          </span>
                        </div>

                        <div className="bg-secondary/50 rounded-lg p-4 mb-4">
                          <div className="flex items-start gap-3">
                            <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm">{observation.observation}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Creado por {observation.createdBy} el {observation.createdDate}
                              </p>
                            </div>
                          </div>
                        </div>

                        {observation.response && (
                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                            <p className="text-sm font-medium text-primary mb-1">
                              Respuesta
                            </p>
                            <p className="text-sm">{observation.response}</p>

                            {observation.resolvedDate && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Resuelto el {observation.resolvedDate}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            Asignado a:{" "}
                            <span className="font-medium text-foreground">
                              {observation.assignedTo}
                            </span>
                          </p>

                          <Button
                            variant="outline" 
                            size="sm"
                           onClick={async () => {
  if (observation.status === "pending") {
    await fetch(
  `/api/valorizaciones/${observation.valuation}/estado`,
  {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      observation_status: "in_progress",
    }),
  }
)
    setObservations((prev) =>
      prev.map((o) =>
        o.id === observation.id
          ? { ...o, status: "in_progress" }
          : o
      )
    )
  }

  setSelectedObservation(observation)
  setIsDetailModalOpen(true)
}}
                          >
                            {observation.status === "resolved"
                              ? "Ver detalles"
                              : "Responder"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </TabsContent>
        </Tabs>

        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {selectedObservation?.status === "resolved"
                  ? "Detalle de observación"
                  : "Responder observación"}
              </DialogTitle>
              <DialogDescription>
                {selectedObservation?.id} • {selectedObservation?.valuation}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-1">Observación original</p>
                <p className="text-sm text-muted-foreground">
                  {selectedObservation?.observation}
                </p>
              </div>

              {selectedObservation?.status !== "resolved" ? (
                <div>
                  <Label htmlFor="response">Tu respuesta</Label>
                  <Textarea
  placeholder="Ingrese la respuesta a esta observación..."
  value={response}
  onChange={(e) => setResponse(e.target.value)}
/>
                  <div className="space-y-2 mt-3">
  <Label htmlFor="observation-file">Adjuntar documento</Label>

  <Input
    id="observation-file"
    type="file"
    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
    onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
  />

  {attachedFile && (
    <p className="text-xs text-muted-foreground">
      Archivo seleccionado: {attachedFile.name}
    </p>
  )}
</div>
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-400 mb-1">
                    Resolución
                  </p>
                  <p className="text-sm">{selectedObservation?.response}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                {selectedObservation?.status === "resolved" ? "Cerrar" : "Cancelar"}
              </Button>

              {selectedObservation?.status !== "resolved" && (
                <>
                  <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                    Guardar borrador
                  </Button>
                  <Button onClick={() => {
  if (!selectedObservation) return

  const data = localStorage.getItem("fincontrol_valuations")
  if (!data) return

  const valuations = JSON.parse(data)

  const updatedValuations = valuations.map((item: any) =>
    String(item.id) === String(selectedObservation.valuation)
      ? {
    ...item,
    status: "resolved",
    respuesta_observacion: response,
    archivo_respuesta_nombre: attachedFile?.name || "",
  }
      : item
  )

  localStorage.setItem(
    "fincontrol_valuations",
    JSON.stringify(updatedValuations)
  )

  setObservations((prev) =>
    prev.filter((item) => String(item.valuation) !== String(selectedObservation.valuation))
  )

  setIsDetailModalOpen(false)
  setResponse("")
setAttachedFile(null)
}}>
 
  Marcar como resuelto
</Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}