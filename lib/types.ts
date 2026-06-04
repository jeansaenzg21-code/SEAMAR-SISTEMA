// Core types for the financial control platform

export interface Cliente {
  id: string
  razon_social: string
  ruc: string
  estado: string

  contacto_principal?: string
  correo?: string
  telefono?: string
  direccion?: string
}

export interface Proyecto {
  id: string
  nombre: string
  clienteId: string
  cliente?: Cliente
  fechaInicio: Date
  estado: 'activo' | 'pausado' | 'completado' | 'cancelado'
  createdAt: Date
  updatedAt: Date
}

export interface Proveedor {
  id: number
  razon_social: string
  ruc: string
  estado: string
  contacto_principal?: string
  correo?: string
  telefono?: string
  direccion?: string
}

export interface CuentaPorCobrar {
  id: string
  clienteId: string
  cliente?: Cliente
  proyectoId: string
  proyecto?: Proyecto
  documento: string
  fechaEmision: Date
  fechaVencimiento: Date
  monto: number
  estadoCobranza: 'pendiente' | 'parcial' | 'cobrado' | 'vencido'
  createdAt: Date
  updatedAt: Date
}

export interface CuentaPorPagar {
  id: string
  proveedor: string
  proyectoId: string
  proyecto?: Proyecto
  tipoGasto: string
  fechaVencimiento: Date
  monto: number
  estadoPago: 'pendiente' | 'parcial' | 'pagado' | 'vencido'
  createdAt: Date
  updatedAt: Date
}

export interface Documento {
  id: string
  nombre: string
  tipo: 'factura' | 'boleta' | 'recibo' | 'contrato' | 'otro'
  archivo: string
  empresaProveedor?: string
  fecha?: Date
  monto?: number
  clienteId?: string
  proyectoId?: string
  centroCosto?: string
  tipoOperacion?: string
  createdAt: Date
  updatedAt: Date
}

export interface Alerta {
  id: string
  tipo: 'pago_proximo' | 'cobranza_pendiente' | 'vencimiento'
  mensaje: string
  prioridad: 'alta' | 'media' | 'baja'
  fecha: Date
  referenciaId?: string
  referenciaTipo?: 'cuenta_cobrar' | 'cuenta_pagar'
}

export interface ResumenFinanciero {
  totalPorCobrar: number
  totalPorPagar: number
  flujoSemanalProyectado: number
  saldoDisponible: number
  alertasCount: number
}
