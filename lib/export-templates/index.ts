import type { ExportTemplate } from "./types"
import { repsolTemplate } from "./repsol"
import { tdpTemplate } from "./tdp"
import { bpoTemplate } from "./bpo"
import { defaultTemplate } from "./default"

const templates: ExportTemplate[] = [
  repsolTemplate,
  tdpTemplate,
  bpoTemplate,
  defaultTemplate,
]

const CLIENT_RULES: { match: (name: string) => boolean; templateId: string }[] = [
  { match: (n) => n.toUpperCase().includes("REPSOL"), templateId: "repsol" },
  { match: (n) => /^(TERMINALES\s+DEL\s+PERU|TDP)/i.test(n.trim()), templateId: "tdp" },
  { match: (n) => n.toUpperCase().includes("BPO"), templateId: "bpo" },
]

export function getTemplateForClient(clientName: string): ExportTemplate {
  const rule = CLIENT_RULES.find((r) => r.match(clientName))
  if (rule) {
    const found = templates.find((t) => t.id === rule.templateId)
    if (found) return found
  }
  return defaultTemplate
}

export function getAllTemplates(): ExportTemplate[] {
  return templates
}

export function obtenerFormatoExportacion(clientName: string): string {
  const template = getTemplateForClient(clientName)
  return template.name.replace("Formato ", "")
}

export type { ExportTemplate, ExportColumn, ExportFilters } from "./types"
