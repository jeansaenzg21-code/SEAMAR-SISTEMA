"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Search,
  Filter,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Download,
  Eye,
  MoreHorizontal,
  Building2,
  Grid3X3,
  List,
  SortAsc,
} from "lucide-react"
import { cn } from "@/lib/utils"

const documents = [
  {
    id: "doc-001",
    name: "F001-2024-0847.pdf",
    type: "invoice",
    client: "Repsol",
    clientColor: "bg-orange-500",
    project: "Mantenimiento Plataforma Offshore",
    uploadedBy: "María García",
    uploadedAt: "2024-05-15T10:30:00",
    size: "2.4 MB",
    status: "processed",
  },
  {
    id: "doc-002",
    name: "OC-2024-1234.pdf",
    type: "purchase-order",
    client: "TDP",
    clientColor: "bg-blue-500",
    project: "Optimización de Combustible",
    uploadedBy: "Carlos Martínez",
    uploadedAt: "2024-05-15T09:15:00",
    size: "1.8 MB",
    status: "processed",
  },
  {
    id: "doc-003",
    name: "Reporte-Q4-Financiero.xlsx",
    type: "report",
    client: "Tralsa",
    clientColor: "bg-purple-500",
    project: "Sistema de Rastreo",
    uploadedBy: "Ana Rodríguez",
    uploadedAt: "2024-05-14T16:45:00",
    size: "4.2 MB",
    status: "processed",
  },
  {
    id: "doc-004",
    name: "enmienda-contrato-v2.pdf",
    type: "contract",
    client: "BPO",
    clientColor: "bg-emerald-500",
    project: "Modernización Portuaria",
    uploadedBy: "Roberto Vega",
    uploadedAt: "2024-05-14T14:20:00",
    size: "892 KB",
    status: "pending",
  },
  {
    id: "doc-005",
    name: "lote-facturas-047.xml",
    type: "xml",
    client: "Repsol",
    clientColor: "bg-orange-500",
    project: "Auditoría de Seguridad",
    uploadedBy: "Sistema IA",
    uploadedAt: "2024-05-14T11:00:00",
    size: "156 KB",
    status: "processing",
  },
  {
    id: "doc-006",
    name: "fotos-inspeccion-buque.zip",
    type: "archive",
    client: "TDP",
    clientColor: "bg-blue-500",
    project: "Optimización de Combustible",
    uploadedBy: "Juan Delgado",
    uploadedAt: "2024-05-13T17:30:00",
    size: "45.6 MB",
    status: "processed",
  },
  {
    id: "doc-007",
    name: "cronograma-mantenimiento-2024.xlsx",
    type: "spreadsheet",
    client: "Repsol",
    clientColor: "bg-orange-500",
    project: "Mantenimiento Plataforma Offshore",
    uploadedBy: "María García",
    uploadedAt: "2024-05-13T10:15:00",
    size: "1.2 MB",
    status: "processed",
  },
  {
    id: "doc-008",
    name: "diagrama-puerto-v3.png",
    type: "image",
    client: "BPO",
    clientColor: "bg-emerald-500",
    project: "Sistema de Gestión de Carga",
    uploadedBy: "Roberto Vega",
    uploadedAt: "2024-05-12T15:45:00",
    size: "3.4 MB",
    status: "processed",
  },
]

const typeIcons: Record<string, React.ElementType> = {
  invoice: FileText,
  "purchase-order": FileText,
  report: FileSpreadsheet,
  contract: FileText,
  xml: File,
  archive: File,
  spreadsheet: FileSpreadsheet,
  image: FileImage,
}

const statusConfig = {
  processed: { label: "Procesado", variant: "default" as const },
  processing: { label: "Procesando", variant: "secondary" as const },
  pending: { label: "Pendiente", variant: "outline" as const },
}

export function DocumentsContent() {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])

  const toggleSelect = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([])
    } else {
      setSelectedDocs(documents.map((d) => d.id))
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground">
            Explora, busca y gestiona todos los documentos de proyectos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedDocs.length > 0 && (
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Descargar ({selectedDocs.length})
            </Button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar documentos..."
              className="pl-9 bg-card border-border"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Tipo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Todos los Tipos</DropdownMenuItem>
              <DropdownMenuItem>Facturas</DropdownMenuItem>
              <DropdownMenuItem>Contratos</DropdownMenuItem>
              <DropdownMenuItem>Reportes</DropdownMenuItem>
              <DropdownMenuItem>Órdenes de Compra</DropdownMenuItem>
              <DropdownMenuItem>Archivos XML</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Building2 className="mr-2 h-4 w-4" />
                Cliente
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Todos los Clientes</DropdownMenuItem>
              <DropdownMenuItem>Repsol</DropdownMenuItem>
              <DropdownMenuItem>TDP</DropdownMenuItem>
              <DropdownMenuItem>BPO</DropdownMenuItem>
              <DropdownMenuItem>Tralsa</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <SortAsc className="mr-2 h-4 w-4" />
                Ordenar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Más Reciente</DropdownMenuItem>
              <DropdownMenuItem>Más Antiguo</DropdownMenuItem>
              <DropdownMenuItem>Nombre A-Z</DropdownMenuItem>
              <DropdownMenuItem>Nombre Z-A</DropdownMenuItem>
              <DropdownMenuItem>Tamaño</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-1 border border-border rounded-md p-1">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-md bg-primary/10 p-3">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documents.length}</p>
                <p className="text-sm text-muted-foreground">Documentos Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-md bg-success/10 p-3">
                <FileText className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documents.filter(d => d.status === "processed").length}</p>
                <p className="text-sm text-muted-foreground">Procesados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-md bg-warning/10 p-3">
                <FileText className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documents.filter(d => d.status === "pending" || d.status === "processing").length}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-md bg-primary/10 p-3">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documents.filter(d => d.type === "invoice").length}</p>
                <p className="text-sm text-muted-foreground">Facturas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      {viewMode === "list" ? (
        <Card className="bg-card border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedDocs.length === documents.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Subido Por</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tamaño</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                const Icon = typeIcons[doc.type] || FileText
                return (
                  <TableRow key={doc.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedDocs.includes(doc.id)}
                        onCheckedChange={() => toggleSelect(doc.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-muted p-2">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{doc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", doc.clientColor)} />
                        {doc.client}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {doc.project}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{doc.uploadedBy}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(doc.uploadedAt).toLocaleDateString("es-PE", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{doc.size}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[doc.status as keyof typeof statusConfig].variant}>
                        {statusConfig[doc.status as keyof typeof statusConfig].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Descargar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {documents.map((doc) => {
            const Icon = typeIcons[doc.type] || FileText
            return (
              <Card key={doc.id} className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="rounded-lg bg-muted p-4 mb-4">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <p className="font-medium text-sm truncate w-full">{doc.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{doc.size}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <div className={cn("h-2 w-2 rounded-full", doc.clientColor)} />
                      <span className="text-xs text-muted-foreground">{doc.client}</span>
                    </div>
                    <Badge className="mt-3" variant={statusConfig[doc.status as keyof typeof statusConfig].variant}>
                      {statusConfig[doc.status as keyof typeof statusConfig].label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
