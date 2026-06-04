"use client"

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  PieChart as PieChartIcon,
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
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts"

const clientProfitability = [
  {
    id: "repsol",
    name: "Repsol",
    color: "bg-orange-500",
    chartColor: "#f97316",
    revenue: 2450000,
    costs: 1862000,
    profit: 588000,
    margin: 24.0,
    projects: 12,
    trend: 8.5,
    status: "high",
  },
  {
    id: "tdp",
    name: "TDP",
    color: "bg-blue-500",
    chartColor: "#3b82f6",
    revenue: 1370000,
    costs: 1041200,
    profit: 328800,
    margin: 24.0,
    projects: 8,
    trend: 12.3,
    status: "high",
  },
  {
    id: "bpo",
    name: "BPO",
    color: "bg-emerald-500",
    chartColor: "#10b981",
    revenue: 1097000,
    costs: 911510,
    profit: 185490,
    margin: 16.9,
    projects: 9,
    trend: -2.1,
    status: "medium",
  },
  {
    id: "tralsa",
    name: "Tralsa",
    color: "bg-purple-500",
    chartColor: "#a855f7",
    revenue: 770000,
    costs: 616000,
    profit: 154000,
    margin: 20.0,
    projects: 5,
    trend: 5.8,
    status: "medium",
  },
]

const monthlyProfitability = [
  { mes: "Ene", ingresos: 688000, costos: 512000, utilidad: 176000 },
  { mes: "Feb", ingresos: 755000, costos: 567000, utilidad: 188000 },
  { mes: "Mar", ingresos: 830000, costos: 615000, utilidad: 215000 },
  { mes: "Abr", ingresos: 846000, costos: 638000, utilidad: 208000 },
  { mes: "May", ingresos: 941000, costos: 689000, utilidad: 252000 },
  { mes: "Jun", ingresos: 1013000, costos: 734000, utilidad: 279000 },
]

const marginTrend = [
  { mes: "Ene", margen: 25.6 },
  { mes: "Feb", margen: 24.9 },
  { mes: "Mar", margen: 25.9 },
  { mes: "Abr", margen: 24.6 },
  { mes: "May", margen: 26.8 },
  { mes: "Jun", margen: 27.5 },
]

const topProjects = [
  { name: "Mantenimiento Plataforma Offshore", client: "Repsol", clientColor: "bg-orange-500", profit: 112500, margin: 25.0 },
  { name: "Optimización de Combustible", client: "TDP", clientColor: "bg-blue-500", profit: 98000, margin: 28.6 },
  { name: "Auditoría de Seguridad", client: "Repsol", clientColor: "bg-orange-500", profit: 38000, margin: 40.0 },
  { name: "Sistema de Rastreo", client: "Tralsa", clientColor: "bg-purple-500", profit: 35000, margin: 19.4 },
  { name: "Sistema de Gestión de Carga", client: "BPO", clientColor: "bg-emerald-500", profit: 27200, margin: 8.0 },
]

export function ProfitabilityContent() {
  const totalRevenue = clientProfitability.reduce((acc, c) => acc + c.revenue, 0)
  const totalCosts = clientProfitability.reduce((acc, c) => acc + c.costs, 0)
  const totalProfit = clientProfitability.reduce((acc, c) => acc + c.profit, 0)
  const averageMargin = (totalProfit / totalRevenue) * 100

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <PieChartIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Rentabilidad por Cliente</h1>
              <p className="text-muted-foreground">
                Vista ejecutiva de ingresos, costos y márgenes de utilidad
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Este Año
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
            Exportar Reporte
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                <p className="text-2xl font-bold">S/ {(totalRevenue / 1000000).toFixed(2)}M</p>
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
                <p className="text-sm text-muted-foreground">Costos Totales</p>
                <p className="text-2xl font-bold">S/ {(totalCosts / 1000000).toFixed(2)}M</p>
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
                <p className="text-sm text-muted-foreground">Utilidad Neta</p>
                <p className="text-2xl font-bold text-success">S/ {(totalProfit / 1000000).toFixed(2)}M</p>
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
                <p className="text-sm text-muted-foreground">Margen Promedio</p>
                <p className="text-2xl font-bold">{averageMargin.toFixed(1)}%</p>
                <p className="text-xs text-success mt-1 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" />
                  +2.1 pts vs año anterior
                </p>
              </div>
              <div className="rounded-md bg-primary/10 p-3">
                <Percent className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue vs Costs Trend */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Desempeño Mensual</CardTitle>
            <CardDescription>Tendencia de ingresos, costos y utilidad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyProfitability}>
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

        {/* Margin Trend */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Tendencia del Margen de Utilidad</CardTitle>
            <CardDescription>Porcentaje de margen mensual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={marginTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(value) => `${value}%`} domain={[20, 30]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Margen"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="margen"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ fill: "var(--primary)", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "var(--primary)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Performance & Top Projects */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client Profitability Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Desempeño por Cliente</CardTitle>
            <CardDescription>Desglose de rentabilidad por cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Utilidad</TableHead>
                  <TableHead className="text-right">Margen</TableHead>
                  <TableHead className="text-right">Tendencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientProfitability.map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn("h-3 w-3 rounded-full", client.color)} />
                        <span className="font-medium">{client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">S/ {(client.revenue / 1000).toFixed(0)}k</TableCell>
                    <TableCell className="text-right font-medium text-success">S/ {(client.profit / 1000).toFixed(0)}k</TableCell>
                    <TableCell className="text-right">{client.margin.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "flex items-center justify-end gap-1",
                          client.trend > 0 ? "text-success" : "text-destructive"
                        )}
                      >
                        {client.trend > 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {Math.abs(client.trend).toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Profitable Projects */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Proyectos Más Rentables</CardTitle>
            <CardDescription>Proyectos con mayor utilidad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProjects.map((project, index) => (
                <div
                  key={project.name}
                  className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-4"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{project.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={cn("h-2 w-2 rounded-full", project.clientColor)} />
                      <span className="text-xs text-muted-foreground">{project.client}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">S/ {(project.profit / 1000).toFixed(0)}k</p>
                    <p className="text-xs text-muted-foreground">{project.margin.toFixed(1)}% margen</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Revenue Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Distribución de Ingresos por Cliente</CardTitle>
          <CardDescription>Comparación de facturación y utilidad</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientProfitability} layout="vertical" barSize={32}>
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
                <Bar dataKey="revenue" name="Ingresos" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="profit" name="Utilidad" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
