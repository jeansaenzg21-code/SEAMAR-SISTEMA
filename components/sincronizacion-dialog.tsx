"use client"

import { useEffect, useRef } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export type NivelEventoSincronizacion =
  | "success"
  | "warning"
  | "info"
  | "error"

export type EventoSincronizacion = {
  id: number
  nivel: NivelEventoSincronizacion
  tipo: string
  mensaje: string
  numeroDocumento: string | null
  motivo: string | null
  fecha: string
}

type OtraSeccion = {
  titulo: string
  href: string
}

type Props = {
  sincronizando: boolean
  documentosDetectados: number
  eventos: EventoSincronizacion[]
  mostrarResumen: boolean
  resumen: any
  otraSeccion?: OtraSeccion | null
  onCerrarResumen: () => void
}

const ICONOS_EVENTO = {
  success: {
    Icon: CheckCircle2,
    clase: "text-green-500",
    fondo: "bg-green-500/10",
  },
  warning: {
    Icon: AlertTriangle,
    clase: "text-yellow-500",
    fondo: "bg-yellow-500/10",
  },
  info: {
    Icon: Info,
    clase: "text-blue-500",
    fondo: "bg-blue-500/10",
  },
  error: {
    Icon: XCircle,
    clase: "text-red-500",
    fondo: "bg-red-500/10",
  },
} as const

function formatearHora(fecha: string) {
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("es-PE", { hour12: false })
}

function ListaEventos({ eventos }: { eventos: EventoSincronizacion[] }) {
  const contenedorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const contenedor = contenedorRef.current
    if (contenedor) {
      contenedor.scrollTop = contenedor.scrollHeight
    }
  }, [eventos])

  return (
    <div
      ref={contenedorRef}
      className="max-h-72 overflow-y-auto space-y-2 pr-1"
    >
      {eventos.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Buscando documentos nuevos en OneDrive...
        </p>
      )}

      {eventos.map((evento) => {
        const config = ICONOS_EVENTO[evento.nivel] ?? ICONOS_EVENTO.info
        const Icon = config.Icon

        return (
          <div
            key={evento.id}
            className={`flex items-start gap-3 rounded-lg border border-border ${config.fondo} px-3 py-2`}
          >
            <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${config.clase}`} />

            <div className="min-w-0 flex-1">
              <p className="text-sm whitespace-pre-line leading-relaxed">
                {evento.mensaje}
              </p>

              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatearHora(evento.fecha)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TarjetaResumen({
  titulo,
  valor,
  color,
}: {
  titulo: string
  valor: number
  color: "green" | "yellow" | "blue" | "red"
}) {
  const estilos = {
    green: "border-green-500/20 bg-green-500/10 text-green-500",
    yellow: "border-yellow-500/20 bg-yellow-500/10 text-yellow-500",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-500",
    red: "border-red-500/20 bg-red-500/10 text-red-500",
  }

  return (
    <div className={`rounded-lg border p-3 ${estilos[color]}`}>
      <p className="text-xs opacity-80">{titulo}</p>
      <p className="text-2xl font-bold mt-1">{valor}</p>
    </div>
  )
}

function ModalResumen({
  eventos,
  resumen,
  otraSeccion,
  onCerrarResumen,
}: {
  eventos: EventoSincronizacion[]
  resumen: any
  otraSeccion?: OtraSeccion | null
  onCerrarResumen: () => void
}) {
  const duplicadas = eventos.filter((e) => e.tipo === "duplicada")
  const descartados = eventos.filter((e) => e.tipo === "descartado")
  const errores = eventos.filter((e) => e.tipo === "error")
  const registradas = eventos.filter((e) => e.tipo === "registrada")

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-xl p-6 w-[34rem] max-w-full">
        <h2 className="text-xl font-bold mb-4">
          Sincronización finalizada
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <TarjetaResumen
            titulo="Facturas registradas"
            valor={registradas.length}
            color="green"
          />
          <TarjetaResumen
            titulo="Facturas duplicadas"
            valor={duplicadas.length}
            color="yellow"
          />
          <TarjetaResumen
            titulo="Documentos descartados"
            valor={descartados.length}
            color="blue"
          />
          <TarjetaResumen
            titulo="Errores"
            valor={errores.length}
            color="red"
          />
        </div>

        {duplicadas.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2">
              Facturas duplicadas
            </h3>

            <div className="space-y-1">
              {duplicadas.map((evento) => (
                <p key={evento.id} className="text-sm font-mono">
                  {evento.numeroDocumento}
                </p>
              ))}
            </div>
          </div>
        )}

        {descartados.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2">
              Documentos descartados
            </h3>

            <div className="space-y-2">
              {descartados.map((evento) => (
                <div key={evento.id}>
                  <p className="text-sm font-mono">
                    {evento.numeroDocumento}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {evento.motivo}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          {otraSeccion && (
            <Button
              variant="outline"
              onClick={() =>
                (window.location.href = otraSeccion.href)
              }
            >
              {otraSeccion.titulo}
            </Button>
          )}

          <Button onClick={onCerrarResumen}>
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SincronizacionDialog({
  sincronizando,
  documentosDetectados,
  eventos,
  mostrarResumen,
  resumen,
  otraSeccion,
  onCerrarResumen,
}: Props) {
  if (sincronizando) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card border rounded-xl p-6 w-[40rem] max-w-full">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />
            <h2 className="text-xl font-bold">
              Sincronizando documentos
            </h2>
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            Se detectaron {documentosDetectados} documentos nuevos
          </p>

          <ListaEventos eventos={eventos} />
        </div>
      </div>
    )
  }

  if (mostrarResumen && resumen) {
    return (
      <ModalResumen
        eventos={eventos}
        resumen={resumen}
        otraSeccion={otraSeccion}
        onCerrarResumen={onCerrarResumen}
      />
    )
  }

  return null
}
