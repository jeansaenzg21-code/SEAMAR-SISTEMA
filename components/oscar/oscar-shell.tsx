"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChevronDown, FileSpreadsheet, LogOut, Menu, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useEffect, useState } from "react"
import { useUser } from "@/lib/role-context"
import { NOMBRE_MODULO_OSCAR } from "@/lib/oscar/oscar"

const NAV_OSCAR = [
  { name: NOMBRE_MODULO_OSCAR, href: "/oscar", icon: Receipt },
]

export function OscarShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const sesion = useUser()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const guardado = localStorage.getItem("oscarSidebarCollapsed")
    if (guardado === "true") setSidebarCollapsed(true)
  }, [])

  useEffect(() => {
    localStorage.setItem("oscarSidebarCollapsed", String(sidebarCollapsed))
  }, [sidebarCollapsed])

  const cerrarSesion = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {}
    router.replace("/login")
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Overlay móvil */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar — fixed en móvil (overlay), static en desktop (flujo flex) */}
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-2xl transition-all duration-300 ease-in-out",
          "fixed inset-y-0 left-0 z-50 lg:static",
          mobileMenuOpen
            ? "w-[80vw] max-w-sm translate-x-0"
            : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        <div className="relative flex h-16 items-center overflow-hidden border-b border-sidebar-border px-5">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/15 via-transparent to-transparent" />
          <div className="relative flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 via-primary to-indigo-500 text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-white/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div
              className={cn(
                "flex flex-col justify-center min-w-0 transition-all duration-300 overflow-hidden",
                sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-44 opacity-100"
              )}
            >
              <span className="truncate text-base font-semibold text-sidebar-foreground">
                Mi Espacio
              </span>
              <span className="truncate text-xs text-sidebar-foreground/60">
                Cuentas por pagar
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-4 pt-5">
          <p
            className={cn(
              "px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/40 transition-all duration-300",
              sidebarCollapsed ? "opacity-0" : "opacity-100"
            )}
          >
            Personal
          </p>
          {NAV_OSCAR.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "relative flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  sidebarCollapsed ? "justify-center" : "gap-3",
                  isActive
                    ? "bg-gradient-to-r from-primary/25 to-primary/10 text-primary shadow-inner ring-1 ring-primary/20"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span
                  className={cn(
                    "transition-all duration-300 overflow-hidden whitespace-nowrap",
                    sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100"
                  )}
                >
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-sidebar-border/70 bg-gradient-to-t from-sidebar to-transparent p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full px-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  sidebarCollapsed ? "justify-center" : "justify-start gap-3"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary/50 to-primary/10 text-primary text-xs ring-1 ring-primary/30">
                    {sesion?.nombre
                      ? sesion.nombre.charAt(0).toUpperCase() +
                        (sesion.nombre.split(" ")[1]?.charAt(0) || "")
                      : "U"}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "flex flex-1 flex-col items-start text-left transition-all duration-300 overflow-hidden",
                    sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100"
                  )}
                >
                  <span className="text-sm font-medium text-sidebar-foreground">
                    {sesion?.nombre || "Usuario"}
                  </span>
                  <span className="text-xs text-sidebar-foreground/60">Espacio personal</span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-sidebar-foreground/50 transition-all duration-300",
                    sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-4 opacity-100"
                  )}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem disabled>
                {sesion?.cargo || "Usuario personal"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={cerrarSesion}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Contenido principal — ocupa todo el espacio restante vía flex-1 */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 bg-background/70 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                if (window.innerWidth >= 1024) {
                  setSidebarCollapsed(!sidebarCollapsed)
                } else {
                  setMobileMenuOpen(true)
                }
              }}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="oscar-text-gradient text-lg font-semibold tracking-tight md:text-xl">
              {NOMBRE_MODULO_OSCAR}
            </h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
