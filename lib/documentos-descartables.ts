// =============================================================================
// CLASIFICACIÓN DE DOCUMENTOS DESCARTABLES
// =============================================================================
// Determina si un documento que NO cumple los criterios de factura (esFactura)
// debe ser descartado (eliminado de OneDrive) o quedar pendiente de decisión.
//
// MEDIDAS DE SEGURIDAD:
// - Solo se descarta automáticamente (certeza = "confirmado") cuando el tipo
//   de documento se puede determinar con confianza. En cualquier otro caso se
//   devuelve certeza = "duda" (o null) y el archivo NO se elimina: pasa a una
//   revisión interactiva (SÍ / NO) y puede volver a evaluarse en la próxima
//   sincronización.
// - El texto que aparece SOLO en descripciones, cláusulas legales o datos del
//   cliente NO se usa como evidencia de nota de crédito/débito/guía (evita
//   falsos positivos de facturas que mencionan esos términos en su cuerpo).
// - Si hay un error de OCR, error de IA o error del sistema, el flujo nunca
//   llega a esta función (el error se captura antes).
// - Esta función NO modifica la clasificación CxC/CxP ni la validación por RUC.
// =============================================================================

export type CertezaClasificacion = "confirmado" | "duda";

export interface ClasificacionDescartable {
  motivo: string;
  certeza: CertezaClasificacion;
}

const NOTA_CREDITO_RE =
  /NOTA\s+DE\s+CR[ÉE]DITO|CREDIT\s*NOTE|CRÉDITO\s+ELECTRÓNICA|CREDITO\s+ELECTRONICA/;
const NOTA_DEBITO_RE =
  /NOTA\s+DE\s+D[ÉE]BITO|DEBIT\s*NOTE|DÉBITO\s+ELECTRÓNICA|DEBITO\s+ELECTRONICA/;
const GUIA_REMISION_RE =
  /GUIA\s+DE\s+REMISION|GUÍA\s+DE\s+REMISIÓN|GUIA\s+REMISION|GUÍA\s+REMISIÓN/;

const BANCOS = [
  "BANCO DE CREDITO",
  "BANCO DE CRÉDITO",
  "BCP",
  "BBVA",
  "INTERBANK",
  "SCOTIABANK",
  "BANBIF",
  "BANCO BIF",
  "BANCO DE LA NACION",
  "BANCO DE LA NACIÓN",
  "BANCO NACION",
  "BANCO PICHINCHA",
  "BANCO CONTINENTAL",
  "GNB PERU",
  "CITIBANK",
  "BANCO",
];

export function esTextoBancario(texto: string): boolean {
  const t = String(texto || "").toUpperCase();

  return BANCOS.some((banco) => t.includes(banco));
}

// Tipos explícitos devueltos por el modelo de IA (REGLAS de los prompts).
const TIPOS_NOTA_CREDITO = new Set([
  "nota de credito",
  "nota de crédito",
  "nota_credito",
  "nota de credito electronica",
  "nota de crédito electrónica",
  "nota_credito_electronica",
  "nota_credito_electronico",
  "credit note",
  "nc",
]);

const TIPOS_NOTA_DEBITO = new Set([
  "nota de debito",
  "nota de débito",
  "nota_debito",
  "nota de debito electronica",
  "nota de débito electrónica",
  "nota_debito_electronica",
  "debit note",
  "nd",
]);

const TIPOS_GUIA_REMISION = new Set([
  "guia de remision",
  "guía de remisión",
  "guia_remision",
  "guia",
  "guía",
  "guia de remision electronica",
  "guía de remisión electrónica",
]);

const TIPOS_BANCARIOS = new Set([
  "documento bancario",
  "documento del banco",
  "bancario",
  "banco",
  "estado de cuenta",
  "estado de cuenta bancario",
  "estado_de_cuenta",
  "estado de cuenta electronico",
]);

// Tipos genéricos / poco informativos: indican que el modelo NO identificó un
// tipo soportado con certeza. NUNCA deben provocar una eliminación automática.
const TIPOS_GENERICOS = new Set([
  "otro",
  "otros",
  "otro documento",
  "otro_documento",
  "documento",
  "documento no soportado",
  "documento_no_soportado",
  "no soportado",
  "no_soportado",
  "no especificado",
  "no_especificado",
  "desconocido",
  "sin tipo",
]);

export function clasificarDocumentoDescartado(
  json: any
): ClasificacionDescartable | null {
  const tipo = String(json?.tipoDocumento || "")
    .toLowerCase()
    .trim();

  // Evidencia de "cabecera": la entidad principal o el emisor del documento.
  // NUNCA se incluye descripcionServicio ni empresaCliente aquí, para no
  // confundir menciones legales/pie de página con el tipo del documento.
  const headerTexto = [
    String(json?.entidadPrincipal || ""),
    String(json?.empresaEmisora || ""),
  ]
    .join(" ")
    .toUpperCase();

  // ---- 1) Tipo explícito devuelto por la IA: certeza máxima ----
  if (TIPOS_NOTA_CREDITO.has(tipo)) {
    return { motivo: "Nota de Crédito.", certeza: "confirmado" };
  }

  if (TIPOS_NOTA_DEBITO.has(tipo)) {
    return { motivo: "Nota de Débito.", certeza: "confirmado" };
  }

  if (TIPOS_GUIA_REMISION.has(tipo)) {
    return { motivo: "Guía de Remisión.", certeza: "confirmado" };
  }

  if (TIPOS_BANCARIOS.has(tipo)) {
    return { motivo: "Documento bancario.", certeza: "confirmado" };
  }

  // ---- 2) Evidencia en la cabecera del documento ----
  if (NOTA_CREDITO_RE.test(headerTexto)) {
    return { motivo: "Nota de Crédito.", certeza: "confirmado" };
  }

  if (NOTA_DEBITO_RE.test(headerTexto)) {
    return { motivo: "Nota de Débito.", certeza: "confirmado" };
  }

  if (GUIA_REMISION_RE.test(headerTexto)) {
    return { motivo: "Guía de Remisión.", certeza: "confirmado" };
  }

  // ---- 3) Tipo genérico / no soportado: NO eliminar, queda pendiente ----
  if (TIPOS_GENERICOS.has(tipo)) {
    return { motivo: "Documento no soportado.", certeza: "duda" };
  }

  // ---- 4) Origen bancario sin tipo explícito: NO eliminar, queda pendiente ----
  if (
    esTextoBancario(json?.empresaEmisora) ||
    esTextoBancario(json?.entidadPrincipal)
  ) {
    return { motivo: "Documento bancario.", certeza: "duda" };
  }

  // ---- 5) Mención de nota/guía solo en cliente o descripción: es ambiguo
  //         (suele ser texto legal o pie de página), NO eliminar ----
  const textoClienteDescripcion = [
    String(json?.empresaCliente || ""),
    String(json?.descripcionServicio || ""),
  ]
    .join(" ")
    .toUpperCase();

  if (NOTA_CREDITO_RE.test(textoClienteDescripcion)) {
    return { motivo: "Nota de Crédito.", certeza: "duda" };
  }

  if (NOTA_DEBITO_RE.test(textoClienteDescripcion)) {
    return { motivo: "Nota de Débito.", certeza: "duda" };
  }

  if (GUIA_REMISION_RE.test(textoClienteDescripcion)) {
    return { motivo: "Guía de Remisión.", certeza: "duda" };
  }

  return null;
}
