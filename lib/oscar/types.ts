export type OrigenFactura = "PDF_TEXTO" | "PDF_ESCANEADO" | "IMAGEN";
export type EstadoOcr = "PENDIENTE" | "PROCESADO" | "REVISADO" | "ERROR";

import type { RowDataPacket } from "mysql2/promise";

export interface LineaFactura {
  codigo: string | null;
  cantidad: number | null;
  unidad: string | null;
  descripcion: string | null;
  valorUnitario: number | null;
  descuento: number | null;
  valorVenta: number | null;
}

export interface CabeceraFactura {
  rucEmisor: string | null;
  razonSocialEmisor: string | null;
  rucCliente: string | null;
  razonSocialCliente: string | null;
  numeroDocumento: string | null;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  moneda: string | null;
  condicionPago: string | null;
  ordenCompra: string | null;
  guiaRemision: string | null;
  subtotal: number | null;
  igv: number | null;
  total: number | null;
}

export interface FacturaOscar {
  cabecera: CabeceraFactura;
  lineas: LineaFactura[];
  origen: OrigenFactura;
  estadoOcr: EstadoOcr;
  nombreArchivo: string | null;
  onedriveItemId: string | null;
  onedriveWebUrl: string | null;
}

export interface FacturaOscarFila extends RowDataPacket {
  id: number;
  usuario_id: number;
  ruc_emisor: string | null;
  razon_social_emisor: string | null;
  ruc_cliente: string | null;
  razon_social_cliente: string | null;
  numero_documento: string | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  moneda: string | null;
  condicion_pago: string | null;
  orden_compra: string | null;
  guia_remision: string | null;
  codigo: string | null;
  cantidad: number | null;
  unidad: string | null;
  descripcion: string | null;
  valor_unitario: number | null;
  descuento: number | null;
  valor_venta: number | null;
  subtotal: number | null;
  igv: number | null;
  total: number | null;
  nombre_archivo: string | null;
  onedrive_item_id: string | null;
  onedrive_web_url: string | null;
  origen: OrigenFactura | null;
  estado_ocr: EstadoOcr | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface FacturaOscarAgrupada {
  grupoId: number;
  usuarioId: number;
  cabecera: CabeceraFactura;
  lineas: LineaFactura[];
  origen: OrigenFactura | null;
  estadoOcr: EstadoOcr | null;
  nombreArchivo: string | null;
  onedriveItemId: string | null;
  onedriveWebUrl: string | null;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
}
