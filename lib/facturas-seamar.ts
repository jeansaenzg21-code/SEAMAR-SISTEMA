import { procesarDocumento } from "@/lib/openai-documentos"
import { subirDocumentoAOneDrive } from "@/lib/onedrive"

export type FacturaSeamarExtraida = {
  rucEmisor: string | null
  proveedor: string | null
  rucCliente: string | null
  cliente: string | null
  servicio: string | null
  numeroDocumento: string | null
  detraccion: number | null
  formaPago: string | null
  categorizacion: string
  monto: number | null
  moneda: "SOLES" | "DOLARES" | null
  fechaEmision: string | null
  fechaVencimiento: string | null
  hashArchivo: string
  archivo: { nombre: string; itemId: string; webUrl: string }
}

function texto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null
  const resultado = String(valor).trim()
  return resultado && resultado !== "-" && resultado !== "—" ? resultado : null
}

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null
  const resultado = Number(String(valor).replace(/[^\d.-]/g, ""))
  return Number.isFinite(resultado) ? resultado : null
}

function fecha(valor: unknown): string | null {
  const resultado = texto(valor)
  return resultado && /^\d{4}-\d{2}-\d{2}$/.test(resultado) ? resultado : null
}

function moneda(valor: unknown): "SOLES" | "DOLARES" | null {
  const resultado = texto(valor)?.toUpperCase()
  if (resultado === "SOLES" || resultado === "PEN") return "SOLES"
  if (resultado === "DOLARES" || resultado === "USD") return "DOLARES"
  return null
}

export async function extraerFacturaSeamar(
  nombreArchivo: string,
  buffer: Buffer,
): Promise<FacturaSeamarExtraida> {
  const archivo = await subirDocumentoAOneDrive(nombreArchivo, buffer)
  const resultado = await procesarDocumento(
    buffer,
    nombreArchivo,
    "factura",
  ) as any

  return {
    rucEmisor: texto(resultado.rucEmisor),
    proveedor: texto(resultado.empresaEmisora || resultado.razonSocialEmisor),
    rucCliente: texto(resultado.rucCliente),
    cliente: texto(resultado.empresaCliente || resultado.razonSocialCliente),
    servicio: texto(resultado.descripcionServicio),
    numeroDocumento: texto(resultado.numeroFactura),
    detraccion: numero(resultado.detraccion),
    formaPago: texto(resultado.formaPago),
    categorizacion: texto(resultado.categorizacion) || "OTROS",
    monto: numero(resultado.montoTotal),
    moneda: moneda(resultado.moneda),
    fechaEmision: fecha(resultado.fechaEmision),
    fechaVencimiento: fecha(resultado.fechaVencimiento),
    hashArchivo: texto(resultado.hashArchivo) || "",
    archivo: {
      nombre: archivo.nombre || nombreArchivo,
      itemId: archivo.itemId,
      webUrl: archivo.webUrl,
    },
  }
}
