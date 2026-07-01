"use client"

import { useEffect, useState } from "react"
import { Search, Check, X, Eye, Clock, AlertTriangle, CheckCircle2 } from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"
import { DocumentosPreview } from "@/components/DocumentosPreview"

type Status = "under_review" | "observed" | "approved"

type Approval = {
  id: string
  client: string
  codigo: string
  description: string
  amount: string
  status: Status
  submittedBy: string
  submittedDate: string
  priority: "high" | "medium" | "low"
  respuesta_observacion?: string
archivo_respuesta_nombre?: string
historial_observaciones?: any[]
documentos?: any[]

}

const initialApprovals: Approval[] = []

function StatusBadge({ status }: { status: Status }) {
  const labels = {
    under_review: "En revisión",
    observed: "Observado",
    approved: "Aprobado",
  }

  const styles = {
    under_review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    observed: "bg-red-500/10 text-red-400 border-red-500/20",
    approved: "bg-green-500/10 text-green-400 border-green-500/20",
  }

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

export function ApprovalsContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [approvals, setApprovals] = useState<Approval[]>([])
  useEffect(() => {

  async function cargarAprobaciones() {

    const response =
      await fetch(
        "/api/valorizaciones"
      );

    const data =
      await response.json();

    const approvalsData = data
        .map((v: any) => ({

          id: v.id,
          
          codigo: v.codigo,

          client:
            v.proveedor,

          description:
            v.descripcion,

          amount:
            `S/ ${v.monto}`,

          status:
  v.estado === "BORRADOR"
    ? "draft"
    : v.estado === "EN_REVISION"
    ? "under_review"
    : v.estado === "OBSERVADO"
    ? "observed"
    : v.estado === "APROBADO"
    ? "approved"
    : "draft",  

          submittedBy:
            v.encargado ??
            "-",

          submittedDate:
            v.fecha_revision,

          priority:
            "medium",

          respuesta_observacion:
            v.respuesta_observacion,

          archivo_respuesta_nombre:
            v.archivo_respuesta_nombre

            ,

historial_observaciones:
  typeof v.historial_observaciones === "string"
    ? JSON.parse(v.historial_observaciones)
    : v.historial_observaciones || [],

documentos:
  typeof v.documentos === "string"
    ? JSON.parse(v.documentos)
    : v.documentos || []

        }));

    setApprovals(
      approvalsData
    );

  }

  cargarAprobaciones();

}, []);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null)
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isObserveOpen, setIsObserveOpen] = useState(false)
  const [observation, setObservation] = useState("")


const [isViewOpen, setIsViewOpen] =
  useState(false)
  const filteredApprovals = approvals.filter((item) =>
    String(item.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pending = approvals.filter((item) => item.status === "under_review")
  const observed = approvals.filter((item) => item.status === "observed")
  const approved = approvals.filter((item) => item.status === "approved")

  const approveItem = async () => {

  if (!selectedApproval) return

  try {

    const response =
      await fetch(
        `/api/valorizaciones/${selectedApproval.id}/estado`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            estado: "APROBADO",
          }),
        }
      )

    const data =
      await response.json()

    if (!data.success) {

      alert("No se pudo aprobar.")

      return

    }

    alert("Valorización aprobada.")

    location.reload()

  } catch (error) {

    console.error(error)

    alert("Error al aprobar")

  }

}

  const observeItem = () => {
  if (!selectedApproval) return

  const data = localStorage.getItem("fincontrol_valuations")
  if (!data) return

  const valuations = JSON.parse(data)

    const updatedValuations = valuations.map((item: any) =>
      String(item.id) === String(selectedApproval.id)
        ? {
            ...item,
            status: "observed",
            observation_status: "pending",
            observacion: observation,
          }
        : item
    )

    localStorage.setItem(
      "fincontrol_valuations",
      JSON.stringify(updatedValuations)
    )

  setApprovals((prev) =>
    prev.filter((item) => String(item.id) !== String(selectedApproval.id))
  )

  setObservation("")
  setIsObserveOpen(false)
  setSelectedApproval(null)
}
const abrirDetalle = async (item: Approval) => {
  setSelectedApproval(item)
  setIsViewOpen(true)

  const response = await fetch(
    `/api/valorizaciones/${item.id}/detalle`
  )

  const data = await response.json()

  if (!data.success) return

  setSelectedApproval({
    ...item,
    historial_observaciones: data.observaciones || [],
    documentos: data.documentos || [],
  })
}
  const renderCard = (item: Approval) => (
    <Card key={item.id} className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3"> 
              <h3 className="font-semibold">
  {item.codigo}
</h3>
              <StatusBadge status={item.status} />
            </div>

            <p className="text-sm text-muted-foreground">{item.description}</p>

            <div className="grid gap-1 text-sm md:grid-cols-2">
              <p><span className="text-muted-foreground">Cliente:</span> {item.client}</p>
              <p><span className="text-muted-foreground">Monto:</span> {item.amount}</p>
              <p><span className="text-muted-foreground">Enviado por:</span> {item.submittedBy}</p>
              <p><span className="text-muted-foreground">Fecha:</span> {item.submittedDate}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
  size="icon"
  variant="outline"
  onClick={() => abrirDetalle(item)}
>
  <Eye className="h-4 w-4" />
</Button>

            {item.status === "under_review" && (
              <>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    setSelectedApproval(item)
                    setIsObserveOpen(true)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>

                <Button
                  size="icon"
                  onClick={() => {
                    setSelectedApproval(item)
                    setIsApproveOpen(true)
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Aprobaciones</h1>
          <p className="text-muted-foreground">
            Revisión visual de valorizaciones pendientes, observadas y aprobadas.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold">{pending.length}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-2xl font-bold">{observed.length}</p>
                <p className="text-sm text-muted-foreground">Observadas</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-2xl font-bold">{approved.length}</p>
                <p className="text-sm text-muted-foreground">Aprobadas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar aprobaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="observed">Observadas</TabsTrigger>
            <TabsTrigger value="approved">Aprobadas</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {filteredApprovals.filter((i) => i.status === "under_review").map(renderCard)}
          </TabsContent>

          <TabsContent value="observed" className="space-y-4 mt-4">
            {filteredApprovals.filter((i) => i.status === "observed").map(renderCard)}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4 mt-4">
            {filteredApprovals.filter((i) => i.status === "approved").map(renderCard)}
          </TabsContent>

          <TabsContent value="all" className="space-y-4 mt-4">
            {filteredApprovals.map(renderCard)}
          </TabsContent>
        </Tabs>

        <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aprobar valorización</DialogTitle>
              <DialogDescription>
                ¿Deseas aprobar la valorización VAL- VAL-{selectedApproval?.submittedDate
  ? new Date(selectedApproval.submittedDate).getFullYear()
  : new Date().getFullYear()}-{String(selectedApproval?.id || "").padStart(3, "0")}
              </DialogDescription>
       
            </DialogHeader>
            {selectedApproval?.respuesta_observacion && (
  <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
    <p className="text-sm font-medium text-green-400">
      Respuesta a observación
    </p>

    <p className="text-sm mt-1">
      {selectedApproval.respuesta_observacion}
    </p>

    {selectedApproval.archivo_respuesta_nombre && (
      <p className="text-xs text-muted-foreground mt-2">
        Documento adjunto: {selectedApproval.archivo_respuesta_nombre}
      </p>
    )}
  </div>
)}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApproveOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={approveItem}>Aprobar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isObserveOpen} onOpenChange={setIsObserveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Observar valorización</DialogTitle>
              <DialogDescription>
                Registra el motivo de observación para {selectedApproval?.id}.
              </DialogDescription>
            </DialogHeader>

            <Textarea
              placeholder="Escribe la observación..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
            />

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsObserveOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={observeItem}>Guardar observación</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
    <DialogHeader>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
  VAL-{selectedApproval?.submittedDate
    ? new Date(selectedApproval.submittedDate).getFullYear()
    : new Date().getFullYear()}-{String(selectedApproval?.id || "").padStart(3, "0")}
</p>

        <DialogTitle className="text-xl">
          {selectedApproval?.description || "Sin proyecto"}
        </DialogTitle>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{selectedApproval?.client}</span>
          <span>·</span>
          <span>{selectedApproval?.submittedDate}</span>
        </div>
      </div>
    </DialogHeader>

    <div className="grid grid-cols-3 gap-3 border-y py-6">
      <div className="rounded-lg border p-4 text-center">
        <p className="text-xs text-muted-foreground">MONTO</p>
        <p className="text-lg font-bold">
          {selectedApproval?.amount
  ? `S/ ${Number(String(selectedApproval.amount).replace("S/", "").trim()).toLocaleString("es-PE")}`
  : "Sin monto"}
        </p>
      </div>

      <div className="rounded-lg border p-4 text-center">
        <p className="text-xs text-muted-foreground">PRIORIDAD</p>
        <p className="text-lg font-bold">
          {selectedApproval?.priority || "—"}
        </p>
      </div>

      <div className="rounded-lg border p-4 text-center">
        <p className="text-xs text-muted-foreground">ENVIADO POR</p>
        <p className="text-lg font-bold">
          {selectedApproval?.submittedBy || "—"}
        </p>
      </div>
    </div>

    <div className="space-y-3">
      <p className="text-xs font-se mibold tracking-widest text-muted-foreground">
        <DocumentosPreview documentos={selectedApproval?.documentos} />
      </p>

      {selectedApproval?.documentos &&
selectedApproval.documentos.length > 0 ? (
  <div className="space-y-2">
    <DocumentosPreview documentos={selectedApproval.documentos} />
  </div>
) : (
  <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
    Sin documentos adjuntos
  </div>
)}
    </div>

    <div className="space-y-4 pt-4">
      <p className="text-xs font-semibold tracking-widest text-muted-foreground">
        LÍNEA DE APROBACIÓN
      </p>

      <div className="border-l pl-4 space-y-5">
        <div>
          <p className="font-semibold">Sistema · SEAMAR</p>
          <p className="text-sm text-muted-foreground">
            Valorización enviada a aprobación
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedApproval?.submittedDate || "—"}
          </p>
        </div>

        <div>
          <p className="font-semibold">
            {selectedApproval?.submittedBy || "Responsable"} · SEAMAR
          </p>
          <p className="text-sm text-muted-foreground">
            Revisión pendiente
          </p>
          <p className="text-xs text-muted-foreground">
            Estado: {selectedApproval?.status || "—"}
          </p>
        </div>

        <div>
          <p className="font-semibold">
            Aprobador · {selectedApproval?.client || "Cliente"}
          </p>
          <p className="text-sm text-muted-foreground">
            Pendiente de decisión final
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
  {selectedApproval?.historial_observaciones &&
  selectedApproval.historial_observaciones.length > 0 ? (
    <div className="space-y-3">
      {selectedApproval.historial_observaciones.map((obs: any) => (
        <div
          key={obs.id}
          className="rounded-md border border-border bg-background p-3"
        >
          <p className="text-sm font-medium">
            {obs.tipo === "SISTEMA"
              ? "Observación del sistema"
              : "Observación de usuario"}
          </p>

          <p className="text-sm mt-1">
            {obs.observacion}
          </p>

          <p className="text-xs text-muted-foreground mt-2">
            Estado: {obs.estado} · {obs.fecha}
          </p>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">
      No hay observaciones registradas.
    </p>
  )}

  {selectedApproval?.respuesta_observacion && (
    <div className="mt-3 rounded-md border border-green-500/20 bg-green-500/10 p-3">
      <p className="text-sm font-medium text-green-400">
        Respuesta a observación
      </p>

      <p className="text-sm mt-1">
        {selectedApproval.respuesta_observacion}
      </p>

      {selectedApproval.archivo_respuesta_nombre && (
        <p className="text-xs text-muted-foreground mt-2">
          Documento adjunto: {selectedApproval.archivo_respuesta_nombre}
        </p>
      )}
    </div>
  )}

  <div className="mt-4 flex gap-2">
    <Input
      placeholder="Responder observación..."
      value={observation}
      onChange={(e) => setObservation(e.target.value)}
    />

    <Button
      variant="outline"
      onClick={async () => {
        if (!selectedApproval) return

        await fetch(
          `/api/valorizaciones/${selectedApproval.id}/estado`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              estado: "OBSERVADO",
              observacion: observation,
            }),
          }
        )

        location.reload()
      }}
    >
      Enviar
    </Button>
  
        </div>
      </div>
    </div>

    <div className="sticky bottom-0 flex gap-3 border-t bg-background pt-4">
      <Button
  className="flex-1 bg-green-600 hover:bg-green-700"
  onClick={() => {
    setIsApproveOpen(true)
  }}
>
  Aprobar
</Button>

      <Button
  variant="outline"
  className="flex-1"
  onClick={async () => {
    if (!selectedApproval) return

    await fetch(
      `/api/valorizaciones/${selectedApproval.id}/estado`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          estado: "OBSERVADO",
          observacion:
            observation.trim() || "Corrección solicitada desde Aprobaciones",
        }),
      }
    )

    location.reload()
  }}
>
  Solicitar corrección
</Button>
    </div>
  </DialogContent>
</Dialog>
      </div>
    </div>
  )
}