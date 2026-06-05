"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, Filter, Download, Search } from "lucide-react"
type Status = "draft" | "under_review" | "observed" | "approved" | "invoiced"

function StatusBadge({ status }: { status: Status }) {
  return <span>{status}</span>
}
const valuations = [
  { id: "VAL-2024-089", client: "Repsol", type: "Marine Equipment", description: "Marine Equipment Valuation Q1", amount: "€125,000", status: "under_review" as Status, date: "2024-03-15", assignee: "Maria Garcia" },
  { id: "VAL-2024-088", client: "TDP", type: "Fleet Assessment", description: "Fleet Assessment Report", amount: "€89,500", status: "observed" as Status, date: "2024-03-14", assignee: "Carlos Rodriguez" },
  { id: "VAL-2024-087", client: "Tralza", type: "Offshore Platform", description: "Offshore Platform Inspection", amount: "€210,000", status: "approved" as Status, date: "2024-03-13", assignee: "Ana Lopez" },
  { id: "VAL-2024-086", client: "BPO", type: "Vessel Survey", description: "Vessel Condition Survey", amount: "€45,750", status: "invoiced" as Status, date: "2024-03-12", assignee: "Maria Garcia" },
  { id: "VAL-2024-085", client: "Repsol", type: "Equipment Review", description: "Equipment Maintenance Review", amount: "€67,200", status: "draft" as Status, date: "2024-03-11", assignee: "Juan Martinez" },
  { id: "VAL-2024-084", client: "TDP", type: "Marine Equipment", description: "Tugboat Fleet Valuation", amount: "€156,800", status: "approved" as Status, date: "2024-03-10", assignee: "Carlos Rodriguez" },
  { id: "VAL-2024-083", client: "Tralza", type: "Vessel Survey", description: "Cargo Ship Inspection", amount: "€98,500", status: "invoiced" as Status, date: "2024-03-09", assignee: "Ana Lopez" },
  { id: "VAL-2024-082", client: "BPO", type: "Offshore Platform", description: "Drilling Platform Assessment", amount: "€320,000", status: "under_review" as Status, date: "2024-03-08", assignee: "Juan Martinez" },
]

const columns = [
  { key: "id", header: "ID Valorización" },
  { key: "client", header: "Cliente" },
  { key: "type", header: "Tipo" },
  { key: "amount", header: "Monto" },
  {
    key: "status",
    header: "Estado",
    render: (item: typeof valuations[0]) => <StatusBadge status={item.status} />
  },
  { key: "assignee", header: "Responsable" },
{ key: "date", header: "Fecha" },
]

export function ValuationsContent() {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)

  const filteredValuations = valuations.filter(v => {
    if (statusFilter !== "all" && v.status !== statusFilter) return false
    if (clientFilter !== "all" && v.client !== clientFilter) return false
    if (searchQuery && !v.id.toLowerCase().includes(searchQuery.toLowerCase()) && !v.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="min-h-screen">
      <div>
  <h1 className="text-3xl font-bold">Valorizaciones</h1>
  <p className="text-muted-foreground">
    Seguimiento económico de valorizaciones por proyecto
  </p>
</div>
  
      
      <div className="p-6 space-y-6">
        {/* Actions Bar */}
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
              <SelectTrigger className="w-40 bg-secondary border-border">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
<SelectItem value="draft">Borrador</SelectItem>
<SelectItem value="under_review">En revisión</SelectItem>
<SelectItem value="observed">Observado</SelectItem>
<SelectItem value="approved">Aprobado</SelectItem>
<SelectItem value="invoiced">Facturado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-40 bg-secondary border-border">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
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
                <Button className="bg-primary text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Valorización
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Valuation</DialogTitle>
                  <DialogDescription>
                    Fill in the details to create a new valuation record.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="client">Client</Label>
                    <Select>
                      <SelectTrigger id="client">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="repsol">Repsol</SelectItem>
                        <SelectItem value="tdp">TDP</SelectItem>
                        <SelectItem value="tralza">Tralza</SelectItem>
                        <SelectItem value="bpo">BPO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Valuation Type</Label>
                    <Select>
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
  <SelectItem value="marine">Marine Equipment</SelectItem>
  <SelectItem value="fleet">Fleet Assessment</SelectItem>
  <SelectItem value="offshore">Offshore Platform</SelectItem>
  <SelectItem value="vessel">Vessel Survey</SelectItem>
</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Enter valuation description..." />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Estimated Amount (€)</Label>
                    <Input id="amount" type="number" placeholder="0.00" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsNewModalOpen(false)}>
                    Create Valuation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Valuations Table */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
  <table className="w-full text-sm">
    <thead className="border-b bg-secondary">
      <tr>
        {columns.map((column) => (
          <th key={column.key} className="px-4 py-3 text-left font-medium text-muted-foreground">
            {column.header}
          </th>
        ))}
      </tr>
    </thead>

    <tbody>
      {filteredValuations.map((item) => (
        <tr key={item.id} className="border-b border-border">
          {columns.map((column) => (
            <td key={column.key} className="px-4 py-4">
              {column.render
                ? column.render(item)
                : item[column.key as keyof typeof item]}
            </td>
          ))}
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
