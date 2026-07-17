"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Settings,
  Bell,
  ChevronDown,
  Anchor,
  Menu,
  Activity,
  CheckCircle,
  MessageSquareWarning,
  Landmark,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useEffect, useState } from "react"
import { useEmpresa } from "@/hooks/use-empresa"
import { useRol, useUser } from "@/lib/role-context"

const NAV_ADMIN = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Valorizaciones", href: "/valuations", icon: Activity },
  { name: "Aprobaciones", href: "/approvals", icon: CheckCircle },
  { name: "Observaciones", href: "/observations", icon: MessageSquareWarning },
  { name: "Conciliación Bancaria", href: "/bank-reconciliation", icon: Landmark },
]

const NAV_SUPERVISOR = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
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
  const { data: empresa } = useEmpresa()
  const sesion = useUser()
  const { rol } = useRol()

  const esSupervisor = rol === "SUPERVISOR"

  const navItems = esSupervisor ? NAV_SUPERVISOR : NAV_ADMIN

  const [expandedSections, setExpandedSections] = useState({
    clients: true,
    providers: true,
    valorizaciones: true,
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
    "fixed left-0 top-0 z-50 flex h-screen flex-col bg-sidebar transition-all duration-300 ease-in-out",
    mobileMenuOpen ? "w-[80vw] max-w-sm" : sidebarCollapsed ? "w-20" : "w-64",
    mobileMenuOpen
      ? "block"
      : "hidden lg:flex"
  )}
>
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
         
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
                  {empresa?.logo ? (
                    <img src={empresa.logo} alt="Logo" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <Anchor className="h-5 w-5 text-primary-foreground" />
                  )}
                </div>
                <div className={cn("flex flex-col justify-center min-w-0 transition-all duration-300 overflow-hidden", sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100")}>
                  <span className="truncate text-sm font-semibold text-sidebar-foreground">
                    {empresa?.nombreComercial || ""}
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              align="start"
              sideOffset={8}
              className="bg-popover text-foreground border border-border shadow-md"
            >
              {empresa?.razonSocial || empresa?.nombreComercial || ""}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {/* Main Navigation */}
          <div className="space-y-1">
            {navItems.map((item) => {
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
                  <span className={cn("transition-all duration-300 overflow-hidden whitespace-nowrap", sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100")}>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {esSupervisor && (
          <div className="pt-4">
            <button
              onClick={() => toggleSection("valorizaciones")}
              className={cn(
                "flex w-full items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-sidebar-foreground",
                sidebarCollapsed ? "justify-center" : "justify-between"
              )}
            >
              <span className={cn("transition-all duration-300 overflow-hidden whitespace-nowrap", sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100")}>Valorizaciones</span>
              {!sidebarCollapsed && (
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expandedSections.valorizaciones ? "" : "-rotate-90"
                  )}
                />
              )}
            </button>

            {!sidebarCollapsed && expandedSections.valorizaciones && (
              <div className="space-y-1">
                {(() => {
                  const isActive = pathname === "/approvals"
                  return (
                    <Link
                      href="/approvals"
                      onClick={closeMobileMenu}
                      className={cn(
                        "ml-4 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      Aprobaciones
                    </Link>
                  )
                })()}
              </div>
            )}
          </div>
          )}

          {!esSupervisor && (
          <div className="pt-4">
            <button
              onClick={() => toggleSection("clients")}
              className={cn(
                "flex w-full items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-sidebar-foreground",
                sidebarCollapsed ? "justify-center" : "justify-between"
              )}
            >
              <span className={cn("transition-all duration-300 overflow-hidden whitespace-nowrap", sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100")}>Clientes</span>
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
          )}

          {!esSupervisor && (
          <div className="pt-4">
            <button
              onClick={() => toggleSection("providers")}
              className={cn(
                "flex w-full items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-sidebar-foreground",
                sidebarCollapsed ? "justify-center" : "justify-between"
              )}
            >
              <span className={cn("transition-all duration-300 overflow-hidden whitespace-nowrap", sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100")}>Proveedores</span>
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
          )}

        </nav>

        {/* Sección inferior: menú de usuario con Configuración + Cerrar sesión */}
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
                  {sesion?.avatar ? (
                    <AvatarImage src={sesion.avatar} alt={sesion.nombre} />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {sesion?.nombre ? sesion.nombre.charAt(0).toUpperCase() + (sesion.nombre.split(" ")[1]?.charAt(0) || sesion.nombre.charAt(1) || "").toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("flex flex-1 flex-col items-start text-left transition-all duration-300 overflow-hidden", sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100")}>
                  <span className="text-sm font-medium text-sidebar-foreground">
                    {sesion?.nombre || "Usuario"}
                  </span>
                  <span className="text-xs text-muted-foreground">{sesion?.cargo || sesion?.rol || ""}</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-all duration-300", sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-4 opacity-100")} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => router.push("/configuracion")}>
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                } catch {}
                router.replace("/login");
              }}>
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
  const [actividades, setActividades] = useState<any[]>([])
  const [cargandoActividad, setCargandoActividad] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function cargarActividad() {
      try {
        const response = await fetch("/api/actividad?limit=20")
        if (cancelled) return
        const data = await response.json()
        if (!cancelled) setActividades(data.actividades || [])
      } catch (error) {
        console.error(error)
      } finally {
        if (!cancelled) setCargandoActividad(false)
      }
    }

    cargarActividad()
    return () => { cancelled = true }
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
            if (window.innerWidth >= 1024) {
              setSidebarCollapsed?.(!sidebarCollapsed)
            } else {
              setMobileMenuOpen?.(true)
            }
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
      
      </div>
    </header>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [mostrarRecordatorio, setMostrarRecordatorio] = useState(false)
  const [valorizacionesPendientes, setValorizacionesPendientes] = useState(0)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebarCollapsed") === "true"
    }
    return false
  })
  const { rol } = useRol()

  useEffect(() => {
    if (rol !== "SUPERVISOR") return

    async function verificarPendientes() {
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
  }, [rol])

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(sidebarCollapsed))
  }, [sidebarCollapsed])

  return (
    <>
      {mostrarRecordatorio && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[520px] rounded-2xl border border-border bg-card shadow-2xl p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Bell className="h-6 w-6 text-primary" />
              </div>

              <h2 className="text-2xl font-semibold text-card-foreground">
                Recordatorio de aprobación
              </h2>

              <p className="mt-5 text-lg text-muted-foreground">
                Tiene{" "}
                <span className="text-2xl font-bold text-primary">
                  {valorizacionesPendientes}
                </span>{" "}
                valorizaciones pendientes de aprobación.
              </p>

              <p className="mt-3 text-sm text-muted-foreground">
                Revise las valorizaciones pendientes para continuar el flujo operativo.
              </p>

              <div className="mt-8 flex gap-4">
                <Button
                  onClick={() => {
                    setMostrarRecordatorio(false)
                    router.push("/approvals")
                  }}
                >
                  Revisar ahora
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setMostrarRecordatorio(false)
                  }}
                >
                  Más tarde
                </Button>
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