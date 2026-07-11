"use client"

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
} from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Datos de referencia. Estos arrays reemplazan a los mocks estáticos del
// dashboard anterior y están listos para ser sustituidos por datos reales
// (fetch a los endpoints correspondientes) sin cambiar la estructura visual.
// ---------------------------------------------------------------------------

type KpiColor = "blue" | "emerald" | "violet" | "amber"

const kpiColorStyles: Record<KpiColor, { iconBg: string; iconColor: string }> = {
  blue: { iconBg: "bg-blue-500/10", iconColor: "text-blue-400" },
  emerald: { iconBg: "bg-emerald-500/10", iconColor: "text-emerald-400" },
  violet: { iconBg: "bg-violet-500/10", iconColor: "text-violet-400" },
  amber: { iconBg: "bg-amber-500/10", iconColor: "text-amber-400" },
}

const kpis: {
  title: string
  value: string
  description: string
  icon: typeof DollarSign
  color: KpiColor
}[] = [
  {
    title: "Cuentas por Cobrar",
    value: "S/ 2,125,430",
    description: "Total pendiente",
    icon: DollarSign,
    color: "blue",
  },
  {
    title: "Cuentas por Pagar",
    value: "S/ 1,340,200",
    description: "Total pendiente",
    icon: Wallet,
    color: "emerald",
  },
  {
    title: "Valorizaciones",
    value: "S/ 845,600",
    description: "En proceso",
    icon: BarChart3,
    color: "violet",
  },
  {
    title: "Proyectos Activos",
    value: "12",
    description: "En ejecución",
    icon: Building2,
    color: "amber",
  },
]

type AlertaEstado = "Hoy" | "Vence hoy" | "Pendiente" | "En 3 días"

const estadoAlertaStyles: Record<AlertaEstado, string> = {
  Hoy: "bg-red-500/10 text-red-400 border-red-500/20",
  "Vence hoy": "bg-red-500/10 text-red-400 border-red-500/20",
  Pendiente: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "En 3 días": "bg-amber-500/10 text-amber-400 border-amber-500/20",
}

const alertasCriticas: {
  id: number
  title: string
  description: string
  estado: AlertaEstado
}[] = [
  {
    id: 1,
    title: "3 valorizaciones pendientes de aprobación",
    description: "Requieren revisión del supervisor",
    estado: "Pendiente",
  },
  {
    id: 2,
    title: "2 cuentas por cobrar vencidas",
    description: "Clientes con pago fuera de plazo",
    estado: "Vence hoy",
  },
  {
    id: 3,
    title: "1 conciliación bancaria pendiente",
    description: "Banco BCP · cuenta corriente soles",
    estado: "Hoy",
  },
  {
    id: 4,
    title: "4 contratos próximos a vencer",
    description: "Renovación requerida",
    estado: "En 3 días",
  },
]

const actividadReciente: {
  id: number
  icon: typeof CheckCircle2
  title: string
  subtitle: string
  time: string
}[] = [
  {
    id: 1,
    icon: CheckCircle2,
    title: "Valorización VAL-2026-197 aprobada",
    subtitle: "TERMINALES DEL PERÚ",
    time: "Hace 2h",
  },
  {
    id: 2,
    icon: MessageSquareText,
    title: "Observación resuelta",
    subtitle: "TRALZA",
    time: "Hace 5h",
  },
  {
    id: 3,
    icon: Upload,
    title: "Documento cargado a OneDrive",
    subtitle: "TDP OPERACIONES",
    time: "Ayer",
  },
  {
    id: 4,
    icon: DollarSign,
    title: "Nueva cuenta por cobrar generada",
    subtitle: "REPSOL COMERCIAL SAC",
    time: "Ayer",
  },
]

type ClienteEstado = "Óptimo" | "Normal" | "En Riesgo"

const estadoClienteDot: Record<ClienteEstado, string> = {
  Óptimo: "bg-emerald-400",
  Normal: "bg-blue-400",
  "En Riesgo": "bg-red-400",
}

const topClientes: {
  cliente: string
  cxc: string
  valorizaciones: string
  mora: string
  estado: ClienteEstado
}[] = [
  {
    cliente: "REPSOL COMERCIAL SAC",
    cxc: "S/ 512,300",
    valorizaciones: "S/ 128,400",
    mora: "12 días",
    estado: "Normal",
  },
  {
    cliente: "TERMINALES DEL PERÚ",
    cxc: "S/ 398,750",
    valorizaciones: "S/ 210,600",
    mora: "3 días",
    estado: "Óptimo",
  },
  {
    cliente: "TRALZA",
    cxc: "S/ 275,900",
    valorizaciones: "S/ 95,200",
    mora: "28 días",
    estado: "En Riesgo",
  },
  {
    cliente: "TDP OPERACIONES",
    cxc: "S/ 189,400",
    valorizaciones: "S/ 64,100",
    mora: "5 días",
    estado: "Óptimo",
  },
]

export function DashboardContent() {
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const styles = kpiColorStyles[kpi.color]
          return (
            <Card key={kpi.title} className="bg-card border-border">
              <CardContent className="p-5">
                <div className={cn("mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl", styles.iconBg)}>
                  <kpi.icon className={cn("h-5 w-5", styles.iconColor)} />
                </div>
                <div className="text-2xl font-bold tracking-tight">{kpi.value}</div>
                <p className="mt-1 text-sm text-muted-foreground">{kpi.description}</p>
                <p className="mt-2 text-xs font-medium text-muted-foreground/80">{kpi.title}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Alertas Críticas + Actividad Reciente */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alertas Críticas */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <CardTitle>Alertas Críticas</CardTitle>
            </div>
            <CardDescription>Requieren atención inmediata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {alertasCriticas.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No hay alertas críticas
              </div>
            ) : (
              alertasCriticas.map((alerta) => (
                <div
                  key={alerta.id}
                  className="flex items-center gap-4 rounded-lg border border-transparent px-2 py-3 transition-colors hover:border-border hover:bg-secondary/40"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{alerta.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{alerta.description}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
                      estadoAlertaStyles[alerta.estado]
                    )}
                  >
                    {alerta.estado}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Actividad Reciente */}
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
            {actividadReciente.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No existen movimientos registrados
              </div>
            ) : (
              <div className="relative space-y-5 pl-1">
                {actividadReciente.map((item, index) => (
                  <div key={item.id} className="relative flex gap-4">
                    <div className="relative flex flex-col items-center">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      {index < actividadReciente.length - 1 && (
                        <span className="mt-1 w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <p className="text-sm font-medium leading-snug">{item.title}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{item.subtitle}</span>
                        <span>·</span>
                        <span className="shrink-0">{item.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Clientes por Indicador */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Top Clientes por Indicador</CardTitle>
          <CardDescription>Cuentas por cobrar, valorizaciones y mora por cliente</CardDescription>
        </CardHeader>
        <CardContent>
          {topClientes.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Sin información disponible
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Cliente</th>
                    <th className="pb-3 pr-4 font-medium">Cuentas por Cobrar</th>
                    <th className="pb-3 pr-4 font-medium">Valorizaciones en Proceso</th>
                    <th className="pb-3 pr-4 font-medium">Mora Promedio</th>
                    <th className="pb-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {topClientes.map((row) => (
                    <tr
                      key={row.cliente}
                      className="border-b border-border/60 last:border-0 hover:bg-secondary/30"
                    >
                      <td className="py-3 pr-4 font-medium">{row.cliente}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{row.cxc}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{row.valorizaciones}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{row.mora}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", estadoClienteDot[row.estado])} />
                          <span className="text-xs font-medium">{row.estado}</span>
                        </span>
                      </td>
                    </tr>
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