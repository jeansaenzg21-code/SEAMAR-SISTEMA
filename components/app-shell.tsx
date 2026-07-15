"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  BarChart3,
  PieChart,
  Users,
  Settings,
  Bell,
  ChevronDown,
  Anchor,
  Sparkles,
  Menu,
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

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  MessageSquareWarning,
} from "lucide-react"
import { Landmark } from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Valorizaciones", href: "/valuations", icon: Activity },
  { name: "Aprobaciones", href: "/approvals", icon: CheckCircle },
  { name: "Observaciones", href: "/observations", icon: MessageSquareWarning },
  { name: "Conciliación Bancaria", href: "/bank-reconciliation", icon: Landmark },
]

const analytics = [
  { name: "Centro de Costos", href: "/analytics/cost-centers", icon: BarChart3 },
  { name: "Rentabilidad", href: "/analytics/profitability", icon: PieChart },
]
const clientsSection = [
  {
    name: "Clientes",
    href: "/clients",
  },
  {
    name: "Cuentas por Cobrar",
    href: "/accounts-receivable",
  },
]

const providersSection = [
  {
    name: "Proveedores",
    href: "/providers",
  },
  {
    name: "Cuentas por Pagar",
    href: "/accounts-payable",
  },
]

export function Sidebar({
  
  mobileMenuOpen,
  setMobileMenuOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
}: {
  mobileMenuOpen?: boolean
  setMobileMenuOpen?: (value: boolean) => void
  sidebarCollapsed?: boolean
  setSidebarCollapsed?: (value: boolean) => void
}) {
  const pathname = usePathname()
  const router = useRouter()

  const [expandedSections, setExpandedSections] = useState({
    analytics: true,
    clients: true,
    providers: true,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Cierra el menú móvil al navegar a cualquier ítem del sidebar
  const closeMobileMenu = () => setMobileMenuOpen?.(false)

  return (
    <>
      {/* Overlay: solo existe en mobile y solo cuando el menú está abierto */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobileMenu}
          suppressHydrationWarning
        />
      )}

      <aside
  className={cn(
    "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-sidebar",
    mobileMenuOpen
      ? "block"
      : "hidden lg:flex"
  )}
>
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {/* Toggle de colapso: funcionalidad exclusiva de escritorio */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            onClick={() => setSidebarCollapsed?.(!sidebarCollapsed)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Anchor className="h-5 w-5 text-primary-foreground" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-sidebar-foreground">
                Seamar
              </span>
              <span className="text-xs text-muted-foreground">
                Operaciones Marítimas
              </span>
            </div>
          )}
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
                  onClick={closeMobileMenu}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    sidebarCollapsed ? "justify-center" : "gap-3",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && item.name}
                </Link>
              )
            })}
          </div>

          <div className="pt-4">
            <button
              onClick={() => toggleSection("clients")}
              className={cn(
                "flex w-full items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-sidebar-foreground",
                sidebarCollapsed ? "justify-center" : "justify-between"
              )}
            >
              {!sidebarCollapsed && "Clientes"}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  expandedSections.clients ? "" : "-rotate-90"
                )}
              />
            </button>

            {!sidebarCollapsed && expandedSections.clients && (
              <div className="space-y-1">
                {clientsSection.map((item) => {
                  const isActive = pathname === item.href

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className={cn(
                        "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        sidebarCollapsed ? "justify-center" : "ml-4 gap-3",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <Users className="h-4 w-4 shrink-0" />
                      {!sidebarCollapsed && item.name}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="pt-4">
            <button
              onClick={() => toggleSection("providers")}
              className={cn(
                "flex w-full items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-sidebar-foreground",
                sidebarCollapsed ? "justify-center" : "justify-between"
              )}
            >
              {!sidebarCollapsed && "Proveedores"}
              {!sidebarCollapsed && (
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expandedSections.providers ? "" : "-rotate-90"
                  )}
                />
              )}
            </button>

            {!sidebarCollapsed && expandedSections.providers && (
              <div className="space-y-1">
                {providersSection.map((item) => {
                  const isActive = pathname === item.href

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className={cn(
                        "ml-4 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <Users className="h-4 w-4" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            )}
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
            {!sidebarCollapsed && expandedSections.analytics && (
              <div className="space-y-1">
                {analytics.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={closeMobileMenu}
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
        </nav>

        {/* User Section */}
        <div className="border-t border-sidebar-border p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full px-2 hover:bg-sidebar-accent",
                  sidebarCollapsed ? "justify-center" : "justify-start gap-3"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    SS
                  </AvatarFallback>
                </Avatar>
                {!sidebarCollapsed && (
                  <div className="flex flex-1 flex-col items-start text-left">
                    <span className="text-sm font-medium text-sidebar-foreground">
                      Sheran Saenz
                    </span>
                    <span className="text-xs text-muted-foreground">Administrador</span>
                  </div>
                )}

                {!sidebarCollapsed && (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
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
    </>
  )
}

export function Header({
  
  setMobileMenuOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
}: {
  setMobileMenuOpen?: (value: boolean) => void
  sidebarCollapsed?: boolean
  setSidebarCollapsed?: (value: boolean) => void
}) {
  console.log("HEADER RENDERIZADO")
  const [actividades, setActividades] = useState<any[]>([])
  const [cargandoActividad, setCargandoActividad] = useState(true)

  useEffect(() => {
    async function cargarActividad() {
      try {
        const response = await fetch("/api/actividad?limit=20")
        const data = await response.json()
        setActividades(data.actividades || [])
      } catch (error) {
        console.error(error)
      } finally {
        setCargandoActividad(false)
      }
    }

    cargarActividad()
  }, [])

  return (
    <header className="
sticky top-0 z-30
flex h-16 items-center justify-between
border-b border-border
bg-background/95
px-3 md:px-6
">
      <div className="flex items-center gap-4">
        {/* Botón hamburguesa: exclusivo de mobile, abre/cierra el drawer */}
        <Button
          variant="ghost"
          size="icon"
          className=""
          onClick={(e) => {
            e.stopPropagation()
            setMobileMenuOpen?.(true)
          }}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h1 className="hidden md:block text-lg font-semibold">
            Centro de Operaciones
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Popover
          onOpenChange={async (open) => {
            if (!open) return

            try {
              await fetch("/api/actividad", {
                method: "PATCH",
              })

              setActividades((prev) =>
                prev.map((a) => ({
                  ...a,
                  leido: true,
                }))
              )
            } catch (error) {
              console.error(error)
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />

              {actividades.some((a) => !a.leido) && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-96 p-0">
            <div className="border-b px-4 py-3">
              <h3 className="font-semibold">
                Actividad reciente
              </h3>

              <p className="text-xs text-muted-foreground">
                Últimos eventos del sistema
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {actividades.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No hay actividades recientes.
                </div>
              ) : (
                actividades.map((actividad) => (
                  <div
                    key={actividad.id}
                    className="border-b px-4 py-3 hover:bg-muted/50"
                  >
                    <div className="font-medium text-sm">
                      {actividad.titulo}
                    </div>

                    {actividad.subtitulo && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {actividad.subtitulo}
                      </div>
                    )}

                    <div className="text-[11px] text-muted-foreground mt-2">
                      {new Date(actividad.created_at).toLocaleString("es-PE")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <span className="hidden md:block text-sm">
                Vista Ejecutiva
              </span>
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
  


  const [mostrarRecordatorio, setMostrarRecordatorio] = useState(false)
  const [valorizacionesPendientes, setValorizacionesPendientes] = useState(0)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)


  useEffect(() => {
  console.log("mobileMenuOpen =", mobileMenuOpen)
}, [mobileMenuOpen])
  useEffect(() => {
    async function verificarPendientes() {
      const sesionResponse = await fetch("/api/auth/session")

      if (!sesionResponse.ok) return

      const sesion = await sesionResponse.json()

      if (sesion.rol !== "SUPERVISOR") return

      const pendientesResponse = await fetch(
        "/api/valorizaciones/pendientes"
      )

      if (!pendientesResponse.ok) return

      const data = await pendientesResponse.json()

      if (
        data.pendientes > 0 &&
        !sessionStorage.getItem("recordatorio_supervisor_mostrado")
      ) {
        setValorizacionesPendientes(data.pendientes)
        setMostrarRecordatorio(true)

        sessionStorage.setItem(
          "recordatorio_supervisor_mostrado",
          "true"
        )
      }
    }

    verificarPendientes()
  }, [])

  return (
    <>
      {mostrarRecordatorio && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          style={{
            zIndex: 999999999,
            pointerEvents: "auto",
          }}
        >
          <div
            className="w-[520px] rounded-2xl border border-blue-500/20 bg-zinc-900/95 backdrop-blur-xl shadow-2xl p-8"
            style={{
              position: "relative",
              zIndex: 1000000000,
            }}
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 text-3xl">
                🔔
              </div>

              <h2 className="text-2xl font-semibold text-white">
                Recordatorio de aprobación
              </h2>

              <p className="mt-5 text-lg text-zinc-300">
                Tiene{" "}
                <span className="text-2xl font-bold text-blue-400">
                  {valorizacionesPendientes}
                </span>{" "}
                valorizaciones pendientes de aprobación.
              </p>

              <p className="mt-3 text-sm text-zinc-500">
                Revise las valorizaciones pendientes para continuar el flujo operativo.
              </p>

              <div className="mt-8 flex gap-4">
                <button
                  type="button"
                  className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 transition-all"
                  onClick={() => {
                    setMostrarRecordatorio(false)
                    window.location.href = "/approvals"
                  }}
                >
                  Revisar ahora
                </button>

                <button
                  type="button"
                  className="rounded-lg border border-zinc-700 px-6 py-2 text-zinc-300 hover:bg-zinc-800 transition-all"
                  onClick={() => {
                    setMostrarRecordatorio(false)
                  }}
                >
                  Más tarde
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />
        <div
  className={cn(
    "flex flex-1 min-w-0 flex-col overflow-auto transition-all duration-300",
    mobileMenuOpen
      ? "ml-64 lg:ml-64"
      : sidebarCollapsed
      ? "lg:ml-20"
      : "lg:ml-64"
  )}
>
          <Header
            setMobileMenuOpen={setMobileMenuOpen}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
          />
          <main className="
flex-1
overflow-auto
p-3 md:p-6
">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}