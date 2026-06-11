"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

const projectsData: Record<string, {
  id: string
  name: string
  client: string
  clientColor: string
  status: string
  description: string
  progress: number
  budget: number
  spent: number
  dueDate: string
  startDate: string
  team: number
  documents: { id: string; name: string; type: string; date: string; size: string }[]
  costBreakdown: { name: string; value: number; color: string }[]
  spendingTrend: { month: string; budget: number; actual: number }[]
  milestones: { name: string; status: string; date: string }[]
}> = {
  "proj-001": {
    id: "proj-001",
    name: "Offshore Platform Maintenance",
    client: "Repsol",
    clientColor: "bg-orange-500",
    status: "active",
    description: "Annual maintenance and inspection of offshore drilling platforms including safety systems, structural integrity checks, and equipment calibration.",
    progress: 75,
    budget: 450000,
    spent: 337500,
    dueDate: "2024-06-30",
    startDate: "2024-01-15",
    team: 8,
    documents: [
      { id: "doc-001", name: "Maintenance Schedule Q1.pdf", type: "report", date: "2024-05-10", size: "2.4 MB" },
      { id: "doc-002", name: "Safety Inspection Report.pdf", type: "report", date: "2024-05-08", size: "1.8 MB" },
      { id: "doc-003", name: "Equipment Inventory.xlsx", type: "spreadsheet", date: "2024-05-05", size: "890 KB" },
      { id: "doc-004", name: "INV-2024-0847.pdf", type: "invoice", date: "2024-05-01", size: "156 KB" },
      { id: "doc-005", name: "PO-2024-1234.pdf", type: "purchase-order", date: "2024-04-28", size: "234 KB" },
    ],
    costBreakdown: [
      { name: "Labor", value: 135000, color: "#3b82f6" },
      { name: "Equipment", value: 98700, color: "#f97316" },
      { name: "Materials", value: 67000, color: "#10b981" },
      { name: "Subcontractors", value: 36800, color: "#a855f7" },
    ],
    spendingTrend: [
      { month: "Jan", budget: 75000, actual: 72000 },
      { month: "Feb", budget: 75000, actual: 78000 },
      { month: "Mar", budget: 75000, actual: 68000 },
      { month: "Apr", budget: 75000, actual: 71000 },
      { month: "May", budget: 75000, actual: 48500 },
    ],
    milestones: [
      { name: "Project Kickoff", status: "completed", date: "2024-01-15" },
      { name: "Initial Assessment", status: "completed", date: "2024-02-01" },
      { name: "Phase 1 Complete", status: "completed", date: "2024-03-15" },
      { name: "Phase 2 Complete", status: "in-progress", date: "2024-05-30" },
      { name: "Final Inspection", status: "pending", date: "2024-06-15" },
      { name: "Project Closure", status: "pending", date: "2024-06-30" },
    ],
  },
}

const defaultProject = {
  id: "proj-default",
  name: "Project Details",
  client: "Client",
  clientColor: "bg-gray-500",
  status: "active",
  description: "Project description not available.",
  progress: 50,
  budget: 100000,
  spent: 50000,
  dueDate: "2024-12-31",
  startDate: "2024-01-01",
  team: 5,
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
  const project = projectsData[projectId] || defaultProject
  const remainingBudget = project.budget - project.spent

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
                <span className="text-muted-foreground">Started: {new Date(project.startDate).toLocaleDateString()}</span>
                <span className="text-muted-foreground">Due: {new Date(project.dueDate).toLocaleDateString()}</span>
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
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-md bg-success/10 p-3">
                <Users className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-lg font-bold">{project.team}</p>
                <p className="text-xs text-muted-foreground">Team Members</p>
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
                        {project.costBreakdown.map((entry, index) => (
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
                  {project.costBreakdown.map((item) => (
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
                  {project.documents.map((doc) => (
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
              <div className="space-y-4">
                {project.milestones.map((milestone, index) => (
                  <div
                    key={milestone.name}
                    className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-4"
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                      milestone.status === "completed" ? "bg-success/20 text-success" :
                      milestone.status === "in-progress" ? "bg-primary/20 text-primary" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{milestone.name}</p>
                      <p className="text-sm text-muted-foreground">{new Date(milestone.date).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={statusConfig[milestone.status as keyof typeof statusConfig]?.variant || "secondary"}>
                      {statusConfig[milestone.status as keyof typeof statusConfig]?.label || milestone.status}
                    </Badge>
                  </div>
                ))}
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
                  {project.costBreakdown.map((category) => (
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
