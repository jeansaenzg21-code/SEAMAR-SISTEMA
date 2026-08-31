import { MessageSquare, AlertCircle, Bot, User, Clock } from "lucide-react"

interface ObservationItem {
  id?: string | number
  observacion: string
  usuario?: string
  fecha?: string
  tipo?: string
  estado?: string
}

interface ObservationHistoryProps {
  observaciones: ObservationItem[]
  variant?: "timeline" | "card"
  titulo?: string
}

function formatObsDate(fecha?: string) {
  if (!fecha) return ""
  try {
    const d = new Date(fecha)
    return d.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return fecha
  }
}

function ObservationCard({ obs, idx }: { obs: ObservationItem; idx: number }) {
  const isSystem = obs.tipo === "SISTEMA"
  return (
    <div className="group relative rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/30 p-4 transition-all hover:border-border hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isSystem
              ? "bg-blue-500/10 text-blue-400"
              : "bg-amber-500/10 text-amber-400"
          }`}
        >
          {isSystem ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isSystem
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}
            >
              {isSystem ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {isSystem ? "Sistema" : obs.usuario || "Usuario"}
            </span>

            {obs.estado && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-400 border border-red-500/20">
                <AlertCircle className="h-3 w-3" />
                {obs.estado}
              </span>
            )}
          </div>

          <p className="text-sm leading-relaxed text-foreground/90">{obs.observacion}</p>

          {obs.fecha && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatObsDate(obs.fecha)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ObservationHistory({
  observaciones,
  variant = "card",
  titulo = "HISTORIAL DE OBSERVACIONES",
}: ObservationHistoryProps) {
  if (observaciones.length === 0) {
    if (variant === "card") {
      return (
        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground">{titulo}</p>
          </div>
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted/40 mb-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="text-sm text-muted-foreground">No hay observaciones registradas.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Las observaciones aparecerán aquí cuando se registren.</p>
          </div>
        </div>
      )
    }
    return null
  }

  if (variant === "timeline") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground">{titulo}</p>
          <span className="ml-auto inline-flex items-center justify-center rounded-full bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {observaciones.length}
          </span>
        </div>
        <div className="relative ml-3 border-l-2 border-border/40 space-y-1">
          {observaciones.map((obs, idx) => (
            <div key={obs.id ?? idx} className="relative pl-6 py-2">
              <div className="absolute -left-[9px] top-3.5 h-4 w-4 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
              </div>
              <ObservationCard obs={obs} idx={idx} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 pt-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <p className="text-xs font-semibold tracking-widest text-muted-foreground">{titulo}</p>
        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {observaciones.length}
        </span>
      </div>
      <div className="space-y-2">
        {observaciones.map((obs, idx) => (
          <ObservationCard key={obs.id ?? idx} obs={obs} idx={idx} />
        ))}
      </div>
    </div>
  )
}
