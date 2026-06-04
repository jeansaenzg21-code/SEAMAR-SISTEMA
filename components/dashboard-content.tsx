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
    value: "2,847",
    change: "+12.5%",
    trend: "up",
    icon: FileText,
    description: "vs mes anterior",
  },
  {
    title: "Proyectos Activos",
    value: "34",
    change: "+3",
    trend: "up",
    icon: FolderKanban,
    description: "en todos los clientes",
  },
  {
    title: "Facturas Procesadas",
    value: "S/ 4.2M",
    change: "+8.2%",
    trend: "up",
    icon: DollarSign,
    description: "este trimestre",
  },
  {
    title: "Pendientes de Revisión",
    value: "23",
    change: "-5",
    trend: "down",
    icon: Clock,
    description: "documentos",
  },
]

const recentActivity = [
  {
    id: 1,
    action: "Factura procesada con IA",
    document: "F001-00847",
    client: "Repsol",
    user: "María García",
    time: "Hace 5 min",
    status: "processing",
  },
  {
    id: 2,
    action: "Documento aprobado",
    document: "OC-2024-1234",
    client: "TDP",
    user: "Carlos Martínez",
    time: "Hace 12 min",
    status: "completed",
  },
  {
    id: 3,
    action: "Proyecto creado",
    document: "Mantenimiento Offshore",
    client: "BPO",
    user: "Juan Delgado",
    time: "Hace 1 hora",
    status: "new",
  },
  {
    id: 4,
    action: "Reporte generado",
    document: "Reporte-Q4-Financiero.pdf",
    client: "Tralsa",
    user: "Ana Rodríguez",
    time: "Hace 2 horas",
    status: "completed",
  },
  {
    id: 5,
    action: "XML procesado",
    document: "lote-facturas-047.xml",
    client: "Repsol",
    user: "Sistema IA",
    time: "Hace 3 horas",
    status: "completed",
  },
]

const revenueData = [
  { month: "Ene", repsol: 245000, tdp: 189000, bpo: 156000, tralsa: 98000 },
  { month: "Feb", repsol: 278000, tdp: 198000, bpo: 167000, tralsa: 112000 },
  { month: "Mar", repsol: 312000, tdp: 215000, bpo: 178000, tralsa: 125000 },
  { month: "Abr", repsol: 289000, tdp: 234000, bpo: 189000, tralsa: 134000 },
  { month: "May", repsol: 345000, tdp: 256000, bpo: 195000, tralsa: 145000 },
  { month: "Jun", repsol: 367000, tdp: 278000, bpo: 212000, tralsa: 156000 },
]

const projectsByClient = [
  { name: "Repsol", value: 12, color: "#f97316" },
  { name: "TDP", value: 8, color: "#3b82f6" },
  { name: "BPO", value: 9, color: "#10b981" },
  { name: "Tralsa", value: 5, color: "#a855f7" },
]

const documentsByType = [
  { type: "Facturas", count: 847, percentage: 35 },
  { type: "Contratos", count: 423, percentage: 18 },
  { type: "Reportes", count: 612, percentage: 25 },
  { type: "Órdenes de Compra", count: 534, percentage: 22 },
]

export function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen de operaciones marítimas y gestión documental
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
                <AreaChart data={revenueData}>
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
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-orange-500" />
                <span className="text-sm text-muted-foreground">Repsol</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm text-muted-foreground">TDP</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-muted-foreground">BPO</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-purple-500" />
                <span className="text-sm text-muted-foreground">Tralsa</span>
              </div>
            </div>
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
                    data={projectsByClient}
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
            <div className="mt-4 grid grid-cols-2 gap-2">
              {projectsByClient.map((client) => (
                <div key={client.name} className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: client.color }}
                  />
                  <span className="text-xs text-muted-foreground">{client.name}</span>
                  <span className="ml-auto text-xs font-medium">{client.value}</span>
                </div>
              ))}
            </div>
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
            <div className="space-y-4">
              {documentsByType.map((doc) => (
                <div key={doc.type} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{doc.type}</span>
                    <span className="text-muted-foreground">{doc.count} archivos</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${doc.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
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
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                >
                  <div className="mt-0.5 rounded-md bg-muted p-2">
                    {activity.action.includes("IA") ? (
                      <Sparkles className="h-4 w-4 text-primary" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <Badge
                        variant={
                          activity.status === "completed"
                            ? "default"
                            : activity.status === "processing"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {activity.status === "completed" ? "Completado" : 
                         activity.status === "processing" ? "Procesando" : "Nuevo"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activity.document} • {activity.client}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user} • {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
