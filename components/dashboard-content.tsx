"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  FolderKanban,
  DollarSign,
  Clock,
  Upload,
  Eye,
  MoreHorizontal,
  TrendingUp,
  Sparkles,
  Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

const kpis = [
  {
    title: "Total Documentos",
    value: "0",
    change: "0%",
    trend: "up",
    icon: FileText,
    description: "Sin información disponible",
  },
  {
    title: "Valorizaciones",
    value: "0",
    change: "0%",
    trend: "up",
    icon: FolderKanban,
    description: "Sin información disponible",
  },
  {
    title: "Cuentas por Cobrar",
    value: "S/ 0.00",
    change: "0%",
    trend: "up",
    icon: DollarSign,
    description: "Sin información disponible",
  },
  {
    title: "Cuentas por Pagar",
    value: "S/ 0.00",
    change: "0%",
    trend: "up",
    icon: Clock,
    description: "Sin información disponible",
  },
]

const recentActivity: any[] = []

const revenueData: any[] = []

const projectsByClient: any[] = []

const documentsByType: any[] = []

export function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Dashboard financiero en preparación. Los indicadores se alimentarán desde Tesorería, Valorizaciones y Conciliación Bancaria.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/analytics/profitability">
            <Button variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Ver Reportes
            </Button>
          </Link>
          <Link href="/upload">
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              IA de Facturas
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <div className="rounded-md bg-muted p-2">
                <kpi.icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="flex items-center gap-1 text-xs">
                <span
                  className={cn(
                    "flex items-center",
                    kpi.trend === "up" ? "text-success" : "text-warning"
                  )}
                >
                  {kpi.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {kpi.change}
                </span>
                <span className="text-muted-foreground">{kpi.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Facturación por Cliente</CardTitle>
                <CardDescription>Ingresos mensuales por cliente</CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[]}>
                  <defs>
                    <linearGradient id="colorRepsol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTdp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
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
                    dataKey="repsol"
                    name="Repsol"
                    stroke="#f97316"
                    fillOpacity={1}
                    fill="url(#colorRepsol)"
                  />
                  <Area
                    type="monotone"
                    dataKey="tdp"
                    name="TDP"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorTdp)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">Sin información disponible</div>
          </CardContent>
        </Card>

        {/* Projects by Client */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Proyectos por Cliente</CardTitle>
            <CardDescription>Distribución de proyectos activos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {projectsByClient.map((entry, index) => (
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

      {/* Documents & Activity Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Document Types */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Documentos por Tipo</CardTitle>
                <CardDescription>Distribución de documentos cargados</CardDescription>
              </div>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center text-sm text-muted-foreground py-8">Sin información disponible</div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>Actividad Reciente</CardTitle>
              </div>
              <Button variant="ghost" size="sm">
                Ver todo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center text-sm text-muted-foreground py-8">No existen movimientos registrados</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
