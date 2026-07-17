export type ExportTemplateId = "repsol" | "tdp" | "bpo" | "default"

export interface ExportColumn {
  header: string
  key: string
  width?: number
}

export interface ExportTemplate {
  id: ExportTemplateId
  name: string
  sheetName: string
  columns: ExportColumn[]
  formatRow: (item: Record<string, any>) => Record<string, any>
}

export interface ExportFilters {
  client: string
  periodo: string
}
