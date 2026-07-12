"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DollarSign,
  Wallet,
  BarChart3,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Upload,
  MessageSquareText,
  Activity,
  Eye,
  Sparkles,
  Loader2,
  RefreshCw,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"


export type KpiId = keyof typeof KPI_CONFIG

export interface DashboardKPI {
  id: KpiId
  value: number
  description: string
}

// AlertaEstado es un identificador interno enviado por el backend (nunca un
// texto visible). Se deriva automáticamente de ALERT_STATUS_CONFIG, definido
// más abajo, que es el único responsable de traducirlo a etiqueta y estilo.
export type AlertaEstado = keyof typeof ALERT_STATUS_CONFIG

export interface DashboardAlert {
  id: string
  title: string
  description: string
  estado: AlertaEstado
}

// ActivityType se deriva automáticamente de ACTIVITY_CONFIG, definido más
// abajo. Agregar un nuevo tipo de actividad solo requiere una entrada nueva
// en ACTIVITY_CONFIG.
export type ActivityType = keyof typeof ACTIVITY_CONFIG

export interface DashboardActivity {
  id: string
  type: keyof typeof ACTIVITY_CONFIG
  title: string
  subtitle: string
  createdAt: string // ISO 8601, p.ej. "2026-07-11T18:30:00Z"
}

// ClienteEstado es un identificador interno enviado por el backend.
// El Dashboard es el único responsable de traducirlo a etiqueta y color
// visibles, a través de CLIENT_STATUS_CONFIG.
export type ClienteEstado = "healthy" | "normal" | "risk"

export interface DashboardClient {
  id: string
  nombre: string
  cxc: number
  valorizaciones: number
  diasMora: number
  estado: ClienteEstado
}

export interface DashboardData {
  kpis: DashboardKPI[]
  alerts: DashboardAlert[]
  recentActivity: DashboardActivity[]
  topClients: DashboardClient[]
}


const KPI_CONFIG = {
  accounts_receivable: {
    title: "Cuentas por Cobrar",
    icon: DollarSign,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    order: 1,
  },
  accounts_payable: {
    title: "Cuentas por Pagar",
    icon: Wallet,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    order: 2,
  },
  valorizaciones: {
    title: "Valorizaciones Aprobadas",
    icon: BarChart3,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-400",
    order: 3,
},
  pending_valuations: {
    title: "Valorizaciones Pendientes",
    icon: Building2,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    order: 4,
},
} as const

const DEFAULT_KPI_CONFIG: { title: string; icon: LucideIcon; iconBg: string; iconColor: string; order: number } = {
  title: "Indicador",
  icon: Sparkles,
  iconBg: "bg-secondary",
  iconColor: "text-muted-foreground",
  order: 999,
}

function getKpiConfig(id: KpiId) {
  return KPI_CONFIG[id] ?? DEFAULT_KPI_CONFIG
}


const ACTIVITY_CONFIG = {
  cxc: {
    icon: DollarSign,
  },

  cxp: {
    icon: Wallet,
  },

  valorizacion: {
    icon: BarChart3,
  },

} as const

const ALERT_STATUS_CONFIG = {
  today: {
    label: "Hoy",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  today_due: {
    label: "Vence hoy",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  pending: {
    label: "Pendiente",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  warning: {
    label: "En 3 días",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
} as const

// Traduce el identificador interno de estado de cliente (enviado por el
// backend) a su etiqueta visible y color. El backend nunca conoce "Óptimo",
// "Normal", "En Riesgo" ni clases de Tailwind: solo envía healthy | normal | risk.
const CLIENT_STATUS_CONFIG: Record<ClienteEstado, { label: string; dotColor: string }> = {
  healthy: {
    label: "Óptimo",
    dotColor: "bg-emerald-400",
  },
  normal: {
    label: "Normal",
    dotColor: "bg-blue-400",
  },
  risk: {
    label: "En Riesgo",
    dotColor: "bg-red-400",
  },
}

// =============================================================================
// FORMATEO
// =============================================================================

function formatCurrency(value: number): string {
  return `S/ ${value.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatRelativeTime(iso: string): string {

  const fecha = new Date(iso);

  if (isNaN(fecha.getTime())) {
    return "";
  }

  const diffMs = Date.now() - fecha.getTime();

  const minutos = Math.floor(diffMs / 60000);

  if (minutos < 1) {
    return "Hace un momento";
  }

  if (minutos < 60) {
    return `Hace ${minutos} minuto${minutos === 1 ? "" : "s"}`;
  }

  const horas = Math.floor(minutos / 60);

  if (horas < 24) {
    return `Hace ${horas} hora${horas === 1 ? "" : "s"}`;
  }

  const dias = Math.floor(horas / 24);

  return `Hace ${dias} día${dias === 1 ? "" : "s"}`;
}


function KPICard({ kpi }: { kpi: DashboardKPI }) {
  const config = getKpiConfig(kpi.id)
  const Icon = config.icon
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className={cn("mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl", config.iconBg)}>
          <Icon className={cn("h-5 w-5", config.iconColor)} />
        </div>
        <div className="text-2xl font-bold tracking-tight">{formatCurrency(kpi.value)}</div>
        <p className="mt-1 text-sm text-muted-foreground">{kpi.description}</p>
        <p className="mt-2 text-xs font-medium text-muted-foreground/80">{config.title}</p>
      </CardContent>
    </Card>
  )
}

function AlertItem({ alert }: { alert: DashboardAlert }) {
  const statusConfig = ALERT_STATUS_CONFIG[alert.estado]
  return (
    <div className="flex items-center gap-4 rounded-lg border border-transparent px-2 py-3 transition-colors hover:border-border hover:bg-secondary/40">
      <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{alert.title}</p>
        <p className="truncate text-xs text-muted-foreground">{alert.description}</p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
          statusConfig.className
        )}
      >
        {statusConfig.label}
      </span>
    </div>
  )
}

function ActivityItem({
  activity,
  isLast,
}: {
  activity: DashboardActivity
  isLast: boolean
}) {
  const Icon = ACTIVITY_CONFIG[activity.type].icon
  return (
    <div className="relative flex gap-4">
      <div className="relative flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        {!isLast && <span className="mt-1 w-px flex-1 bg-border" />}
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <p className="text-sm font-medium leading-snug">{activity.title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{activity.subtitle}</span>
          <span>·</span>
          <span className="shrink-0">{formatRelativeTime(activity.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}

function ClientRow({ client }: { client: DashboardClient }) {
  const statusConfig = CLIENT_STATUS_CONFIG[client.estado]
  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
      <td className="py-3 pr-4 font-medium">{client.nombre}</td>
      <td className="py-3 pr-4 text-muted-foreground">{formatCurrency(client.cxc)}</td>
      <td className="py-3 pr-4 text-muted-foreground">{formatCurrency(client.valorizaciones)}</td>
      <td className="py-3 pr-4 text-muted-foreground">{client.diasMora} días</td>
      <td className="py-3">
        <span className="inline-flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", statusConfig.dotColor)} />
          <span className="text-xs font-medium">{statusConfig.label}</span>
        </span>
      </td>
    </tr>
  )
}


export function DashboardContent() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/dashboard")
      if (!response.ok) {
        throw new Error(`Error ${response.status} al obtener el dashboard`)
      }
      const data: DashboardData = await response.json()
      setDashboardData(data)
    } catch {
      setError("No se pudo cargar la información del dashboard")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visión ejecutiva de tesorería, valorizaciones y proyectos.
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

      {error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadDashboard}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      {/* Este bloque será alimentado por GET /api/dashboard -> kpis
          Backend: CxC, CxP, Valorizaciones, Proyectos (y cualquier KPI futuro
          agregado a KPI_CONFIG, sin cambios de lógica) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-5">
                <div className="mb-4 h-10 w-10 animate-pulse rounded-xl bg-secondary" />
                <div className="h-7 w-24 animate-pulse rounded bg-secondary" />
                <div className="mt-2 h-4 w-32 animate-pulse rounded bg-secondary" />
                <div className="mt-2 h-3 w-20 animate-pulse rounded bg-secondary" />
              </CardContent>
            </Card>
          ))
        ) : dashboardData && dashboardData.kpis.length > 0 ? (
          [...dashboardData.kpis]
            .sort((a, b) => getKpiConfig(a.id).order - getKpiConfig(b.id).order)
            .map((kpi) => <KPICard key={kpi.id} kpi={kpi} />)
        ) : (
          <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
            No hay información disponible
          </div>
        )}
      </div>

      {/* Alertas Críticas + Actividad Reciente */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alertas Críticas */}
        {/* Este bloque será alimentado por GET /api/dashboard -> alerts
            Backend: CxC, CxP, Valorizaciones, Conciliación Bancaria */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <CardTitle>Alertas Críticas</CardTitle>
            </div>
            <CardDescription>Requieren atención inmediata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !dashboardData || dashboardData.alerts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No hay información disponible
              </div>
            ) : (
              dashboardData.alerts.map((alert) => <AlertItem key={alert.id} alert={alert} />)
            )}
          </CardContent>
        </Card>

        {/* Actividad Reciente */}
        {/* Este bloque será alimentado por GET /api/dashboard -> recentActivity
            Backend: CxC, CxP, Valorizaciones, OCR, IA Documental, Clientes, Proyectos */}
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
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !dashboardData || dashboardData.recentActivity.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No hay información disponible
              </div>
            ) : (
              <div className="relative space-y-5 pl-1">
                {dashboardData.recentActivity.map((activity, index) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    isLast={index === dashboardData.recentActivity.length - 1}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Clientes por Indicador */}
      {/* Este bloque será alimentado por GET /api/dashboard -> topClients
          Backend: CxC, Valorizaciones, Clientes */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Top Clientes por Indicador</CardTitle>
          <CardDescription>Cuentas por cobrar, valorizaciones y mora por cliente</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !dashboardData || dashboardData.topClients.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No hay información disponible
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Cliente</th>
                    <th className="pb-3 pr-4 font-medium">Cuentas por Cobrar</th>
                    <th className="pb-3 pr-4 font-medium">Valorizaciones Aprovadas</th>
                    <th className="pb-3 pr-4 font-medium">Mora Promedio</th>
                    <th className="pb-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.topClients.map((client) => (
                    <ClientRow key={client.id} client={client} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}