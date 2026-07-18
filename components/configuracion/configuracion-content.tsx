"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Users, ShieldCheck, Palette, ArrowLeft, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { EmpresaSection } from "@/components/configuracion/sections/empresa-section"
import { UsuariosSection } from "@/components/configuracion/sections/usuarios-section"
import { SeguridadSection } from "@/components/configuracion/sections/seguridad-section"
import { AparienciaSection } from "@/components/configuracion/sections/apariencia-section"

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

export function ConfiguracionContent() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<SectionId>("empresa")

  const active = SECTIONS_CONFIG[activeSection]
  const ActiveComponent = active.Component

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[93.75rem] px-4 py-6 md:px-6 lg:px-8">
        {/* Back button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="group inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Volver al Centro de Operaciones
        </button>

        {/* Header */}
        <div className="mt-4 space-y-0.5">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground md:text-[28px]">
            Configuración del sistema
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Administra la empresa, usuarios, seguridad y preferencias del sistema.
          </p>
        </div>

        {/* Horizontal tab navigation */}
        <nav
          aria-label="Secciones de configuración"
          className="mt-6 flex border-b border-border"
        >
          {(Object.keys(SECTIONS_CONFIG) as SectionId[]).map((id) => {
            const { label, icon: Icon } = SECTIONS_CONFIG[id]
            const isActive = id === activeSection
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                aria-current={isActive}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  "border-b-2 -mb-px",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Content */}
        <div
          key={activeSection}
          className="mt-6 animate-in fade-in slide-in-from-bottom-1 duration-300"
        >
          <div className="mb-5 space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">{active.label}</h2>
            <p className="text-sm text-muted-foreground/80">{active.description}</p>
          </div>
          <ActiveComponent />
        </div>
      </div>
    </div>
  )
}