import type { ValorizacionStatus } from "@/lib/types"
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined, currency?: string): string {
  if (amount == null) return "-"
  const prefix = currency === "USD" ? "$" : "S/"
  return `${prefix} ${Number(amount).toLocaleString("es-PE")}`
}

export function formatDate(fecha?: string): string {
  if (!fecha) return "-"
  return new Date(fecha).toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const API_STATUS_MAP: Record<string, ValorizacionStatus> = {
  BORRADOR: "draft",
  EN_REVISION: "under_review",
  OBSERVADO: "observed",
  APROBADO: "approved",
}

export function mapEstadoApiToStatus(estado: string | undefined): ValorizacionStatus {
  return API_STATUS_MAP[estado ?? ""] ?? "draft"
}
