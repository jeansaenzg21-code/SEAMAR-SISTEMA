import type { RowDataPacket } from "mysql2/promise";

// =============================================================================
// Tipos de Guías de Remisión del módulo OSCAR
// =============================================================================

export type EstadoGuiaRemision = "PENDIENTE" | "REVISADO";

export type OrigenGuiaRemision = "PDF" | "IMAGEN";

export interface GuiaRemisionDatos {
  serie: string | null;
  numero: string | null;
  fechaInicioTraslado: string | null;
  fechaEmision?: string | null;
  motivoTraslado: string | null;
  destinatario: string | null;
  rucCliente: string | null;
  direccion: string | null;
}

export interface BienGuiaRemision {
  codigoBien: string | null;
  descripcion: string | null;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  ref: string | null;
  unidadMedida: string | null;
  cantidad: number | null;
  accesorios: string | null;
  nroParte: string | null;
  lote: string | null;
}

export interface ResultadoExtraccionGuia {
  origen: OrigenGuiaRemision;
  hashArchivo: string;
  guia: GuiaRemisionDatos;
  bienes: BienGuiaRemision[];
}

export interface ResultadoExtraccionMultiGuia {
  origen: OrigenGuiaRemision;
  hashArchivo: string;
  guias: Array<{
    guia: GuiaRemisionDatos;
    bienes: BienGuiaRemision[];
  }>;
}

export interface GuardarGuiaRemisionInput {
  guia: GuiaRemisionDatos;
  bienes: BienGuiaRemision[];
  estado: EstadoGuiaRemision;
  carpetaId?: number | null;
  nombreArchivo: string | null;
  onedriveItemId: string | null;
  onedriveWebUrl: string | null;
  hashArchivo: string | null;
}

export interface GuiaRemisionFila extends RowDataPacket {
  id: number;
  usuario_id: number;
  serie: string | null;
  numero: string | null;
  fecha_inicio_traslado: string | null;
  motivo_traslado: string | null;
  destinatario: string | null;
  ruc_cliente: string | null;
  direccion: string | null;
  nombre_archivo: string | null;
  onedrive_item_id: string | null;
  onedrive_web_url: string | null;
  hash_archivo: string | null;
  estado: EstadoGuiaRemision;
  carpeta_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface BienGuiaRemisionFila extends RowDataPacket {
  id: number;
  guia_id: number;
  codigo_bien: string | null;
  descripcion: string | null;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  ref: string | null;
  unidad_medida: string | null;
  cantidad: number | null;
  accesorios: string | null;
  nro_parte: string | null;
  lote: string | null;
  orden: number;
}

export interface GuiaRemisionOscar {
  id: number;
  usuarioId: number;
  guia: GuiaRemisionDatos;
  bienes: BienGuiaRemision[];
  conteoBienes?: number;
  estado: EstadoGuiaRemision;
  carpetaId?: number | null;
  nombreArchivo: string | null;
  onedriveItemId: string | null;
  onedriveWebUrl: string | null;
  hashArchivo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpcionesListadoGuias {
  pagina?: number;
  porPagina?: number;
  estado?: EstadoGuiaRemision | null;
  busqueda?: string;
  carpeta?: FiltroCarpetaGuia;
}

export interface ResultadoListadoGuias {
  guias: GuiaRemisionOscar[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

// =============================================================================
// Carpetas de guías de remisión
// =============================================================================

export interface GuiaRemisionCarpeta {
  id: number;
  usuarioId: number;
  nombre: string;
  createdAt: string;
  updatedAt: string;
  totalGuias: number;
  totalBienes: number;
}

export interface GuiaRemisionCarpetaFila extends RowDataPacket {
  id: number;
  usuario_id: number;
  nombre: string;
  created_at: string;
  updated_at: string;
  total_guias: number;
  total_bienes: number;
}

export type FiltroCarpetaGuia = "TODAS" | "SIN_CARPETA" | number;
