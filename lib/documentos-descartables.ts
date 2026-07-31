// =============================================================================
// CLASIFICACIÓN DE DOCUMENTOS DESCARTABLES
// =============================================================================
// Determina si un documento que NO cumple los criterios de factura (esFactura)
// debe ser descartado y eliminado de OneDrive.
//
// MEDIDAS DE SEGURIDAD:
// - Solo se descarta cuando el documento se pudo leer y clasificar con
//   confianza. Si hay un error de OCR, error de IA o error del sistema, el
//   flujo nunca llega a esta función (el error se captura antes).
// - Si el tipo no puede determinarse con certeza, NO se elimina el archivo.
// - Esta función NO modifica la clasificación CxC/CxP ni la validación por RUC.
// =============================================================================

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

function motivoPorTipoDocumento(tipo: string): string | null {
  switch (tipo) {
    case "otro":
    case "otros":
    case "otro documento":
    case "documento no soportado":
    case "no soportado":
    case "no especificado":
      return "Documento no soportado.";
    case "nota de credito":
    case "nota de crédito":
    case "nota_de_credito":
    case "nota_credito":
    case "credit note":
      return "Nota de Crédito.";
    case "nota de debito":
    case "nota de débito":
    case "nota_de_debito":
    case "nota_debito":
    case "debit note":
      return "Nota de Débito.";
    case "guia de remision":
    case "guía de remisión":
    case "guia_remision":
    case "guia":
      return "Guía de Remisión.";
    case "documento bancario":
    case "documento del banco":
    case "bancario":
    case "banco":
    case "estado de cuenta":
    case "estado de cuenta bancario":
      return "Documento bancario.";
    case "proforma":
    case "cotizacion":
    case "cotización":
    case "orden de compra":
    case "orden de servicio":
    case "contrato":
      return "Documento no soportado.";
    default:
      return null;
  }
}

export function clasificarDocumentoDescartado(json: any): { motivo: string } | null {
  const tipoDocumento = String(json?.tipoDocumento || "").toLowerCase();

  const texto = [
    String(json?.empresaEmisora || ""),
    String(json?.empresaCliente || ""),
    String(json?.entidadPrincipal || ""),
    String(json?.descripcionServicio || ""),
  ].join(" ");

  if (NOTA_CREDITO_RE.test(texto)) {
    return { motivo: "Nota de Crédito." };
  }

  if (NOTA_DEBITO_RE.test(texto)) {
    return { motivo: "Nota de Débito." };
  }

  if (GUIA_REMISION_RE.test(texto)) {
    return { motivo: "Guía de Remisión." };
  }

  if (
    esTextoBancario(json?.empresaEmisora) ||
    esTextoBancario(json?.entidadPrincipal)
  ) {
    return { motivo: "Documento bancario." };
  }

  if (tipoDocumento && tipoDocumento !== "factura") {
    const motivo = motivoPorTipoDocumento(tipoDocumento);

    if (motivo) {
      return { motivo };
    }
  }

  return null;
}
