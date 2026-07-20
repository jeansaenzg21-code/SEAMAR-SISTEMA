import { memo } from "react"
import type { ValorizacionStatus } from "@/lib/types"

const STATUS_LABEL: Record<ValorizacionStatus, string> = {
  draft: "Borrador",
  under_review: "En revisión",
  observed: "Observado",
  approved: "Aprobado",
  invoiced: "Facturado",
}

const STATUS_STYLE: Record<ValorizacionStatus, string> = {
  draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  under_review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  observed: "bg-red-500/10 text-red-400 border-red-500/20",
  approved: "bg-green-500/10 text-green-400 border-green-500/20",
  invoiced: "bg-blue-500/10 text-blue-400 border-blue-500/20",
}

function StatusBadgeComponent({ status }: { status: ValorizacionStatus }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export const StatusBadge = memo(StatusBadgeComponent)
