import type { ExportTemplate } from "./types"

export const defaultTemplate: ExportTemplate = {
  id: "default",
  name: "Formato General",
  sheetName: "Valorizaciones",
  columns: [
    { header: "Código", key: "codigo", width: 16 },
    { header: "Cliente", key: "cliente", width: 24 },
    { header: "Proyecto", key: "proyecto", width: 20 },
    { header: "OS", key: "orden_servicio", width: 18 },
    { header: "Descripción", key: "descripcion", width: 30 },
    { header: "Monto", key: "monto", width: 14 },
    { header: "Moneda", key: "moneda", width: 10 },
    { header: "Período", key: "periodo", width: 12 },
    { header: "Estado", key: "estado", width: 14 },
    { header: "Encargado", key: "encargado", width: 18 },
    { header: "Fecha", key: "fecha", width: 14 },
  ],
  formatRow: (item) => ({
    codigo: item.codigo || "",
    cliente: item.client || item.proveedor || "",
    proyecto: item.projectName || "",
    orden_servicio: item.orden_servicio || item.numero_orden_servicio || "",
    descripcion: item.description || item.descripcion || "",
    monto: item.monto ?? item.amount ?? 0,
    moneda: item.moneda || "PEN",
    periodo: item.periodo || item.date || "",
    estado: item.estado || item.status || "",
    encargado: item.encargado || "",
    fecha: item.fecha_ejecucion?.split("T")[0] || "",
  }),
}
