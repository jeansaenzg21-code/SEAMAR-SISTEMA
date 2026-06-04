"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  FolderKanban,
  FileText,
  Activity,
  Globe,
  Target,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts"

// Data for clients
const clientsData = [
  { 
    id: "repsol", 
    name: "Repsol", 
    color: "bg-orange-500",
    chartColor: "#f97316",
    ingresos: 2450000,
    gastos: 1862000,
    utilidad: 588000,
    documentos: 1247,
    proyectosActivos: 8,
    tendencia: 8.5,
  },
  { 
    id: "tdp", 
    name: "TDP", 
    color: "bg-blue-500",
    chartColor: "#3b82f6",
    ingresos: 1370000,
    gastos: 1041200,
    utilidad: 328800,
    documentos: 634,
    proyectosActivos: 5,
    tendencia: 12.3,
  },
  { 
    id: "bpo", 
    name: "BPO", 
    color: "bg-emerald-500",
    chartColor: "#10b981",
    ingresos: 1097000,
    gastos: 911510,
    utilidad: 185490,
    documentos: 897,
    proyectosActivos: 6,
    tendencia: -2.1,
  },
  { 
    id: "tralsa", 
    name: "Tralsa", 
    color: "bg-purple-500",
    chartColor: "#a855f7",
    ingresos: 770000,
    gastos: 616000,
    utilidad: 154000,
    documentos: 312,
    proyectosActivos: 3,
    tendencia: 5.8,
  },
]

// Projects data
const projectsData = [
  {
    id: "proj-001",
    name: "Mantenimiento Plataforma Offshore",
    client: "repsol",
    clientColor: "bg-orange-500",
    presupuesto: 450000,
    gastado: 337500,
    comprometido: 45000,
    ingresos: 520000,
    utilidad: 137500,
    varianza: -15.0,
    estado: "en-curso",
    documentos: 124,
    gastosOperativos: [
      { categoria: "Mano de obra", monto: 145000 },
      { categoria: "Equipos", monto: 98000 },
      { categoria: "Materiales", monto: 54500 },
      { categoria: "Subcontratistas", monto: 40000 },
    ],
  },
  {
    id: "proj-002",
    name: "Optimización de Combustible",
    client: "tdp",
    clientColor: "bg-blue-500",
    presupuesto: 280000,
    gastado: 126000,
    comprometido: 28000,
    ingresos: 310000,
    utilidad: 156000,
    varianza: -45.0,
    estado: "en-curso",
    documentos: 67,
    gastosOperativos: [
      { categoria: "Mano de obra", monto: 52000 },
      { categoria: "Equipos", monto: 38000 },
      { categoria: "Materiales", monto: 24000 },
      { categoria: "Consultoría", monto: 12000 },
    ],
  },
  {
    id: "proj-003",
    name: "Modernización Portuaria",
    client: "bpo",
    clientColor: "bg-emerald-500",
    presupuesto: 520000,
    gastado: 156000,
    comprometido: 65000,
    ingresos: 580000,
    utilidad: 359000,
    varianza: -57.5,
    estado: "pausado",
    documentos: 89,
    gastosOperativos: [
      { categoria: "Mano de obra", monto: 68000 },
      { categoria: "Equipos", monto: 45000 },
      { categoria: "Materiales", monto: 28000 },
      { categoria: "Permisos", monto: 15000 },
    ],
  },
  {
    id: "proj-004",
    name: "Sistema de Rastreo",
    client: "tralsa",
    clientColor: "bg-purple-500",
    presupuesto: 180000,
    gastado: 172000,
    comprometido: 0,
    ingresos: 195000,
    utilidad: 23000,
    varianza: -4.4,
    estado: "completado",
    documentos: 156,
    gastosOperativos: [
      { categoria: "Desarrollo", monto: 85000 },
      { categoria: "Hardware", monto: 52000 },
      { categoria: "Instalación", monto: 25000 },
      { categoria: "Capacitación", monto: 10000 },
    ],
  },
  {
    id: "proj-005",
    name: "Auditoría de Seguridad",
    client: "repsol",
    clientColor: "bg-orange-500",
    presupuesto: 95000,
    gastado: 57000,
    comprometido: 12000,
    ingresos: 110000,
    utilidad: 41000,
    varianza: -27.4,
    estado: "en-curso",
    documentos: 234,
    gastosOperativos: [
      { categoria: "Personal", monto: 32000 },
      { categoria: "Certificaciones", monto: 15000 },
      { categoria: "Documentación", monto: 8000 },
      { categoria: "Viáticos", monto: 2000 },
    ],
  },
  {
    id: "proj-006",
    name: "Gestión de Carga",
    client: "bpo",
    clientColor: "bg-emerald-500",
    presupuesto: 340000,
    gastado: 68000,
    comprometido: 45000,
    ingresos: 380000,
    utilidad: 267000,
    varianza: -66.8,
    estado: "en-curso",
    documentos: 45,
    gastosOperativos: [
      { categoria: "Software", monto: 28000 },
      { categoria: "Integración", monto: 22000 },
      { categoria: "Capacitación", monto: 12000 },
      { categoria: "Soporte", monto: 6000 },
    ],
  },
]

const monthlyTrend = [
  { mes: "Ene", ingresos: 688000, gastos: 512000, utilidad: 176000 },
  { mes: "Feb", ingresos: 755000, gastos: 567000, utilidad: 188000 },
  { mes: "Mar", ingresos: 830000, gastos: 615000, utilidad: 215000 },
  { mes: "Abr", ingresos: 846000, gastos: 638000, utilidad: 208000 },
  { mes: "May", ingresos: 941000, gastos: 689000, utilidad: 252000 },
  { mes: "Jun", ingresos: 1013000, gastos: 734000, utilidad: 279000 },
]

const recentActivity = [
  { id: 1, tipo: "Factura registrada", monto: "S/ 12,450", proyecto: "Mantenimiento Plataforma", tiempo: "Hace 5 min" },
  { id: 2, tipo: "Gasto aprobado", monto: "S/ 8,200", proyecto: "Optimización de Combustible", tiempo: "Hace 12 min" },
  { id: 3, tipo: "Presupuesto actualizado", monto: "+S/ 25,000", proyecto: "Modernización Portuaria", tiempo: "Hace 1 hora" },
  { id: 4, tipo: "Pago recibido", monto: "S/ 45,000", proyecto: "Sistema de Rastreo", tiempo: "Hace 2 horas" },
]

const statusConfig = {
  "en-curso": { label: "En Curso", variant: "default" as const },
  "pausado": { label: "Pausado", variant: "secondary" as const },
  "completado": { label: "Completado", variant: "outline" as const },
  "excedido": { label: "Excedido", variant: "destructive" as const },
}

const statusDistribution = [
  { name: "En Curso", value: 18, color: "#3b82f6" },
  { name: "Pausado", value: 4, color: "#eab308" },
  { name: "Excedido", value: 3, color: "#ef4444" },
  { name: "Completado", value: 9, color: "#10b981" },
]

export function CostCentersContent() {
  const [viewMode, setViewMode] = useState<"operativa" | "global">("operativa")
  const [selectedClient, setSelectedClient] = useState<string>("all")

  const filteredProjects = selectedClient === "all" 
    ? projectsData 
    : projectsData.filter(p => p.client === selectedClient)

  const selectedClientData = clientsData.find(c => c.id === selectedClient)

  // Calculate totals
  const totalPresupuesto = filteredProjects.reduce((acc, p) => acc + p.presupuesto, 0)
  const totalGastado = filteredProjects.reduce((acc, p) => acc + p.gastado, 0)
  const totalComprometido = filteredProjects.reduce((acc, p) => acc + p.comprometido, 0)
  const totalIngresos = filteredProjects.reduce((acc, p) => acc + p.ingresos, 0)
  const totalUtilidad = filteredProjects.reduce((acc, p) => acc + p.utilidad, 0)
  const disponible = totalPresupuesto - totalGastado - totalComprometido

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Centro de Costos</h1>
              <p className="text-muted-foreground">
                Análisis financiero operativo y gerencial
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Este Trimestre
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Este Mes</DropdownMenuItem>
              <DropdownMenuItem>Este Trimestre</DropdownMenuItem>
              <DropdownMenuItem>Este Año</DropdownMenuItem>
              <DropdownMenuItem>Rango Personalizado</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* View Selector and Client Filter */}
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "operativa" | "global")}>
          <TabsList className="grid w-[400px] grid-cols-2">
            <TabsTrigger value="operativa" className="gap-2">
              <Target className="h-4 w-4" />
              Vista Operativa
            </TabsTrigger>
            <TabsTrigger value="global" className="gap-2">
              <Globe className="h-4 w-4" />
              Vista Global
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Cliente:</span>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos los clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Clientes</SelectItem>
              {clientsData.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", client.color)} />
                    {client.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {viewMode === "operativa" ? (
        /* VISTA OPERATIVA - Por Proyecto */
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Presupuesto Total</p>
                    <p className="text-2xl font-bold">S/ {(totalPresupuesto / 1000).toFixed(0)}k</p>
                  </div>
                  <div className="rounded-md bg-primary/10 p-3">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Gastado</p>
                    <p className="text-2xl font-bold">S/ {(totalGastado / 1000).toFixed(0)}k</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((totalGastado / totalPresupuesto) * 100).toFixed(1)}% del presupuesto
                    </p>
                  </div>
                  <div className="rounded-md bg-warning/10 p-3">
                    <TrendingUp className="h-5 w-5 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Comprometido</p>
                    <p className="text-2xl font-bold">S/ {(totalComprometido / 1000).toFixed(0)}k</p>
                    <p className="text-xs text-muted-foreground mt-1">Facturas pendientes</p>
                  </div>
                  <div className="rounded-md bg-primary/10 p-3">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Disponible</p>
                    <p className="text-2xl font-bold">S/ {(disponible / 1000).toFixed(0)}k</p>
                    <p className="text-xs text-success mt-1 flex items-center gap-1">
                      <ArrowDownRight className="h-3 w-3" />
                      Presupuesto restante
                    </p>
                  </div>
                  <div className="rounded-md bg-success/10 p-3">
                    <DollarSign className="h-5 w-5 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Utilidad</p>
                    <p className="text-2xl font-bold text-success">S/ {(totalUtilidad / 1000).toFixed(0)}k</p>
                    <p className="text-xs text-success mt-1 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      {((totalUtilidad / totalIngresos) * 100).toFixed(1)}% margen
                    </p>
                  </div>
                  <div className="rounded-md bg-success/10 p-3">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Projects Cost Centers */}
            <Card className="lg:col-span-2 bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Centro de Costos por Proyecto</CardTitle>
                    <CardDescription>Estado financiero de cada proyecto</CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {filteredProjects.length} proyecto(s)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Proyecto</TableHead>
                      <TableHead className="text-right">Presupuesto</TableHead>
                      <TableHead className="text-right">Gastado</TableHead>
                      <TableHead className="text-right">Utilidad</TableHead>
                      <TableHead className="text-right">Varianza</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow key={project.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", project.clientColor)} />
                            <div>
                              <p className="font-medium text-sm">{project.name}</p>
                              <p className="text-xs text-muted-foreground">{project.documentos} documentos</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">S/ {(project.presupuesto / 1000).toFixed(0)}k</TableCell>
                        <TableCell className="text-right">S/ {(project.gastado / 1000).toFixed(0)}k</TableCell>
                        <TableCell className="text-right font-medium text-success">
                          S/ {(project.utilidad / 1000).toFixed(0)}k
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              "flex items-center justify-end gap-1",
                              project.varianza < -20 ? "text-success" : project.varianza > 0 ? "text-destructive" : "text-warning"
                            )}
                          >
                            {project.varianza > 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {Math.abs(project.varianza).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[project.estado as keyof typeof statusConfig].variant}>
                            {statusConfig[project.estado as keyof typeof statusConfig].label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <CardTitle>Actividad Reciente</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
                    >
                      <div className="rounded-full bg-primary/10 p-2">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.tipo}</p>
                        <p className="text-xs text-muted-foreground truncate">{activity.proyecto}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-semibold text-primary">{activity.monto}</span>
                          <span className="text-xs text-muted-foreground">{activity.tiempo}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Detail - Gastos Operativos */}
          {selectedClient !== "all" && filteredProjects.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Desglose de Gastos Operativos</CardTitle>
                <CardDescription>Distribución de gastos por categoría para cada proyecto</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredProjects.slice(0, 3).map((project) => (
                    <div key={project.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className={cn("h-2 w-2 rounded-full", project.clientColor)} />
                        <h4 className="font-medium text-sm truncate">{project.name}</h4>
                      </div>
                      <div className="space-y-3">
                        {project.gastosOperativos.map((gasto, index) => (
                          <div key={index}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">{gasto.categoria}</span>
                              <span className="font-medium">S/ {(gasto.monto / 1000).toFixed(1)}k</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${(gasto.monto / project.gastado) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* VISTA GLOBAL - Por Cliente */
        <>
          {/* Summary Cards - Global */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Facturación Total</p>
                    <p className="text-2xl font-bold">S/ {(totalIngresos / 1000000).toFixed(2)}M</p>
                    <p className="text-xs text-success mt-1 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      +12.5% vs año anterior
                    </p>
                  </div>
                  <div className="rounded-md bg-primary/10 p-3">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Gastos Totales</p>
                    <p className="text-2xl font-bold">S/ {(totalGastado / 1000000).toFixed(2)}M</p>
                    <p className="text-xs text-warning mt-1 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      +9.8% vs año anterior
                    </p>
                  </div>
                  <div className="rounded-md bg-warning/10 p-3">
                    <TrendingUp className="h-5 w-5 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Utilidad Global</p>
                    <p className="text-2xl font-bold text-success">S/ {(totalUtilidad / 1000000).toFixed(2)}M</p>
                    <p className="text-xs text-success mt-1 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      +18.2% vs año anterior
                    </p>
                  </div>
                  <div className="rounded-md bg-success/10 p-3">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Rentabilidad</p>
                    <p className="text-2xl font-bold">{((totalUtilidad / totalIngresos) * 100).toFixed(1)}%</p>
                    <p className="text-xs text-success mt-1 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      +2.1 pts vs año anterior
                    </p>
                  </div>
                  <div className="rounded-md bg-primary/10 p-3">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Monthly Trend */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Tendencia Financiera</CardTitle>
                <CardDescription>Ingresos, gastos y utilidad mensual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorUtilidad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(value) => `S/${value / 1000}k`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [`S/ ${(value / 1000).toFixed(0)}k`, ""]}
                      />
                      <Area
                        type="monotone"
                        dataKey="ingresos"
                        name="Ingresos"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorIngresos)"
                      />
                      <Area
                        type="monotone"
                        dataKey="utilidad"
                        name="Utilidad"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorUtilidad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-muted-foreground">Ingresos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-sm text-muted-foreground">Utilidad</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Distribución por Estado</CardTitle>
                <CardDescription>Estado de los centros de costos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {statusDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                      <span className="ml-auto text-xs font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Client Comparison Table */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Comparativa por Cliente</CardTitle>
                  <CardDescription>Rendimiento financiero global de cada cliente</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Proyectos</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Gastos</TableHead>
                    <TableHead className="text-right">Utilidad</TableHead>
                    <TableHead className="text-right">Rentabilidad</TableHead>
                    <TableHead className="text-right">Tendencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientsData.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", client.color)}>
                            <span className="text-sm font-bold text-white">
                              {client.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.documentos} documentos</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{client.proyectosActivos}</TableCell>
                      <TableCell className="text-right">S/ {(client.ingresos / 1000).toFixed(0)}k</TableCell>
                      <TableCell className="text-right">S/ {(client.gastos / 1000).toFixed(0)}k</TableCell>
                      <TableCell className="text-right font-medium text-success">
                        S/ {(client.utilidad / 1000).toFixed(0)}k
                      </TableCell>
                      <TableCell className="text-right">
                        {((client.utilidad / client.ingresos) * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "flex items-center justify-end gap-1",
                            client.tendencia > 0 ? "text-success" : "text-destructive"
                          )}
                        >
                          {client.tendencia > 0 ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {Math.abs(client.tendencia).toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Client Revenue Distribution Chart */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Distribución de Ingresos por Cliente</CardTitle>
              <CardDescription>Comparación de facturación y utilidad</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientsData} layout="vertical" barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(value) => `S/${value / 1000}k`} />
                    <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`S/ ${(value / 1000).toFixed(0)}k`, ""]}
                    />
                    <Bar dataKey="ingresos" name="Ingresos" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="utilidad" name="Utilidad" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
