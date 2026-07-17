import type { ExportTemplate } from "./types"

export const tdpTemplate: ExportTemplate = {
  id: "tdp",
  name: "Formato TDP",
  sheetName: "TDP",
  columns: [
    { header: "Código", key: "codigo", width: 16 },
    { header: "Requerimiento", key: "requerimiento", width: 20 },
    { header: "Descripción", key: "descripcion", width: 35 },
    { header: "Monto S/", key: "monto", width: 16 },
    { header: "Moneda", key: "moneda", width: 10 },
    { header: "Período", key: "periodo", width: 12 },
    { header: "Estado", key: "estado", width: 14 },
    { header: "Encargado", key: "encargado", width: 18 },
    { header: "Fecha Ejecución", key: "fecha", width: 14 },
  ],
  formatRow: (item) => ({
    codigo: item.codigo || "",
    requerimiento: item.numero_requerimiento || "",
    descripcion: item.descripcion || item.description || "",
    monto: item.monto ?? item.amount ?? 0,
    moneda: item.moneda || "PEN",
    periodo: item.periodo || item.date || "",
    estado: item.estado || item.status || "",
    encargado: item.encargado || "",
    fecha: item.fecha_ejecucion?.split("T")[0] || "",
  }),
}
