export interface ItemDetectado {
  id: string
  nombre: string
}

export interface ResultadoImportacion {
  success: boolean
  creadas?: number
  items?: ItemDetectado[]
  data?: any[]
  message?: string
  error?: string
}

export interface Importador {
  detectar(buffer: Buffer, nombreArchivo: string): Promise<{ items: ItemDetectado[] }>
  importar(
    buffer: Buffer,
    nombreArchivo: string,
    seleccion: string[],
    creadoPor?: string
  ): Promise<ResultadoImportacion>
}
