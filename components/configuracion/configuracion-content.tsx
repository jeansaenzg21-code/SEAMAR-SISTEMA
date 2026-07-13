"use client"

import { useState } from "react"
import { Building2, Users, ShieldCheck, Palette, Settings, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { EmpresaSection } from "@/components/configuracion/sections/empresa-section"
import { UsuariosSection } from "@/components/configuracion/sections/usuarios-section"
import { SeguridadSection } from "@/components/configuracion/sections/seguridad-section"
import { AparienciaSection } from "@/components/configuracion/sections/apariencia-section"

// Cada sección se define en un solo lugar. Agregar una sección nueva en el
// futuro solo requiere una entrada aquí, igual que KPI_CONFIG en el Dashboard.
// (Sin cambios de lógica respecto a la versión anterior — solo rediseño visual.)
const SECTIONS_CONFIG = {
  empresa: {
    label: "Empresa",
    description: "Datos generales y de contacto de tu organización",
    icon: Building2,
    Component: EmpresaSection,
  },
  usuarios: {
    label: "Usuarios",
    description: "Gestiona accesos, roles y estado de tu equipo",
    icon: Users,
    Component: UsuariosSection,
  },
  seguridad: {
    label: "Seguridad",
    description: "Contraseña y protección de tu cuenta",
    icon: ShieldCheck,
    Component: SeguridadSection,
  },
  apariencia: {
    label: "Apariencia",
    description: "Elige cómo se ve el sistema para ti",
    icon: Palette,
    Component: AparienciaSection,
  },
} as const

type SectionId = keyof typeof SECTIONS_CONFIG

function NavItem({
  id,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  id: SectionId
  label: string
  icon: LucideIcon
  active: boolean
  onClick: (id: SectionId) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      aria-current={active}
      className={cn(
        "group relative flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-left text-sm transition-all duration-200",
        active
          ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(var(--primary-rgb,255,255,255)/0.08)]"
          : "text-muted-foreground hover:translate-x-0.5 hover:bg-secondary/50 hover:text-foreground"
      )}
    >
      {/* Barra de acento del ítem activo, sutil, no invade el resto del sidebar */}
      <span
        className={cn(
          "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary transition-opacity duration-200",
          active ? "opacity-100" : "opacity-0"
        )}
      />
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
          active ? "bg-primary/15 text-primary" : "bg-secondary/60 text-muted-foreground group-hover:text-foreground"
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className={cn("truncate font-medium", active && "font-semibold")}>{label}</span>
    </button>
  )
}

export function ConfiguracionContent() {
  const [activeSection, setActiveSection] = useState<SectionId>("empresa")

  const active = SECTIONS_CONFIG[activeSection]
  const ActiveComponent = active.Component

  return (
    <div className="mx-auto w-full max-w-[1150px] space-y-12 px-1 pb-16">
      {/* Encabezado elegante, con más aire respecto al contenido */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Configuración</h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
            Administra la información de la empresa, usuarios, seguridad y preferencias del sistema.
          </p>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
        {/* Panel de navegación interno */}
        <nav
          aria-label="Secciones de configuración"
          className="h-fit space-y-1.5 rounded-2xl border border-border bg-card/60 p-3 lg:sticky lg:top-6"
        >
          {(Object.keys(SECTIONS_CONFIG) as SectionId[]).map((id) => (
            <NavItem
              key={id}
              id={id}
              label={SECTIONS_CONFIG[id].label}
              icon={SECTIONS_CONFIG[id].icon}
              active={id === activeSection}
              onClick={setActiveSection}
            />
          ))}
        </nav>

        {/* Contenido de la sección activa. Solo esto cambia al navegar,
            sin recargar la página (estado local, no cambio de ruta). */}
        <div
          key={activeSection}
          className="min-w-0 animate-in fade-in slide-in-from-bottom-1 space-y-8 duration-300"
        >
          <div className="space-y-1.5 px-1">
            <h2 className="text-2xl font-semibold tracking-tight">{active.label}</h2>
            <p className="text-sm text-muted-foreground/80">{active.description}</p>
          </div>
          <ActiveComponent />
        </div>
      </div>
    </div>
  )
}