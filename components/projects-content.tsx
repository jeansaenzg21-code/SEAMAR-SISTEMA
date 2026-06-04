"use client"

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
  Search,
  Plus,
  Filter,
  FolderKanban,
  FileText,
  DollarSign,
  Calendar,
  Users,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const projects = [
  {
    id: "proj-001",
    name: "Mantenimiento Plataforma Offshore",
    client: "Repsol",
    clientColor: "bg-orange-500",
    status: "active",
    progress: 75,
    documents: 124,
    budget: 450000,
    spent: 337500,
    dueDate: "2024-06-30",
    team: 8,
    description: "Mantenimiento anual e inspección de plataformas de perforación offshore",
  },
  {
    id: "proj-002",
    name: "Optimización de Combustible",
    client: "TDP",
    clientColor: "bg-blue-500",
    status: "active",
    progress: 45,
    documents: 67,
    budget: 280000,
    spent: 126000,
    dueDate: "2024-08-15",
    team: 5,
    description: "Implementación de sistemas de monitoreo de eficiencia de combustible",
  },
  {
    id: "proj-003",
    name: "Modernización Portuaria",
    client: "BPO",
    clientColor: "bg-emerald-500",
    status: "on-hold",
    progress: 30,
    documents: 89,
    budget: 520000,
    spent: 156000,
    dueDate: "2024-09-30",
    team: 12,
    description: "Modernización de infraestructura de manejo de carga portuaria",
  },
  {
    id: "proj-004",
    name: "Sistema de Rastreo de Embarcaciones",
    client: "Tralsa",
    clientColor: "bg-purple-500",
    status: "completed",
    progress: 100,
    documents: 156,
    budget: 180000,
    spent: 172000,
    dueDate: "2024-03-15",
    team: 4,
    description: "Implementación de sistema de rastreo GPS en tiempo real",
  },
  {
    id: "proj-005",
    name: "Auditoría de Seguridad",
    client: "Repsol",
    clientColor: "bg-orange-500",
    status: "active",
    progress: 60,
    documents: 234,
    budget: 95000,
    spent: 57000,
    dueDate: "2024-07-20",
    team: 6,
    description: "Auditoría integral de seguridad y documentación de cumplimiento",
  },
  {
    id: "proj-006",
    name: "Sistema de Gestión de Carga",
    client: "BPO",
    clientColor: "bg-emerald-500",
    status: "active",
    progress: 20,
    documents: 45,
    budget: 340000,
    spent: 68000,
    dueDate: "2024-11-30",
    team: 9,
    description: "Desarrollo de plataforma digital de rastreo y gestión de carga",
  },
]

const statusConfig = {
  active: { label: "Activo", variant: "default" as const },
  "on-hold": { label: "Pausado", variant: "secondary" as const },
  completed: { label: "Completado", variant: "outline" as const },
}

export function ProjectsContent() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proyectos</h1>
          <p className="text-muted-foreground">
            Gestiona y rastrea todos los proyectos de clientes y sus documentos
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Proyecto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar proyectos..."
            className="pl-9 bg-card border-border"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtrar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Todos los Proyectos</DropdownMenuItem>
            <DropdownMenuItem>Activos</DropdownMenuItem>
            <DropdownMenuItem>Pausados</DropdownMenuItem>
            <DropdownMenuItem>Completados</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Cliente: Todos
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Todos los Clientes</DropdownMenuItem>
            <DropdownMenuItem>Repsol</DropdownMenuItem>
            <DropdownMenuItem>TDP</DropdownMenuItem>
            <DropdownMenuItem>BPO</DropdownMenuItem>
            <DropdownMenuItem>Tralsa</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-md bg-primary/10 p-3">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects.length}</p>
                <p className="text-sm text-muted-foreground">Proyectos Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-md bg-success/10 p-3">
                <FolderKanban className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects.filter(p => p.status === "active").length}</p>
                <p className="text-sm text-muted-foreground">Proyectos Activos</p>
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
                <p className="text-2xl font-bold">S/ {(projects.reduce((acc, p) => acc + p.budget, 0) / 1000000).toFixed(1)}M</p>
                <p className="text-sm text-muted-foreground">Presupuesto Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-md bg-primary/10 p-3">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects.reduce((acc, p) => acc + p.documents, 0)}</p>
                <p className="text-sm text-muted-foreground">Documentos Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", project.clientColor)} />
                    <span className="text-xs text-muted-foreground">{project.client}</span>
                  </div>
                  <Badge variant={statusConfig[project.status as keyof typeof statusConfig].variant}>
                    {statusConfig[project.status as keyof typeof statusConfig].label}
                  </Badge>
                </div>
                <CardTitle className="text-base mt-2">{project.name}</CardTitle>
                <CardDescription className="line-clamp-2">{project.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{project.documents} docs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{project.team} miembros</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">S/ {(project.spent / 1000).toFixed(0)}k gastado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{new Date(project.dueDate).toLocaleDateString("es-PE", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>

                {/* View Button */}
                <div className="flex items-center justify-end pt-2">
                  <span className="text-sm text-primary flex items-center gap-1">
                    Ver detalles
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
