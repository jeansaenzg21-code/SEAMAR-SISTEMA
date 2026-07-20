"use client"

import { useCallback, useEffect, useState } from "react"
import { Search, MessageSquare, Check, AlertTriangle, Clock, FileText } from "lucide-react"

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
import { DocumentosPreview } from "@/components/DocumentosPreview"
import { ObservationHistory } from "@/components/observation-history"
import { formatCurrency } from "@/lib/utils"

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

const detailStatusMap: Record<string, { label: string; className: string }> = {
  BORRADOR: { label: "Borrador", className: "bg-gray-500/10 text-gray-400" },
  EN_REVISION: { label: "En revisión", className: "bg-blue-500/10 text-blue-400" },
  OBSERVADO: { label: "Observado", className: "bg-red-500/10 text-red-400" },
  APROBADO: { label: "Aprobado", className: "bg-green-500/10 text-green-400" },
}

function ValuacionDetailBadge({ status }: { status: string }) {
  const config = detailStatusMap[status] || detailStatusMap.BORRADOR
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

export function ObservationsContent() {
  const [observations, setObservations] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [selectedObservation, setSelectedObservation] = useState<any | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [response, setResponse] = useState("")
  const [saving, setSaving] = useState(false)
  const [valuationDetail, setValuationDetail] = useState<{
    documentos: any[]
    observaciones: any[]
  } | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const cargarObservaciones = useCallback(async () => {
    try {
      const response = await fetch("/api/valorizaciones")
      const data = await response.json()

      const observedData = data
        .filter((v: any) => v.estado === "OBSERVADO")
        .map((v: any) => ({
          id: v.codigo,
          valuationId: v.id,
          client: v.proveedor,
          proyecto_nombre: v.proyecto_nombre || "",
          proyecto_tipo: v.proyecto_tipo || "",
          negocio_operacion: v.negocio_operacion || "",
          numero_orden_servicio: v.numero_orden_servicio || "",
          descripcion: v.descripcion || "",
          monto: Number(v.monto || 0),
          moneda: v.moneda || "PEN",
          fecha_ejecucion: v.fecha_ejecucion?.split("T")[0] || "",
          encargado: v.encargado || "",
          codigo: v.codigo,
          estado: v.estado,
          observation:
            v.observacion_sistema && v.observacion_sistema.trim() !== ""
              ? v.observacion_sistema
              : "Orden de servicio no encontrada",
          createdBy: "Sistema",
          createdDate: v.fecha_observacion?.split("T")[0] || "",
          status:
            v.estado_observacion === "EN_PROGRESO"
              ? "in_progress"
              : v.estado_observacion === "RESUELTA"
              ? "resolved"
              : "pending",
          assignedTo: v.encargado || "-",
          response: v.respuesta_observacion,
          documentos_respuesta: v.documentos_respuesta || [],
        }))

      setObservations(observedData)
    } catch (error) {
      console.error(error)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    cargarObservaciones().then(() => { if (cancelled) return })
    return () => { cancelled = true }
  }, [cargarObservaciones])

  useEffect(() => {
    if (isDetailModalOpen && selectedObservation?.valuationId) {
      setValuationDetail(null)
      setLoadingDetail(true)
      fetch(`/api/valorizaciones/${selectedObservation.valuationId}/detalle?activas=true`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setValuationDetail({
              documentos: data.documentos || [],
              observaciones: data.observaciones || [],
            })
          }
        })
        .catch(console.error)
        .finally(() => setLoadingDetail(false))
    }
  }, [isDetailModalOpen, selectedObservation?.valuationId])

  const filteredObservations = observations.filter((o) => {
    if (activeTab !== "all" && o.status !== activeTab) return false
    if (
      searchQuery &&
      !o.observation.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !o.client.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !o.id?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }
    return true
  })

  const pendingCount = observations.filter((o) => o.status === "pending").length
  const inProgressCount = observations.filter((o) => o.status === "in_progress").length
  const resolvedCount = observations.filter((o) => o.status === "resolved").length

  async function subirDocumentos(
    files: File[],
    valuationId: string
  ): Promise<void> {
    for (const file of files) {
      const form = new FormData()
      form.append("file", file)
      form.append("valorizacionId", valuationId)
      try {
        const upload = await fetch("/api/observaciones/documento", { method: "POST", body: form })
        if (upload.ok) {
          const result = await upload.json()
          setValuationDetail((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              documentos: [...prev.documentos, { id: result.id, nombre: result.nombre, url: result.url }],
            }
          })
        }
      } catch (error) {
        console.error("Error subiendo archivo:", error)
      }
    }
    setAttachedFiles([])
  }

  async function handleGuardarBorrador() {
    if (!selectedObservation) return
    setSaving(true)
    try {
      if (attachedFiles.length > 0) {
        await subirDocumentos(attachedFiles, String(selectedObservation.valuationId))
      }
      const patchRes = await fetch(
        `/api/valorizaciones/${selectedObservation.valuationId}/estado`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            observation_status: "save_draft",
            response: response,
          }),
        }
      )
      if (!patchRes.ok) {
        console.error("[DEBUG] PATCH save_draft falló:", patchRes.status, await patchRes.text())
        throw new Error(`Error al guardar borrador: ${patchRes.status}`)
      }
      setObservations((prev) =>
        prev.map((item) =>
          item.id === selectedObservation.id
            ? { ...item, response: response }
            : item
        )
      )
      setResponse("")
      setIsDetailModalOpen(false)
      await cargarObservaciones()
    } catch (error) {
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  async function handleMarcarResuelto() {
    if (!selectedObservation) return
    setSaving(true)
    try {
      if (attachedFiles.length > 0) {
        await subirDocumentos(attachedFiles, String(selectedObservation.valuationId))
      }
      const patchRes = await fetch(
        `/api/valorizaciones/${selectedObservation.valuationId}/estado`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            observation_status: "resolved",
            response: response,
          }),
        }
      )
      if (!patchRes.ok) {
        console.error("[DEBUG] PATCH estado falló:", patchRes.status, await patchRes.text())
        throw new Error(`Error al marcar como resuelto: ${patchRes.status}`)
      }
      setObservations((prev) =>
        prev.map((item) =>
          item.id === selectedObservation.id
            ? { ...item, status: "resolved", response: response }
            : item
        )
      )
      setResponse("")
      setIsDetailModalOpen(false)
      await cargarObservaciones()
    } catch (error) {
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

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
          <TabsList className="bg-secondary flex-wrap">
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

                            <DocumentosPreview documentos={observation.documentos_respuesta} />

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
  `/api/valorizaciones/${observation.valuationId}/estado`,
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

  setSelectedObservation({
  ...observation,
  status: "in_progress",
})
  setResponse(observation.response || "")
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
          <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedObservation?.status === "resolved"
                  ? "Detalle de observación"
                  : "Responder observación"}
              </DialogTitle>
              <DialogDescription>
                {selectedObservation?.codigo || selectedObservation?.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Valuation info */}
              {selectedObservation && (
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-xs font-semibold tracking-widest text-muted-foreground">
                    INFORMACIÓN DE LA VALORIZACIÓN
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Código</span>
                      <p className="font-medium">{selectedObservation.codigo || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Cliente</span>
                      <p className="font-medium">{selectedObservation.client || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Proyecto</span>
                      <p className="font-medium">{selectedObservation.proyecto_nombre || selectedObservation.descripcion || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Orden de servicio</span>
                      <p className="font-medium">{selectedObservation.numero_orden_servicio || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Tipo / Negocio</span>
                      <p className="font-medium">{selectedObservation.negocio_operacion || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Estado</span>
                      <div className="mt-0.5">
                        <ValuacionDetailBadge status={selectedObservation.estado || "BORRADOR"} />
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Responsable</span>
                      <p className="font-medium">{selectedObservation.encargado || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Fecha</span>
                      <p className="font-medium">{selectedObservation.fecha_ejecucion || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Monto</span>
                      <p className="font-medium">
                        {formatCurrency(selectedObservation.monto, selectedObservation.moneda)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents */}
              {!loadingDetail && valuationDetail && valuationDetail.documentos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold tracking-widest text-muted-foreground">
                    DOCUMENTOS DE LA VALORIZACIÓN
                  </p>
                  <DocumentosPreview documentos={valuationDetail.documentos} />
                </div>
              )}
              {loadingDetail && (
                <p className="text-sm text-muted-foreground">Cargando documentos...</p>
              )}

              <ObservationHistory
                observaciones={valuationDetail?.observaciones || []}
                variant="timeline"
              />

              {/* Original observation */}
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-1">Observación original</p>
                <p className="text-sm text-muted-foreground">
                  {selectedObservation?.observation}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedObservation?.createdBy} · {selectedObservation?.createdDate}
                </p>
              </div>

              {selectedObservation?.status !== "resolved" ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="response">Tu respuesta</Label>
                    <Textarea
                      placeholder="Ingrese la respuesta a esta observación..."
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observation-file">Adjuntar documentos</Label>
                    <Input
                      id="observation-file"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      onChange={(e) =>
                        setAttachedFiles(Array.from(e.target.files || []))
                      }
                    />
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        {file.name}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-400 mb-1">Resolución</p>
                  <p className="text-sm">{selectedObservation?.response}</p>
                  {valuationDetail && valuationDetail.documentos.length > 0 && (
                    <div className="mt-3">
                      <DocumentosPreview documentos={valuationDetail.documentos} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                {selectedObservation?.status === "resolved" ? "Cerrar" : "Cancelar"}
              </Button>

              {selectedObservation?.status !== "resolved" && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleGuardarBorrador}
                    disabled={saving || (!response.trim() && attachedFiles.length === 0)}
                  >
                    {saving ? "Guardando..." : "Guardar borrador"}
                  </Button>
                  <Button
                    onClick={handleMarcarResuelto}
                    disabled={saving || !response.trim()}
                  >
                    {saving ? "Guardando..." : "Marcar como resuelto"}
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
