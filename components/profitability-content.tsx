"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

export function ProfitabilityContent() {
  const totalRevenue = 0
const totalCosts = 0
const totalProfit = 0
const averageMargin = 0
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
                Indicadores de rentabilidad preparados para integrarse con Tesorería, Valorizaciones y Conciliación Bancaria.
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
                <p className="text-sm text-muted-foreground">Costos Totales</p>
                <p className="text-2xl font-bold">S/ {(totalCosts / 1000000).toFixed(2)}M</p>
                <p className="text-xs text-warning mt-1 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" />
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
                <p className="text-sm text-muted-foreground">Utilidad Neta</p>
                <p className="text-2xl font-bold text-success">S/ {(totalProfit / 1000000).toFixed(2)}M</p>
                <p className="text-xs text-success mt-1 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" />
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
                <p className="text-sm text-muted-foreground">Margen Promedio</p>
                <p className="text-2xl font-bold">{averageMargin.toFixed(1)}%</p>
                <p className="text-xs text-success mt-1 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" />
                  Sin información disponible
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

        {/* Margin Trend */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Tendencia del Margen de Utilidad</CardTitle>
            <CardDescription>Porcentaje de margen mensual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[]}>
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
  <TableRow>
    <TableCell
      colSpan={5}
      className="text-center text-muted-foreground"
    >
      No existen datos disponibles
    </TableCell>
  </TableRow>
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
            <div className="text-center text-sm text-muted-foreground py-8">No existen datos disponibles</div>
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
              <BarChart data={[]} layout="vertical" barSize={32}>
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
