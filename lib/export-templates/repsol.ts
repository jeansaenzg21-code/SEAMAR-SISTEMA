import type { ExportTemplate } from "./types"

export const repsolTemplate: ExportTemplate = {
  id: "repsol",
  name: "Formato REPSOL",
  sheetName: "REPSOL",
  columns: [
    { header: "Código", key: "codigo", width: 16 },
    { header: "OS", key: "orden_servicio", width: 20 },
    { header: "Descripción", key: "descripcion", width: 35 },
    { header: "PU", key: "pu", width: 10 },
    { header: "Monto S/", key: "monto", width: 16 },
    { header: "Moneda", key: "moneda", width: 10 },
    { header: "Período", key: "periodo", width: 12 },
    { header: "Estado", key: "estado", width: 14 },
    { header: "Encargado", key: "encargado", width: 18 },
    { header: "Fecha Ejecución", key: "fecha", width: 14 },
  ],
  formatRow: (item) => ({
    codigo: item.codigo || "",
    orden_servicio: item.numero_orden_servicio || item.orden_servicio || "",
    descripcion: item.descripcion || item.description || "",
    pu: item.pu ?? "",
    monto: item.monto ?? item.amount ?? 0,
    moneda: item.moneda || "PEN",
    periodo: item.periodo || item.date || "",
    estado: item.estado || item.status || "",
    encargado: item.encargado || "",
    fecha: item.fecha_ejecucion?.split("T")[0] || "",
  }),
}
