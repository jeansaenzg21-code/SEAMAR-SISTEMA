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

type Status = "under_review" | "observed" | "approved"

type Approval = {
  id: string
  client: string
  description: string
  amount: string
  status: Status
  submittedBy: string
  submittedDate: string
  priority: "high" | "medium" | "low"
  respuesta_observacion?: string
archivo_respuesta_nombre?: string
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

    const approvalsData =
      data
        .filter(
          (v: any) =>
            v.estado ===
            "EN_REVISION"
        )
        .map((v: any) => ({

          id: v.id,

          client:
            v.proveedor,

          description:
            v.descripcion,

          amount:
            `S/ ${v.monto}`,

          status:
            "under_review",

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

      alert("No se pudo aprobar")

      return

    }

    alert("Valorización aprobada")

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

  const renderCard = (item: Approval) => (
    <Card key={item.id} className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold">{item.id}</h3>
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
            <Button size="icon" variant="outline" onClick={() => alert(`${item.id}\n${item.description}`)}>
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
                ¿Deseas aprobar la valorización {selectedApproval?.id}?
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
      </div>
    </div>
  )
}