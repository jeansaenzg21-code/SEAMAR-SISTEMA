"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { procesarDocumento } from "@/lib/openai-documentos";
type AnyItem = any
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  FolderKanban,
  FileText,
  DollarSign,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  Download,
  Upload,
  Plus,
  Eye,
  MoreHorizontal,
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

interface ProjectDetailProps {
  projectId: string
}




const defaultProject = {
  id: "proj-default",
  name: "Project Details",
  client: "Client",
  clientColor: "bg-gray-500",
  status: "active",
  description: "Project description not available.",
  progress: 0,
budget: 0,
spent: 0,
dueDate: "",
startDate: "",
team: 0,
  documents: [],
  costBreakdown: [],
  spendingTrend: [],
  milestones: [],
}

const statusConfig = {
  active: { label: "Active", variant: "default" as const },
  "on-hold": { label: "On Hold", variant: "secondary" as const },
  completed: { label: "Completed", variant: "outline" as const },
  "in-progress": { label: "In Progress", variant: "default" as const },
  pending: { label: "Pending", variant: "secondary" as const },
}

const typeIcons: Record<string, string> = {
  report: "📄",
  spreadsheet: "📊",
  invoice: "💰",
  "purchase-order": "📋",
}

export function ProjectDetailContent({ projectId }: ProjectDetailProps) {
  const [project, setProject] =
  useState<any>(defaultProject)

const remainingBudget =
  Number(project.monto || 0)

useEffect(() => {
  cargarProyecto()
}, [projectId])

const cargarProyecto = async () => {
  try {
    const res = await fetch(
      `/api/proyectos/${projectId}`
    )

    const data = await res.json()

    setProject({
      ...defaultProject,
      ...data,
      id: data.id,
      name: data.nombre,
      client: "Cliente",
      description:
        data.descripcion ||
        "Sin descripción registrada.",
      startDate:
  data.fecha_inicio?.slice(0, 10) || "",
dueDate:
  data.fecha_fin?.slice(0, 10) || "",
      budget:
        Number(data.monto || 0),
      spent: 0,
      documents:
        data.contrato_nombre
          ? [
              {
                id: "contrato",
                name: data.contrato_nombre,
                type: "contract",
                date:
                  data.fecha_creacion?.slice(0, 10) ||
                  "",
                size: "",
              },
            ]
          : [],
    })
  } catch (error) {
    console.error(
      "Error al cargar proyecto:",
      error
    )
  }
}

  const [valorizaciones, setValorizaciones] = useState<any[]>([])

  useEffect(() => {
    cargarValorizaciones()
  }, [])

  const cargarValorizaciones = async () => {
    try {

      const res = await fetch(
  "/api/valorizaciones"
)

const data =
  await res.json()

  setValorizaciones(
  Array.isArray(data)
    ? data.filter(
        (v: any) =>
          String(v.negocio_operacion) === String(projectId)
      )
    : []
)

setValorizaciones(data)
    } catch (error) {
      console.error("Error al cargar valorizaciones:", error)
    }
  }

  const valorizacionesMilestones = valorizaciones.map((v) => ({
    name: v.descripcion || `Valorización ${v.id}`,
  status:
      v.estado === "APROBADO"
        ? "completed"
        : v.estado === "EN_REVISION"
        ? "in-progress"
        : "pending",
    date:
      v.fecha_aprobacion ||
      v.fecha_revision ||
      v.fecha_ejecucion ||
      v.periodo ||
      new Date().toISOString(),
  }))

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className={cn("h-2 w-2 rounded-full", project.clientColor)} />
            <span className="text-sm text-muted-foreground">{project.client}</span>
            <Badge variant={statusConfig[project.status as keyof typeof statusConfig]?.variant || "default"}>
              {statusConfig[project.status as keyof typeof statusConfig]?.label || project.status}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-1">{project.name}</h1>
          <p className="text-muted-foreground mt-1">{project.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/upload">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </Link>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Document
          </Button>
        </div>
      </div>

      {/* Progress & Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="md:col-span-2 bg-card border-border">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Overall Progress</span>
                <span className="text-2xl font-bold">{project.progress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
  Started: {project.startDate ? new Date(project.startDate).toLocaleDateString() : "--"}
</span>
<span className="text-muted-foreground">
  Due: {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "--"}
</span>
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
                <p className="text-lg font-bold">${(project.spent / 1000).toFixed(0)}k</p>
                <p className="text-xs text-muted-foreground">of ${(project.budget / 1000).toFixed(0)}k budget</p>
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
                <p className="text-lg font-bold">{project.documents.length}</p>
                <p className="text-xs text-muted-foreground">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Spending Trend */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Spending Trend</CardTitle>
                <CardDescription>Budget vs actual spending by month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={project.spendingTrend}>
                      <defs>
                        <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--muted-foreground)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="var(--muted-foreground)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(value) => `$${value / 1000}k`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [`$${(value / 1000).toFixed(0)}k`, ""]}
                      />
                      <Area type="monotone" dataKey="budget" name="Budget" stroke="var(--muted-foreground)" fillOpacity={1} fill="url(#colorBudget)" />
                      <Area type="monotone" dataKey="actual" name="Actual" stroke="var(--primary)" fillOpacity={1} fill="url(#colorActual)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>Spending by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={project.costBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {project.costBreakdown.map((entry: AnyItem, index: number) =>(
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [`$${(value / 1000).toFixed(0)}k`, ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {project.costBreakdown.map((item: AnyItem) =>(
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                      <span className="ml-auto text-xs font-medium">${(item.value / 1000).toFixed(0)}k</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Project Documents</CardTitle>
                  <CardDescription>All documents associated with this project</CardDescription>
                </div>
                <Link href="/upload">
                  <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload New
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.documents.map((doc: AnyItem) => (
                    <TableRow key={doc.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="rounded-md bg-muted p-2">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          {doc.name}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">{doc.type.replace("-", " ")}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(doc.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-muted-foreground">{doc.size}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones">
  <Card className="bg-card border-border">
    <CardHeader>
      <CardTitle>Project Milestones</CardTitle>
      <CardDescription>Track project progress through key milestones</CardDescription>
    </CardHeader>

    <CardContent>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left font-semibold">ID</th>
              <th className="px-4 py-3 text-left font-semibold">Cliente</th>
              <th className="px-4 py-3 text-left font-semibold">Nombre P.</th>
              <th className="px-4 py-3 text-left font-semibold">N° O/S</th>
              <th className="px-4 py-3 text-left font-semibold">Tipo</th>
              <th className="px-4 py-3 text-left font-semibold">Monto</th>
              <th className="px-4 py-3 text-left font-semibold">Estado</th>
              <th className="px-4 py-3 text-left font-semibold">Encargado</th>
              <th className="px-4 py-3 text-left font-semibold">Fecha Inicio</th>
              <th className="px-4 py-3 text-left font-semibold">Documentos</th>
            </tr>
          </thead>

          <tbody>
            {valorizaciones.map((v) => (
              <tr key={v.id} className="border-b border-border">
                <td className="px-4 py-4 font-medium">
  {v.codigo}
</td>
                <td className="px-4 py-4">{v.proveedor}</td>
                <td className="px-4 py-4">{v.negocio_operacion}</td>
                <td className="px-4 py-4">{v.numero_orden_servicio}</td>
                <td className="px-4 py-4">{v.tipo}</td>
                <td className="px-4 py-4">S/ {Number(v.monto).toLocaleString("es-PE")}</td>
                <td className="px-4 py-4">
                  <span className="rounded-full border px-2 py-1 text-xs">
                    {v.estado}
                  </span>
                </td>
                <td className="px-4 py-4">{v.encargado}</td>
                <td className="px-4 py-4">{v.fecha_ejecucion?.slice(0, 10)}</td>
                <td className="px-4 py-4">{v.archivo_nombre || "Sin adjunto"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
</TabsContent>

        <TabsContent value="financials">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Budget Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Budget</span>
                  <span className="font-bold">${(project.budget / 1000).toFixed(0)}k</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Spent to Date</span>
                  <span className="font-bold text-warning">${(project.spent / 1000).toFixed(0)}k</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-bold text-success">${(remainingBudget / 1000).toFixed(0)}k</span>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Budget Utilization</span>
                    <span className="font-bold">{((project.spent / project.budget) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2 bg-card border-border">
              <CardHeader>
                <CardTitle>Cost Categories</CardTitle>
                <CardDescription>Detailed breakdown of project expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {project.costBreakdown.map((category: AnyItem) => (
                    <div key={category.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{category.name}</span>
                        <span className="text-muted-foreground">${(category.value / 1000).toFixed(0)}k</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${(category.value / project.spent) * 100}%`,
                            backgroundColor: category.color 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
