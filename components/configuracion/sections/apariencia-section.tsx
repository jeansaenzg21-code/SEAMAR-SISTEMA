"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Card, CardContent } from "@/components/ui/card"
import { Sun, Moon, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const TEMA_OPTIONS = [
  { value: "light", label: "Modo Claro", icon: Sun, description: "Fondo claro, ideal para ambientes con mucha luz" },
  { value: "dark", label: "Modo Oscuro", icon: Moon, description: "Fondo oscuro, el aspecto actual del sistema" },
] as const

// El cambio de tema es 100% client-side vía next-themes: se aplica de
// inmediato (clase en <html>), afecta toda la app porque los estilos
// dependen de las CSS variables globales (bg-card, bg-background, etc.) y
// se persiste solo en localStorage (manejado por next-themes).
//
// Preparado para persistencia por usuario en base de datos: cuando exista
// el endpoint, basta con llamar aquí a
//   fetch("/api/configuracion/apariencia", { method: "PUT", body: JSON.stringify({ tema }) })
// dentro de handleSelect, sin tocar el resto de la lógica de UI.
export function AparienciaSection() {
  const { theme, setTheme } = useTheme()
  // Evita mismatch de hidratación: el tema real solo se conoce en cliente.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function handleSelect(value: "light" | "dark") {
    setTheme(value)
  }

  return (
    <Card className="border-border/80 bg-card shadow-sm">
      <CardContent className="p-8 sm:p-10">
        <p className="text-base font-semibold tracking-tight">Tema</p>
        <p className="mb-8 mt-1.5 text-sm text-muted-foreground/80">
          Elige cómo se ve SEAMAR en este dispositivo. El cambio se aplica de inmediato.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          {TEMA_OPTIONS.map((option) => {
            const Icon = option.icon
            const selected = mounted && theme === option.value
            const isLight = option.value === "light"
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-2 text-left transition-all duration-200",
                  selected
                    ? "border-primary/60 ring-2 ring-primary/20"
                    : "border-border hover:-translate-y-0.5 hover:border-border hover:shadow-md"
                )}
              >
                {selected && (
                  <span className="absolute right-3.5 top-3.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-sm">
                    <Check className="h-3.5 w-3.5 text-primary-foreground" />
                  </span>
                )}

                {/* Mini vista previa del tema */}
                <div
                  className={cn(
                    "flex h-32 w-full flex-col gap-2 rounded-xl p-3",
                    isLight ? "bg-[#f4f4f5]" : "bg-[#0b0d12]"
                  )}
                >
                  <div className={cn("flex items-center gap-1.5 rounded-md p-1.5", isLight ? "bg-white" : "bg-white/[0.06]")}>
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400/70" />
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
                  </div>
                  <div className="flex flex-1 gap-2">
                    <div className={cn("w-1/3 rounded-md", isLight ? "bg-white" : "bg-white/[0.06]")} />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <div className={cn("h-6 rounded-md", isLight ? "bg-white" : "bg-white/[0.06]")} />
                      <div className="flex flex-1 gap-1.5">
                        <div className={cn("flex-1 rounded-md", isLight ? "bg-white" : "bg-white/[0.06]")} />
                        <div className={cn("flex-1 rounded-md", isLight ? "bg-white" : "bg-white/[0.06]")} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-3 py-4">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      isLight ? "bg-amber-500/10" : "bg-violet-500/10"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isLight ? "text-amber-400" : "text-violet-400")} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground/80">{option.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}