import { MessageSquare } from "lucide-react"

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

export function ObservationHistory({
  observaciones,
  variant = "card",
  titulo = "HISTORIAL DE OBSERVACIONES",
}: ObservationHistoryProps) {
  if (observaciones.length === 0) {
    if (variant === "card") {
      return (
        <div className="space-y-3 pt-4">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground">{titulo}</p>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">No hay observaciones registradas.</p>
          </div>
        </div>
      )
    }
    return null
  }

  if (variant === "timeline") {
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground">{titulo}</p>
        <div className="border-l space-y-4">
          {observaciones.map((obs, idx) => (
            <div key={obs.id ?? idx} className="pl-4">
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm">{obs.observacion}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {obs.usuario || "Sistema"} · {obs.fecha ? obs.fecha.split("T")[0] : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 pt-4">
      <p className="text-xs font-semibold tracking-widest text-muted-foreground">{titulo}</p>
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="space-y-3">
          {observaciones.map((obs) => (
            <div key={obs.id} className="rounded-md border border-border bg-background p-3">
              <p className="text-sm font-medium">
                {obs.tipo === "SISTEMA"
                  ? "Observación del sistema"
                  : "Observación de usuario"}
              </p>
              <p className="text-sm mt-1">{obs.observacion}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Estado: {obs.estado} · {obs.fecha}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
