"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Upload,
  BarChart3,
  PieChart,
  Users,
  Settings,
  Bell,
  Search,
  ChevronDown,
  Anchor,
  Sparkles,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  MessageSquareWarning,
} from "lucide-react"
const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clientes", href: "/clients", icon: Users },
  { name: "Proveedores", href: "/providers", icon: Users },
  { name: "Proyectos", href: "/projects", icon: FolderKanban },
  { name: "Documentos", href: "/documents", icon: FileText },

  { name: "Valorizaciones", href: "/valuations", icon: Activity },
  { name: "Aprobaciones", href: "/approvals", icon: CheckCircle },
  { name: "Observaciones", href: "/observations", icon: MessageSquareWarning },
]

const aiSection = [
  { name: "Subir Documento", href: "/upload", icon: Sparkles },
]

const analytics = [
  { name: "Centro de Costos", href: "/analytics/cost-centers", icon: BarChart3 },
  { name: "Rentabilidad", href: "/analytics/profitability", icon: PieChart },
]

const clients = [
  { name: "Repsol", id: "repsol", color: "bg-orange-500" },
  { name: "TDP", id: "tdp", color: "bg-blue-500" },
  { name: "BPO", id: "bpo", color: "bg-emerald-500" },
  { name: "Tralsa", id: "tralsa", color: "bg-purple-500" },
]

export function Sidebar() {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState({
    analytics: true,
    clients: true,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Anchor className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-sidebar-foreground">Seamar</span>
          <span className="text-xs text-muted-foreground">Operaciones Marítimas</span>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="h-9 bg-sidebar-accent pl-9 text-sm border-sidebar-border focus-visible:ring-sidebar-ring"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {/* Main Navigation */}
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* AI Section */}
        <div className="pt-4">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Inteligencia Artificial
          </div>
          <div className="space-y-1">
            {aiSection.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                    IA
                  </Badge>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Analytics Section */}
        <div className="pt-4">
          <button
            onClick={() => toggleSection("analytics")}
            className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-sidebar-foreground"
          >
            Analítica
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expandedSections.analytics ? "" : "-rotate-90"
              )}
            />
          </button>
          {expandedSections.analytics && (
            <div className="space-y-1">
              {analytics.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Clients Section */}
        <div className="pt-4">
          <button
            onClick={() => toggleSection("clients")}
            className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-sidebar-foreground"
          >
            Clientes
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expandedSections.clients ? "" : "-rotate-90"
              )}
            />
          </button>
          {expandedSections.clients && (
            <div className="space-y-1">
              {clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname === `/clients/${client.id}`
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <div className={cn("h-2 w-2 rounded-full", client.color)} />
                  {client.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-2 hover:bg-sidebar-accent"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  JD
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col items-start text-left">
                <span className="text-sm font-medium text-sidebar-foreground">
                  Juan Delgado
                </span>
                <span className="text-xs text-muted-foreground">Administrador</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Centro de Operaciones</h1>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <span className="text-sm">Vista Ejecutiva</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Vista Ejecutiva</DropdownMenuItem>
            <DropdownMenuItem>Vista Operativa</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-64">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
