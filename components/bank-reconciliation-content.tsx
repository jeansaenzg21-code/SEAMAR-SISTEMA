"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Upload,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Building2,
  Calendar,
  Hash,
  X,
  Check,
  Filter,
  RefreshCw,
  Download,
  Inbox,
  Loader2,
  Landmark,
  History as HistoryIcon,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TIPADO
// ─────────────────────────────────────────────────────────────────────────────

export type Moneda = "PEN" | "USD";

export type EstadoMovimiento =
  | "conciliado"
  | "observacion"
  | "diferencia"
  | "pendiente";

export type TipoMovimiento = "credito" | "debito";

export type EstadoConciliacion = "completado" | "en_proceso" | "con_observaciones";

export type EstadoExtracto = "cargado" | "procesando" | "error";

// CORRECCIÓN 1: origen agregado a Coincidencia; cliente y proveedor opcionales
// según el tipo de cuenta que devuelve el backend Python.
export type OrigenConciliacion = "CUENTA_POR_COBRAR" | "CUENTA_POR_PAGAR";

export interface Coincidencia {
  id: string;
  origen: OrigenConciliacion;
  cliente?: string;   // presente cuando origen = CUENTA_POR_COBRAR
  proveedor?: string; // presente cuando origen = CUENTA_POR_PAGAR
  proyecto: string;
  documento: string;
  descripcion?: string;
  fecha: string;
  monto: number;
}

/** Movimiento individual de un extracto bancario. */
export interface MovimientoBancario {
  id: string;
  fecha: string;
  referencia: string;
  descripcion: string;
  monto: number;
  moneda: Moneda;
  estado: EstadoMovimiento;
  tipo: TipoMovimiento;
  banco?: string;
  coincidencias?: Coincidencia[];
  diferencia?: number;
  causaDiferencia?: string;
}

/** Registro de una conciliación ya ejecutada (histórico). */
export interface HistorialConciliacion {
  id: string;
  banco: string;
  fecha: string;
  moneda: Moneda;
  totalMovimientos: number;
  estado: EstadoConciliacion;
}

/** Metadata del extracto bancario cargado por el usuario. */
export interface ExtractoCargado {
  nombreArchivo: string;
  banco?: string;
  periodo?: string;
  moneda: Moneda;
  totalMovimientos?: number;
  estado: EstadoExtracto;
  mensajeError?: string;
}

interface RawCoincidencia {
  id?: string;
  origen?: OrigenConciliacion;
  cliente?: string;
  proveedor?: string;
  proyecto?: string;
  documento?: string;
  descripcion?: string;
  fecha?: string;
  monto?: number;
}

interface RawMovimientoBancario {
  id?: string;
  fecha?: string;
  referencia?: string;
  descripcion?: string;
  monto?: number;
  moneda?: Moneda;
  estado?: EstadoMovimiento;
  tipo?: TipoMovimiento;
  banco?: string;
  coincidencias?: RawCoincidencia[];
  diferencia?: number;
  causaDiferencia?: string;
}

interface RawHistorialConciliacion {
  id?: string;
  banco?: string;
  archivoNombre?: string;
  fecha?: string;
  moneda?: Moneda;
  totalMovimientos?: number;
  estado?: string;
}

interface ApiErrorResponse {
  success?: false;
  message?: string;
  error?: string;
}

interface BankReconciliationApiResponse {
  success: boolean;
  totalMovimientos?: number;
  banco?: string;
  periodo?: string;
  movimientos?: RawMovimientoBancario[];
}

interface BankReconciliationHistoryApiResponse {
  success: boolean;
  historial?: RawHistorialConciliacion[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (amount: number, currency: Moneda) => {
  const symbol = currency === "PEN" ? "S/" : "$";
  return `${symbol} ${amount.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const statusMeta: Record<
  EstadoMovimiento,
  { label: string; color: string; bg: string; ring: string; icon: React.ReactNode }
> = {
  conciliado: {
    label: "Conciliado",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    ring: "border-l-emerald-500/60",
    icon: <CheckCircle2 size={12} />,
  },
  observacion: {
    label: "Observación",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    ring: "border-l-amber-500/60",
    icon: <AlertTriangle size={12} />,
  },
  diferencia: {
    label: "Diferencia",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
    ring: "border-l-rose-500/60",
    icon: <XCircle size={12} />,
  },
  pendiente: {
    label: "Pendiente",
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    ring: "border-l-slate-500/60",
    icon: <Clock size={12} />,
  },
};

const statusHistoryMeta: Record<
  EstadoConciliacion,
  { label: string; color: string; bg: string; ring: string }
> = {
  completado: {
    label: "Completado",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    ring: "border-l-emerald-500/60",
  },
  en_proceso: {
    label: "En proceso",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    ring: "border-l-amber-500/60",
  },
  con_observaciones: {
    label: "Con observaciones",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
    ring: "border-l-rose-500/60",
  },
};

const PROGRESS_WIDTH_CLASS: Record<number, string> = {
  0: "w-[0%]",
  5: "w-[5%]",
  10: "w-[10%]",
  15: "w-[15%]",
  20: "w-[20%]",
  25: "w-[25%]",
  30: "w-[30%]",
  35: "w-[35%]",
  40: "w-[40%]",
  45: "w-[45%]",
  50: "w-[50%]",
  55: "w-[55%]",
  60: "w-[60%]",
  65: "w-[65%]",
  70: "w-[70%]",
  75: "w-[75%]",
  80: "w-[80%]",
  85: "w-[85%]",
  90: "w-[90%]",
  95: "w-[95%]",
  100: "w-[100%]",
};

const progressWidthClass = (pct: number) => {
  const step = Math.min(100, Math.max(0, Math.round(pct / 5) * 5));
  return PROGRESS_WIDTH_CLASS[step];
};

// CORRECCIÓN 2: mapCoincidenciaFromApi — nuevo mapper que normaliza cada
// coincidencia del backend aplicando fallbacks seguros para origen, cliente,
// proveedor, proyecto y documento.
function mapCoincidenciaFromApi(
  c: any,
  index: number
): Coincidencia {

  return {
    id:
      String(
        c.id ??
        c.coincidencia_id ??
        `C-${index}`
      ),

    origen:
      c.origen ??
      "CUENTA_POR_COBRAR",

    cliente:
      c.cliente,

    proveedor:
      c.proveedor,

    proyecto:
      c.proyecto ??
      "-",

    documento:
      c.documento ??
      "-",

    descripcion:
      c.descripcion ?? "",

    fecha:
      c.fecha ?? "",

    monto:
      Number(c.monto ?? 0),
  };
}

function mapMovimientoFromApi(
  m: RawMovimientoBancario,
  index: number,
  fallbackMoneda: Moneda
): MovimientoBancario {
  return {
    id:             m.id ?? `M-${index}`,
    fecha:          m.fecha ?? "",
    referencia:     m.referencia ?? "-",
    descripcion:    m.descripcion ?? "-",
    monto:
  isNaN(Number(m.monto))
    ? 0
    : Number(m.monto),
    moneda:         m.moneda ?? fallbackMoneda,
    estado:         m.estado ?? "pendiente",
    tipo:           m.tipo ?? "debito",
    banco:          m.banco,
    // CORRECCIÓN 3: las coincidencias ahora pasan por mapCoincidenciaFromApi
    // en vez de copiarse crudas, garantizando que `origen` siempre exista.
    coincidencias:  (m.coincidencias ?? []).map(mapCoincidenciaFromApi),
    diferencia:     m.diferencia,
    causaDiferencia: m.causaDiferencia,
  };
}

function mapHistorialFromApi(
  h: RawHistorialConciliacion,
  index: number,
  fallbackMoneda: Moneda
): HistorialConciliacion {

  let estado: EstadoConciliacion = "en_proceso";

  if (
    h.estado === "PROCESADA" ||
    h.estado === "completado"
  ) {
    estado = "completado";
  }

  if (
    h.estado === "OBSERVACION" ||
    h.estado === "con_observaciones"
  ) {
    estado = "con_observaciones";
  }

  const fechaFormateada = h.fecha
  ? new Date(h.fecha).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  : "";

  return {
    id: h.id ?? `H-${index}`,
    banco:
  h.archivoNombre ??
  h.banco ??
  `Conciliación ${index + 1}`,
    fecha: fechaFormateada,
    moneda: h.moneda ?? fallbackMoneda,
    totalMovimientos:
      typeof h.totalMovimientos === "number"
        ? h.totalMovimientos
        : 0,
    estado,
  };
}
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
  } catch {
    // body no era JSON válido
  }
  switch (response.status) {
    case 400: return "Solicitud inválida: revisa el formato del extracto.";
    case 404: return "El servicio de conciliación bancaria no está disponible.";
    case 500: return "Error interno del servidor al procesar el extracto.";
    default:  return `Error inesperado (${response.status}) al procesar el extracto.`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CORRECCIÓN 4: OrigenBadge — badge visual reutilizable para CxC / CxP.
// Usado en los paneles conciliado, observacion y diferencia.
// ─────────────────────────────────────────────────────────────────────────────

function OrigenBadge({ origen }: { origen: OrigenConciliacion }) {
  const esCobrar = origen === "CUENTA_POR_COBRAR";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-widest",
        esCobrar
          ? "bg-emerald-400/10 text-emerald-400 border border-emerald-500/20"
          : "bg-violet-400/10 text-violet-400 border border-violet-500/20"
      )}
    >
      {esCobrar
        ? <ArrowDownCircle size={10} />
        : <ArrowUpCircle size={10} />}
      {esCobrar ? "Cuenta por Cobrar" : "Cuenta por Pagar"}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CORRECCIÓN 5: CoincidenciaCard — card reutilizable que renderiza los campos
// correctos según origen (cliente vs proveedor) con el badge de origen.
// Usada en los tres paneles: conciliado, observacion y diferencia.
// ─────────────────────────────────────────────────────────────────────────────

function CoincidenciaCard({
  match,
  moneda,
  accionLabel,
  accionColor,
  onAccion,
  borderColor,
  bgColor,
}: {
  match: Coincidencia;
  moneda: Moneda;
  accionLabel?: string;
  accionColor?: string;
  onAccion?: () => void;
  borderColor?: string;
  bgColor?: string;
}) {
  const esCobrar = match.origen === "CUENTA_POR_COBRAR";
  const nombrePrincipal = esCobrar ? match.cliente : match.proveedor;
  const labelPrincipal  = esCobrar ? "Cliente" : "Proveedor";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3",
        borderColor ?? "border-white/[0.06]",
        bgColor ?? "bg-white/[0.02]"
      )}
    >
      {/* Badge de origen */}
      <OrigenBadge origen={match.origen} />

      {/* Nombre principal + monto */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">
            {labelPrincipal}
          </div>
          <div className="text-sm font-medium text-slate-200 truncate">
            {nombrePrincipal ?? "-"}
          </div>
        </div>
        <div className="text-sm font-semibold text-emerald-400 tabular-nums whitespace-nowrap">
          {fmt(match.monto, moneda)}
        </div>
      </div>

      {/* Proyecto + documento + fecha */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <div className="text-[10px] text-slate-600 uppercase tracking-wider">Proyecto</div>
          <div className="text-xs text-slate-400 truncate">{match.proyecto}</div>
        </div>
        <div className="space-y-0.5">
          <div className="text-[10px] text-slate-600 uppercase tracking-wider">
            {esCobrar ? "Factura" : "Documento"}
          </div>
          <div className="text-xs text-slate-400 font-mono">{match.documento}</div>
        </div>
      </div>

      <div className="text-[11px] text-slate-600">
  {match.fecha
    ? new Date(match.fecha).toLocaleDateString(
        "es-PE",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      )
    : "-"}
</div>

      {/* Glosa (descripción) — solo si el backend la envía */}
      {match.descripcion && (
        <div className="space-y-0.5">
          <div className="text-[10px] text-slate-600 uppercase tracking-wider">Glosa</div>
          <div className="text-xs text-slate-400">{match.descripcion}</div>
        </div>
      )}

      {/* Acción opcional (Seleccionar en observacion) */}
      {accionLabel && onAccion && (
        <button
          onClick={onAccion}
          className={cn(
            "w-full mt-1 py-1.5 rounded-lg text-xs font-medium border transition-all",
            accionColor ??
              "border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/15"
          )}
        >
          {accionLabel}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO VACÍO
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-3 text-center px-6">
      <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-slate-500">
        {icon}
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium text-slate-300">{title}</div>
        {description && (
          <div className="text-xs text-slate-600 max-w-xs">{description}</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES (sin cambios estructurales salvo los paneles de detalle)
// ─────────────────────────────────────────────────────────────────────────────

function CurrencyToggle({
  value,
  onChange,
}: {
  value: Moneda;
  onChange: (c: Moneda) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d1117] border border-white/[0.06]">
      {(["PEN", "USD"] as Moneda[]).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={cn(
            "relative px-5 py-2 rounded-lg text-sm font-semibold tracking-widest transition-all duration-300",
            value === c ? "text-white" : "text-slate-500 hover:text-slate-300"
          )}
        >
          {value === c && (
            <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-white/[0.08] shadow-lg" />
          )}
          <span className="relative flex items-center gap-2">
            <span className="text-xs opacity-60">{c === "PEN" ? "S/" : "$"}</span>
            {c}
          </span>
        </button>
      ))}
    </div>
  );
}

function SummaryCard({
  status,
  count,
  total,
  currency,
  active,
  onClick,
}: {
  status: EstadoMovimiento;
  count: number;
  total: number;
  currency: Moneda;
  active: boolean;
  onClick: () => void;
}) {
  const meta = statusMeta[status];
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex-1 min-w-0 rounded-2xl border p-5 text-left transition-all duration-200",
        active
          ? "border-white/15 bg-white/[0.04] shadow-lg shadow-black/20"
          : "border-white/[0.05] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03]"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full",
            meta.color,
            meta.bg
          )}
        >
          {meta.icon}
          {meta.label}
        </span>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-white/40" />}
      </div>
      <div className="text-2xl font-light text-white tabular-nums">
        {count}
        <span className="text-sm text-slate-500 ml-1 font-normal">mov.</span>
      </div>
      <div className={cn("text-sm mt-1 font-medium tabular-nums", meta.color)}>
        {fmt(total, currency)}
      </div>
    </button>
  );
}

function ProgressBar({ movimientos }: { movimientos: MovimientoBancario[] }) {
  const total        = movimientos.length;
  const conciliados  = movimientos.filter((m) => m.estado === "conciliado").length;
  const observaciones = movimientos.filter((m) => m.estado === "observacion").length;
  const diferencias  = movimientos.filter((m) => m.estado === "diferencia").length;
  const pendientes   = movimientos.filter((m) => m.estado === "pendiente").length;

  const pct = (n: number) => (total ? (n / total) * 100 : 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Avance de conciliación</span>
        <span className="text-white font-medium tabular-nums">
          {total ? Math.round(pct(conciliados)) : 0}% conciliado
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] flex overflow-hidden gap-px">
        <div className={cn("h-full bg-emerald-500 rounded-l-full transition-all duration-700", progressWidthClass(pct(conciliados)))} />
        <div className={cn("h-full bg-amber-500 transition-all duration-700",              progressWidthClass(pct(observaciones)))} />
        <div className={cn("h-full bg-rose-500 transition-all duration-700",               progressWidthClass(pct(diferencias)))} />
        <div className={cn("h-full bg-slate-600 rounded-r-full transition-all duration-700", progressWidthClass(pct(pendientes)))} />
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />{conciliados} conc.</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />{observaciones} obs.</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" />{diferencias} dif.</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-600" />{pendientes} pend.</span>
      </div>
    </div>
  );
}

function MovementRow({
  movimiento,
  selected,
  onClick,
  esReciente,
}: {
  movimiento: MovimientoBancario;
  selected: boolean;
  onClick: () => void;
  esReciente: boolean;
}) {
  const meta = statusMeta[movimiento.estado];
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-5 py-4 text-left transition-all duration-150 border-b border-l-2 border-white/[0.04] last:border-b-0",
        meta.ring,
        selected ? "bg-white/[0.05]" : "hover:bg-white/[0.025]"
      )}
    >
      <div className="flex flex-col items-start gap-0.5 min-w-[90px]">
        <span className="text-xs text-slate-400 tabular-nums">{movimiento.fecha}</span>
        <span className="text-[11px] text-slate-600 font-mono">{movimiento.referencia}</span>
      </div>
      <div className="flex items-center gap-2 min-w-0">

  {esReciente && (
    <span
      className="
        h-2
        w-2
        rounded-full
        bg-sky-400
        animate-pulse
        flex-shrink-0
      "
    />
  )}

        <span className="text-sm text-slate-200 truncate">{movimiento.descripcion}</span>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className={cn("text-sm font-medium tabular-nums", movimiento.tipo === "credito" ? "text-emerald-400" : "text-slate-200")}>
          {movimiento.tipo === "credito" ? "+" : "−"} {fmt(movimiento.monto, movimiento.moneda)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap", meta.color, meta.bg)}>
          {meta.icon}
          {meta.label}
        </span>
        <ChevronRight size={14} className={cn("text-slate-600 transition-transform", selected && "text-slate-400 rotate-90")} />
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CORRECCIÓN 6: DifferencePanel — ahora usa CoincidenciaCard, que detecta
// origen y muestra cliente o proveedor correctamente.
// ─────────────────────────────────────────────────────────────────────────────

function DifferencePanel({ movimiento }: { movimiento: MovimientoBancario }) {
  const match = movimiento.coincidencias?.[0];
  const causeOptions = ["Comisión bancaria", "ITF", "Comisión SWIFT", "Tipo de cambio", "Ajuste"];

  if (!match) return null;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-4">
        <div className="flex items-center gap-2 text-rose-400 text-xs font-medium uppercase tracking-widest">
          <XCircle size={12} />
          Diferencia detectada
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Monto Sistema</div>
            <div className="text-sm font-medium text-slate-200 tabular-nums">
              {fmt(match.monto, movimiento.moneda)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Monto Banco</div>
            <div className="text-sm font-medium text-white tabular-nums">
              {fmt(movimiento.monto, movimiento.moneda)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Diferencia</div>
            <div className="text-sm font-semibold text-rose-400 tabular-nums">
              {fmt(movimiento.diferencia ?? 0, movimiento.moneda)}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Posible causa</div>
          <div className="flex flex-wrap gap-1.5">
            {causeOptions.map((c) => (
              <button
                key={c}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-lg border transition-all",
                  movimiento.causaDiferencia === c
                    ? "border-rose-500/50 bg-rose-500/15 text-rose-300"
                    : "border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-slate-300 hover:border-white/10"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Coincidencia con badge de origen */}
      <CoincidenciaCard
        match={match}
        moneda={movimiento.moneda}
        borderColor="border-rose-500/20"
        bgColor="bg-rose-500/[0.04]"
      />

      <button className="w-full py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium hover:bg-rose-500/15 transition-all">
        Aprobar diferencia
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CORRECCIÓN 7: ObservationPanel — ahora usa CoincidenciaCard con acción
// "Seleccionar" y muestra origen por cada coincidencia.
// ─────────────────────────────────────────────────────────────────────────────

function ObservationPanel({
  movimiento,
  onSeleccionarCoincidencia,
}: {
  movimiento: MovimientoBancario;
  onSeleccionarCoincidencia: (
    movimientoId: number,
    documentoId: number,
    origen: string
  ) => void;
}) {
  const coincidencias = movimiento.coincidencias ?? [];

  console.log(
  "DETAIL",
  movimiento.id,
  movimiento.estado,
  coincidencias
);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-amber-400 text-xs font-medium uppercase tracking-widest">
        <AlertTriangle size={12} />
        Requiere revisión
      </div>
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1">
        <div className="text-sm text-amber-300 font-medium">
          {coincidencias.length} coincidencia{coincidencias.length !== 1 ? "s" : ""} encontrada{coincidencias.length !== 1 ? "s" : ""}
        </div>
        <div className="text-xs text-slate-500">
          El sistema no puede resolver automáticamente. Selecciona la coincidencia correcta.
        </div>
      </div>
      <div className="space-y-2">
        {coincidencias.map((match) => (
          <CoincidenciaCard
  key={match.id}
  match={match}
  moneda={movimiento.moneda}
  accionLabel="Seleccionar esta coincidencia"
  accionColor="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
  onAccion={() =>
    onSeleccionarCoincidencia(
      Number(movimiento.id),
      Number(match.id),
      match.origen
    )
  }
/>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CORRECCIÓN 8: MovementDetail — el bloque "pendiente" ahora detecta si hay
// coincidencias y las muestra en vez de "Sin conciliar". Solo muestra el
// mensaje de sin coincidencias si coincidencias.length === 0.
// ─────────────────────────────────────────────────────────────────────────────

function MovementDetail({
  movimiento,
  onClose,
  onSeleccionarCoincidencia,
}: {
  movimiento: MovimientoBancario;
  onClose: () => void;
  onSeleccionarCoincidencia: (
    movimientoId: number,
    documentoId: number,
    origen: string
  ) => void;
}) {
  const coincidencias = movimiento.coincidencias ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
        <div className="space-y-0.5">
          <div className="text-xs text-slate-500 uppercase tracking-widest">Movimiento bancario</div>
          <div className="text-sm font-mono text-slate-300">{movimiento.referencia}</div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Metadata del movimiento */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            {[
  {
    label: "Fecha",
    value: new Date(
      movimiento.fecha
    ).toLocaleDateString(
      "es-PE",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    ),
  },
  {
    label: "Referencia",
    value: movimiento.referencia,
  },
  {
    label: "Moneda",
    value: movimiento.moneda,
  },
  {
    label: "Descripción",
    value: movimiento.descripcion,
  },

].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <div className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</div>
                <div className="text-sm text-slate-200">{value}</div>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <span className="text-xs text-slate-500">Importe</span>
            <span className={cn("text-xl font-light tabular-nums", movimiento.tipo === "credito" ? "text-emerald-400" : "text-white")}>
              {movimiento.tipo === "credito" ? "+" : "−"} {fmt(movimiento.monto, movimiento.moneda)}
            </span>
          </div>
        </div>

        <div className="border-t border-white/[0.05]" />

        {/* ── Panel OBSERVACIÓN ── */}
        {movimiento.estado === "observacion" && (
          <ObservationPanel
  movimiento={movimiento}
  onSeleccionarCoincidencia={
    onSeleccionarCoincidencia
  }
/>
        )}

        {/* ── Panel DIFERENCIA ── */}
        {movimiento.estado === "diferencia" && movimiento.diferencia !== undefined && (
          <DifferencePanel movimiento={movimiento} />
        )}

        {/* ── Panel CONCILIADO ── */}
        {movimiento.estado === "conciliado" && coincidencias.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium uppercase tracking-widest">
              <CheckCircle2 size={12} />
              Coincidencia confirmada
            </div>
            {coincidencias.map((match) => (
              <CoincidenciaCard
                key={match.id}
                match={match}
                moneda={movimiento.moneda}
                borderColor="border-emerald-500/20"
                bgColor="bg-emerald-500/5"
              />
            ))}
          </div>
        )}

        {/* ── Panel PENDIENTE ──
            CORRECCIÓN 8: Si hay coincidencias las mostramos como sugerencias.
            Si no hay ninguna, mostramos el panel original de acción manual. */}
        {movimiento.estado === "pendiente" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-widest">
              <Clock size={12} />
              Sin conciliar
            </div>

            {coincidencias.length > 0 ? (
              <>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-slate-500">
                  Se encontraron posibles coincidencias. Revisa y confirma manualmente.
                </div>
                <div className="space-y-2">
                  {coincidencias.map((match) => (
                    <CoincidenciaCard
                      key={match.id}
                      match={match}
                      moneda={movimiento.moneda}
                      accionLabel="Confirmar como coincidencia"
                      accionColor="border-slate-500/30 text-slate-300 hover:bg-white/[0.04]"
                      onAccion={() => {/* TODO: confirmar manualmente */}}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-slate-500">
                  No se encontraron coincidencias en el sistema. Asigna manualmente o marca como excepción.
                </div>
                <div className="grid grid-cols-2 gap-2">
                  
                  <button className="py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:border-white/15 hover:text-slate-200 transition-all">
                    Asignar manual
                  </button>
                  <button className="py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 text-sm hover:bg-white/[0.06] transition-all">
                    Marcar excepción
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ExtractoSummaryCard({
  extracto,
  onClear,
}: {
  extracto: ExtractoCargado;
  onClear: () => void;
}) {
  const isError      = extracto.estado === "error";
  const isProcessing = extracto.estado === "procesando";

  return (
    <div className={cn("rounded-2xl border overflow-hidden", isError ? "border-rose-500/20 bg-rose-500/[0.04]" : "border-white/[0.06] bg-white/[0.02]")}>
      <div className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.05]">
        <div className={cn("p-2.5 rounded-xl border", isError ? "bg-rose-500/10 border-rose-500/20" : "bg-emerald-500/10 border-emerald-500/20")}>
          {isProcessing
            ? <Loader2 size={18} className="text-amber-400 animate-spin" />
            : <FileText size={18} className={isError ? "text-rose-400" : "text-emerald-400"} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-200 truncate">{extracto.nombreArchivo}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {isProcessing && "Procesando extracto…"}
            {isError && (extracto.mensajeError ?? "Error al procesar el extracto")}
            {extracto.estado === "cargado" && "Extracto bancario"}
          </div>
        </div>
        {extracto.estado === "cargado" && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium whitespace-nowrap">
            <CheckCircle2 size={12} />
            Cargado
          </span>
        )}
        <button onClick={onClear} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-4 px-5 py-4">
        {[
          { label: "Banco",       value: extracto.banco,            icon: <Building2 size={11} /> },
          { label: "Periodo",     value: extracto.periodo,          icon: <Calendar size={11} /> },
          { label: "Moneda",      value: extracto.moneda,           icon: null },
          { label: "Movimientos", value: typeof extracto.totalMovimientos === "number" ? String(extracto.totalMovimientos) : undefined, icon: <Hash size={11} /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wider">
              {icon}{label}
            </div>
            <div className="text-sm text-slate-200 tabular-nums">{value ?? "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UploadZone({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200",
        dragging
          ? "border-slate-400 bg-white/[0.04]"
          : "border-white/[0.08] bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.025]"
      )}
    >
      <input ref={inputRef} type="file" accept=".xlsx,.csv,.ofx,.qfx" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
        <Upload size={22} className="text-slate-400" />
      </div>
      <div className="text-center space-y-1">
        <div className="text-sm text-slate-300 font-medium">Arrastra el extracto bancario aquí</div>
        <div className="text-xs text-slate-600">.xlsx, .csv, .ofx, .qfx — máx. 50 MB</div>
      </div>
      <div className="text-xs text-slate-600 border border-white/[0.06] px-3 py-1.5 rounded-lg hover:border-white/10 transition-colors">
        Seleccionar archivo
      </div>
    </div>
  );
}

function HistorySection({
  historial,
  isLoading,
  onOpenHistorial,
}: {
  historial: HistorialConciliacion[];
  isLoading: boolean;
  onOpenHistorial: (
    id: string
  ) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400">
            <HistoryIcon size={13} />
          </div>
          <h2 className="text-xs text-slate-500 uppercase tracking-widest">
            Historial de conciliaciones
          </h2>
        </div>
        <span className="text-xs text-slate-600 tabular-nums">{historial.length} registros</span>
      </div>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center text-slate-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : historial.length === 0 ? (
        <EmptyState
          icon={<Inbox size={18} />}
          title="No existen conciliaciones"
          description="Cuando ejecutes una conciliación, aparecerá aquí su registro histórico."
        />
      ) : (
        <div>
          {historial.map((h) => {
            const meta = statusHistoryMeta[h.estado];
            return (
              <div
  key={h.id}
  onClick={() =>
    onOpenHistorial(h.id)
  }
  className={cn(
                  "flex items-center gap-4 px-5 py-4 border-b border-l-2 border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-all cursor-pointer",
                  meta.ring
                )}
              >
                <div className="p-2 rounded-lg bg-white/[0.04]">
                  <Building2 size={14} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 truncate">{h.banco}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
                    <span>{h.fecha}</span>
                    <span>·</span>
                    <span className={cn("font-mono text-[10px] px-1.5 py-0.5 rounded", h.moneda === "PEN" ? "text-blue-400 bg-blue-400/10" : "text-green-400 bg-green-400/10")}>
                      {h.moneda}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", meta.color, meta.bg)}>
                    {meta.label}
                  </span>
                  <span className="text-xs text-slate-600 tabular-nums">{h.totalMovimientos} mov.</span>
                </div>
                <ChevronRight size={14} className="text-slate-700 flex-shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function BankReconciliationContent() {
  const [currency, setCurrency]               = useState<Moneda>("PEN");
  const [activeFilter, setActiveFilter]       = useState<EstadoMovimiento | null>(null);
  const [selectedMovimiento, setSelectedMovimiento] = useState<MovimientoBancario | null>(null);

  const [movimientos, setMovimientos]         = useState<MovimientoBancario[]>([]);
  const [historial, setHistorial]             = useState<HistorialConciliacion[]>([]);
  const [historialSeleccionado, setHistorialSeleccionado] =useState<string | null>(null);
  const [conciliadosRecientes,setConciliadosRecientes] = useState<number[]>([]);
  const [extracto, setExtracto]               = useState<ExtractoCargado | null>(null);
  const [isLoadingMovimientos, setIsLoadingMovimientos] = useState(false);
  const [isLoadingHistorial, setIsLoadingHistorial]     = useState(false);

  const handleProcess = useCallback(
    async (file: File) => {
      setMovimientos([]);
      setSelectedMovimiento(null);
      setIsLoadingMovimientos(true);
      setExtracto({ nombreArchivo: file.name, moneda: currency, estado: "procesando" });

      try {
        const formData = new FormData();
        formData.append("archivo", file);

        const response = await fetch("/api/bank-reconciliation", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(await extractErrorMessage(response));
        }

        let data: BankReconciliationApiResponse;
        try {
          data = await response.json();
        } catch {
          throw new Error("La respuesta del servidor no es válida.");
        }

        if (!data.success) {
          throw new Error("El backend reportó un error al procesar el extracto.");
        }

        const nuevosMovimientos = (data.movimientos ?? []).map((m, index) =>
          mapMovimientoFromApi(m, index, currency)
        );

        setMovimientos(nuevosMovimientos);
        setSelectedMovimiento(nuevosMovimientos[0] ?? null);
        setExtracto({
          nombreArchivo:   file.name,
          banco:           data.banco,
          periodo:         data.periodo,
          moneda:          currency,
          estado:          "cargado",
          totalMovimientos: data.totalMovimientos ?? nuevosMovimientos.length,
        });
      } catch (error) {
        console.error(error);
        setExtracto({
          nombreArchivo: file.name,
          moneda:        currency,
          estado:        "error",
          mensajeError:  error instanceof Error ? error.message : "No se pudo procesar el extracto bancario.",
        });
      } finally {
        setIsLoadingMovimientos(false);
      }
    },
    [currency]
  );

  const handleFileSelected = useCallback((file: File) => { handleProcess(file); }, [handleProcess]);

  const handleClearExtracto = useCallback(() => {
    setExtracto(null);
    setMovimientos([]);
    setSelectedMovimiento(null);
    setActiveFilter(null);
  }, []);

  const handleExport = async () => {

  try {

    const response = await fetch(
      "/api/bank-reconciliation/export",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({

          banco: extracto?.banco,

          periodo: extracto?.periodo,

          moneda: currency,

          movimientos,

        }),
      }
    )

    if (!response.ok) {
      throw new Error("No se pudo exportar.")
    }

    const blob = await response.blob()

    const url =
      window.URL.createObjectURL(blob)

    const link =
      document.createElement("a")

    link.href = url

    link.download =
      `SEAMAR_CONCILIACION_${new Date()
        .toISOString()
        .slice(0,10)}.xlsx`

    document.body.appendChild(link)

    link.click()

    link.remove()

    window.URL.revokeObjectURL(url)

  } catch (error) {

    console.error(error)

    alert(
      "Error al exportar la conciliación."
    )

  }

}

  const abrirHistorial = async (
  conciliacionId: string
) => {

  try {

    const response =
      await fetch(
        `/api/bank-reconciliation/${conciliacionId}`
      );

    const data =
      await response.json();

    console.log(
      "HISTORIAL CARGADO",
      data
    );

    console.log(
  "MOVIMIENTOS",
  data.movimientos?.length
);

console.log(
  "COINCIDENCIAS",
  data.coincidencias?.length
);

    const movimientosHistorial =
  (data.movimientos ?? []).map(
    (m: any, index: number) => {

      const coincidenciasMovimiento =
  (data.coincidencias ?? [])
    .filter(
      (c: any) =>
        Number(c.movimiento_id) === Number(m.id)
    );

    if (coincidenciasMovimiento.length > 0) {
  console.log("MATCH", {
    movimiento: m.id,
    coincidencias: coincidenciasMovimiento,
  });
}

if (coincidenciasMovimiento.length > 0) {
  console.log(
    "COINCIDENCIA COMPLETA",
    JSON.stringify(
      coincidenciasMovimiento[0],
      null,
      2
    )
  );
}

console.log(
  "COINCIDENCIA EJEMPLO",
  data.coincidencias?.[0]
);

console.log(
  "COINCIDENCIAS",
  data.coincidencias?.length
);

      return mapMovimientoFromApi(
        {
          ...m,
          coincidencias:
            coincidenciasMovimiento
        },
        index,
        currency
      );

    }
  );

  console.log(
  "PRIMER MOVIMIENTO",
  movimientosHistorial[0]
);

const movimientoConciliado =
  movimientosHistorial.find(
    (m: any) =>
      m.coincidencias?.length > 0
  );

console.log(
  "MOVIMIENTO CONCILIADO",
  JSON.stringify(
    movimientoConciliado,
    null,
    2
  )
);
    setMovimientos(
      movimientosHistorial
    );

    const primerConciliado =
  movimientosHistorial.find(
    (m: any) => m.coincidencias?.length
  );

setSelectedMovimiento(
  primerConciliado ??
  movimientosHistorial[0] ??
  null
);

    setHistorialSeleccionado(
      conciliacionId
    );

  } catch (error) {

    console.error(error);

  }

};

const seleccionarCoincidencia = async (
  movimientoId: number,
  documentoId: number,
  origen: string
) => {

  try {

    const response =
      await fetch(
        "/api/bank-reconciliation/select-match",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            movimientoId,
            documentoId,
            origen,
          }),
        }
      );

    const data =
      await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    if (historialSeleccionado) {

      await abrirHistorial(
        historialSeleccionado
      );

    }


    setConciliadosRecientes(prev => [
  ...prev,
  movimientoId
]);

  } catch (error) {

    console.error(error);

  }

};

  const handleCurrencyChange = useCallback((nuevaMoneda: Moneda) => {
    setCurrency(nuevaMoneda);
    setExtracto(null);
    setMovimientos([]);
    setSelectedMovimiento(null);
    setActiveFilter(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHistorial() {
      setIsLoadingHistorial(true);
      try {
        const response = await fetch(`/api/bank-reconciliation/history?moneda=${currency}`);
        if (response.status === 404) { if (!cancelled) setHistorial([]); return; }
        if (!response.ok) { throw new Error(await extractErrorMessage(response)); }
        const data: BankReconciliationHistoryApiResponse = await response.json();
        const nuevoHistorial = (data.historial ?? []).map((h, index) => mapHistorialFromApi(h, index, currency));
        if (!cancelled) setHistorial(nuevoHistorial);
      } catch (error) {
        console.error("No se pudo cargar el historial de conciliaciones:", error);
        if (!cancelled) setHistorial([]);
      } finally {
        if (!cancelled) setIsLoadingHistorial(false);
      }
    }

    loadHistorial();
    return () => { cancelled = true; };
  }, [currency]);

  const filtered = useMemo(
    () => activeFilter ? movimientos.filter((m) => m.estado === activeFilter) : movimientos,
    [movimientos, activeFilter]
  );

  const summary = useMemo<Record<EstadoMovimiento, MovimientoBancario[]>>(
    () => ({
      conciliado:  movimientos.filter((m) => m.estado === "conciliado"),
      observacion: movimientos.filter((m) => m.estado === "observacion"),
      diferencia:  movimientos.filter((m) => m.estado === "diferencia"),
      pendiente:   movimientos.filter((m) => m.estado === "pendiente"),
    }),
    [movimientos]
  );

  const totalFor = (list: MovimientoBancario[]) => list.reduce((s, m) => s + m.monto, 0);

  return (
    <div className="min-h-screen bg-[#080c12] text-white font-sans">
      {/* Top Bar */}
      <div className="border-b border-white/[0.06] bg-[#080c12]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400">
              <Landmark size={14} />
            </div>
            <div className="text-base font-semibold text-white tracking-tight">
              Conciliación Bancaria
            </div>
            <span className="text-white/20">·</span>
            <span className="text-sm text-slate-500 capitalize">
              {new Date().toLocaleDateString("es-PE", { month: "long", year: "numeric" })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <CurrencyToggle value={currency} onChange={handleCurrencyChange} />
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-slate-400 hover:text-slate-200 hover:border-white/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={movimientos.length === 0}
            >
              <RefreshCw size={13} />
              Ejecutar
            </button>
            <button
  onClick={handleExport}
  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-slate-400 hover:text-slate-200 hover:border-white/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
  disabled={movimientos.length === 0}
>
  <Download size={13} />
  Exportar
</button>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-[1600px] mx-auto px-8 py-8 flex gap-8">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Upload */}
          <div className="space-y-3">
            <h2 className="text-xs text-slate-500 uppercase tracking-widest">Extracto bancario</h2>
            {extracto ? (
              <ExtractoSummaryCard extracto={extracto} onClear={handleClearExtracto} />
            ) : (
              <>
                <UploadZone onFileSelected={handleFileSelected} />
                <p className="text-xs text-slate-600 px-1">
                  No hay extractos cargados. Sube un archivo para iniciar la conciliación.
                </p>
              </>
            )}
          </div>

          {/* Progress */}
          {movimientos.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <ProgressBar movimientos={movimientos} />
            </div>
          )}

          {/* Summary cards */}
          <div className="flex gap-3">
            {(["observacion", "diferencia", "pendiente", "conciliado"] as EstadoMovimiento[]).map((s) => (
              <SummaryCard
                key={s}
                status={s}
                count={summary[s].length}
                total={totalFor(summary[s])}
                currency={currency}
                active={activeFilter === s}
                onClick={() => setActiveFilter((prev) => (prev === s ? null : s))}
              />
            ))}
          </div>

          {/* Movements */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xs text-slate-500 uppercase tracking-widest">Movimientos</h2>
                <span className="text-xs text-slate-600 tabular-nums">
                  {filtered.length} de {movimientos.length}
                </span>
                {activeFilter && (
                  <button
                    onClick={() => setActiveFilter(null)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X size={10} />
                    Limpiar filtro
                  </button>
                )}
              </div>
              <button className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors">
                <Filter size={11} />
                Filtrar
              </button>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              {isLoadingMovimientos ? (
                <div className="py-16 flex items-center justify-center text-slate-500">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={<Inbox size={18} />}
                  title={movimientos.length === 0 ? "No se encontraron movimientos" : "Sin resultados para este filtro"}
                  description={movimientos.length === 0 ? "Carga un extracto bancario para ver los movimientos aquí." : "Intenta limpiar el filtro para ver el resto de movimientos."}
                />
              ) : (
                filtered.map((m) => (
  <MovementRow
    key={m.id}
    movimiento={m}
    selected={
      selectedMovimiento?.id === m.id
    }
    onClick={() =>
      setSelectedMovimiento(m)
    }
    esReciente={conciliadosRecientes.includes(
      Number(m.id)
    )}
  />

                ))
              )}
            </div>
          </div>

          {/* Historial */}
          <div className="space-y-2">
            <HistorySection
  historial={historial}
  isLoading={isLoadingHistorial}
  onOpenHistorial={abrirHistorial}
/>
          </div>
        </div>

        {/* Right panel */}
        <div className={cn("transition-all duration-300 overflow-hidden flex-shrink-0", selectedMovimiento ? "w-[380px]" : "w-0")}>
          {selectedMovimiento && (
            <div className="w-[380px] rounded-2xl border border-white/[0.06] bg-[#0d1117] h-fit sticky top-24 overflow-hidden">
              <MovementDetail
  movimiento={selectedMovimiento}
  onClose={() =>
    setSelectedMovimiento(null)
  }
  onSeleccionarCoincidencia={
    seleccionarCoincidencia
  }
/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}