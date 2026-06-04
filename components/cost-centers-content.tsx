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


// Projects data

const clientsData: any[] = []
const projectsData: any[] = []
const monthlyTrend: any[] = []
const recentActivity: any[] = []

const statusConfig = {
  "en-curso": { label: "En Curso", variant: "default" as const },
  "pausado": { label: "Pausado", variant: "secondary" as const },
  "completado": { label: "Completado", variant: "outline" as const },
  "excedido": { label: "Excedido", variant: "destructive" as const },
}

const statusDistribution: any[] = []

export function CostCentersContent() {
  const [viewMode, setViewMode] = useState<"operativa" | "global">("operativa")
  const [selectedClient, setSelectedClient] = useState<string>("all")

  const filteredProjects = selectedClient === "all" 
    ? projectsData 
    : projectsData.filter(p => p.client === selectedClient)

  const selectedClientData = clientsData.find(c => c.id === selectedClient)

  // Calculate totals
  const totalPresupuesto = 0
const totalGastado = 0
const totalComprometido = 0
const totalIngresos = 0
const totalUtilidad = 0
const disponible = 0
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
  Sin información disponible
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
                    <p className="text-xs text-muted-foreground mt-1">
  Sin información disponible
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
                    {filteredProjects.length === 0 && (
  <TableRow>
    <TableCell
      colSpan={6}
      className="text-center text-muted-foreground"
    >
      No existen datos disponibles
    </TableCell>
  </TableRow>
)}
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
                  No existen movimientos registrados
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Detail - Gastos Operativos */}
          
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
                    <p className="text-xs text-muted-foreground mt-1">
  Sin información disponible
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
                    <p className="text-xs text-muted-foreground mt-1">
  Sin información disponible
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
                    <p className="text-xs text-muted-foreground mt-1">
  Sin información disponible
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
                    <p className="text-2xl font-bold">0%</p>
                    <p className="text-xs text-muted-foreground mt-1">Sin información disponible</p>
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
                    <AreaChart data={[]}>
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
                <div className="mt-4 text-center text-sm text-muted-foreground">Sin información disponible</div>
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
                <div className="mt-4 text-center text-sm text-muted-foreground">Sin información disponible</div>
                  
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
  <TableRow>
    <TableCell
      colSpan={7}
      className="text-center text-muted-foreground"
    >
      No existen datos disponibles
    </TableCell>
  </TableRow>
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
                <AreaChart data={[]}>
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
                </AreaChart>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
