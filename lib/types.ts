export type ValorizacionStatus = "draft" | "under_review" | "observed" | "approved" | "invoiced"

export interface DocumentoValorizacion {
  id: string | number
  nombre?: string
  archivo_nombre?: string
  nombre_archivo?: string
  url?: string
  archivo_url?: string
  [key: string]: unknown
}
