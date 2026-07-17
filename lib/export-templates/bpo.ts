import type { ExportTemplate } from "./types"

export const bpoTemplate: ExportTemplate = {
  id: "bpo",
  name: "Formato BPO",
  sheetName: "BPO",
  columns: [
    { header: "Código", key: "codigo", width: 16 },
    { header: "Servicio", key: "descripcion", width: 35 },
    { header: "Monto S/", key: "monto", width: 16 },
    { header: "Moneda", key: "moneda", width: 10 },
    { header: "Período", key: "periodo", width: 12 },
    { header: "Estado", key: "estado", width: 14 },
    { header: "OS", key: "orden_servicio", width: 20 },
  ],
  formatRow: (item) => ({
    codigo: item.codigo || "",
    descripcion: item.descripcion || item.description || "",
    monto: item.monto ?? item.amount ?? 0,
    moneda: item.moneda || "PEN",
    periodo: item.periodo || item.date || "",
    estado: item.estado || item.status || "",
    orden_servicio: item.numero_orden_servicio || item.orden_servicio || "",
  }),
}
