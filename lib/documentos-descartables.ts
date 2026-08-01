// =============================================================================
// CLASIFICACIÓN DE DOCUMENTOS DESCARTABLES
// =============================================================================
// Determina si un documento que NO cumple los criterios de factura (esFactura)
// debe ser descartado (eliminado de OneDrive) o quedar pendiente de decisión.
//
// REGLAS DE ELIMINACIÓN AUTOMÁTICA (SOLO con certeza):
// - El tipo de documento debe estar declarado EXPLÍCITAMENTE en el encabezado /
//   título principal del documento: NOTA DE CRÉDITO ELECTRÓNICA, NOTA DE DÉBITO
//   ELECTRÓNICA, GUÍA DE REMISIÓN ELECTRÓNICA, LIQUIDACIÓN DE COMPRA, PROFORMA,
//   COTIZACIÓN u otro tipo explícitamente no soportado por el sistema.
// - NUNCA se usa como evidencia: descripción, observaciones, pie de página,
//   cláusulas legales o referencias a comprobantes que el documento modifica.
// - El texto que aparece SOLO en descripciones, cláusulas legales o datos del
//   cliente NUNCA produce una eliminación: a lo sumo genera "duda".
// - NUNCA se elimina automáticamente cuando: tipo desconocido, OCR/IA con
//   dudas, campos faltantes, undefined/null, encabezado no identificable o
//   cualquier incertidumbre. En esos casos se devuelve "duda"/null y el archivo
//   vuelve a evaluarse en futuras sincronizaciones.
// - Una factura válida NUNCA se elimina aunque falte número, RUC, destino o
//   falle parte de la IA: la ausencia de información jamás justifica eliminar.
// - Esta función NO modifica la clasificación CxC/CxP ni la validación por RUC.
// =============================================================================

export type CertezaClasificacion = "confirmado" | "duda";

export interface ClasificacionDescartable {
  motivo: string;
  certeza: CertezaClasificacion;
}

// -----------------------------------------------------------------------------
// Utilidades de texto seguro (evitan que "undefined"/"null"/vacíos se muestren)
// -----------------------------------------------------------------------------

const VALORES_INVALIDOS = new Set(["undefined", "null", "nan", "[object object]", "{}"]);

function limpiarTexto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const t = String(valor).trim();
  if (t === "") return null;
  if (VALORES_INVALIDOS.has(t.toLowerCase())) return null;
  return t;
}

// Nombre mostrado para un documento, por prioridad:
//   1) número del documento extraído (serie-correlativo) y válido;
//   2) nombre original del archivo en OneDrive;
//   3) "Documento sin identificar".
// Jamás devuelve undefined/null/vacío ni concatenaciones serie-correlativo
// cuando uno de los campos es undefined (evita el "undefined-undefined").
export function formatearNombreDocumento(
  numeroFactura: unknown,
  nombreArchivo: unknown
): string {
  const numero = limpiarTexto(numeroFactura);
  if (numero) return numero;

  const nombre = limpiarTexto(nombreArchivo);
  if (nombre) return nombre;

  return "Documento sin identificar";
}

export function textoValido(valor: unknown): string | null {
  return limpiarTexto(valor);
}

// -----------------------------------------------------------------------------
// Expresiones de cabecera (evidencia de tipo en el TÍTULO principal)
// -----------------------------------------------------------------------------

const NOTA_CREDITO_RE =
  /NOTA\s+DE\s+CR[ÉE]DITO|CREDIT\s*NOTE|CRÉDITO\s+ELECTRÓNICA|CREDITO\s+ELECTRONICA/;
const NOTA_DEBITO_RE =
  /NOTA\s+DE\s+D[ÉE]BITO|DEBIT\s*NOTE|DÉBITO\s+ELECTRÓNICA|DEBITO\s+ELECTRONICA/;
const GUIA_REMISION_RE =
  /GUIA\s+DE\s+REMISION|GUÍA\s+DE\s+REMISIÓN|GUIA\s+REMISION|GUÍA\s+REMISIÓN|GUÍA\s+DE\s+REMISIÓN\s+ELECTRÓNICA|GUIA\s+DE\s+REMISION\s+ELECTRONICA/;
const LIQUIDACION_COMPRA_RE =
  /LIQUIDACI[ÓO]N\s+DE\s+COMPRA|LIQUIDACI[ÓO]N\s+COMPRA|LIQUIDATION\s+OF\s+PURCHASE/;
const PROFORMA_RE = /FACTURA\s+PROFORMA|\bPROFORMA\b|PRO\s*FORMA/;
const COTIZACION_RE = /COTIZACI[ÓO]N(\s+ELECTR[ÓO]NICA)?|QUOTATION/;
const RETENCION_RE = /COMPROBANTE\s+DE\s+RETENCI[ÓO]N|RETENCI[ÓO]N\s+ELECTR[ÓO]NICA|RETENCION\s+ELECTRONICA/;
const ORDEN_COMPRA_RE = /ORDEN\s+DE\s+COMPRA|PURCHASE\s+ORDER/;
const ORDEN_SERVICIO_RE = /ORDEN\s+DE\s+SERVICIO|SERVICE\s+ORDER/;
const CONTRATO_RE = /\bCONTRATO\b|\bCONTRACT\b/;

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

// -----------------------------------------------------------------------------
// Tipos explícitos devueltos por el modelo de IA (REGLAS de los prompts).
// Sólo estos tipos (declarados en la cabecera) permiten eliminación automática.
// -----------------------------------------------------------------------------

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
  "guia de remision electronica",
  "guía de remisión electrónica",
  "guia",
  "guía",
]);

const TIPOS_LIQUIDACION_COMPRA = new Set([
  "liquidacion de compra",
  "liquidación de compra",
  "liquidacion_compra",
  "liquidacion de compra electronica",
  "liquidación de compra electrónica",
]);

const TIPOS_PROFORMA = new Set([
  "proforma",
  "factura proforma",
  "factura_proforma",
  "pro forma",
  "proforma electronica",
]);

const TIPOS_COTIZACION = new Set([
  "cotizacion",
  "cotización",
  "cotizacion electronica",
  "cotización electrónica",
  "cotizacion_electronica",
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

// Otros tipos explícitamente no soportados por el sistema: declarados por la IA
// como un tipo concreto que no es factura ni un documento que se pueda registrar.
// (Solo estos admiten eliminación automática.)
const TIPOS_NO_SOPORTADOS = new Set([
  "comprobante de retencion",
  "comprobante de retención",
  "comprobante_de_retencion",
  "retencion",
  "retención",
]);

// Tipos dudosos / potencialmente útiles: nunca se eliminan automáticamente,
// quedan pendientes de revisión (p. ej. órdenes, contratos y comprobantes tipo
// boleta/nota de venta que podrían ser documentos válidos).
const TIPOS_DUDOSOS = new Set([
  "orden de compra",
  "orden_de_compra",
  "orden de servicio",
  "orden_de_servicio",
  "contrato",
  "nota de venta",
  "nota_de_venta",
  "boleta de venta",
  "boleta_de_venta",
  "recibo",
  "recibo por honorarios",
  "recibo_por_honorarios",
]);

// Tipos genéricos / poco informativos: el modelo NO identificó un tipo
// soportado con certeza. NUNCA provocan eliminación automática.
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

  // ---- 1) Tipo explícito declarado por la IA: certeza máxima (solo tipos
  //         no soportados / no factura llegan aquí porque esFactura=false) ----
  if (TIPOS_NOTA_CREDITO.has(tipo)) {
    return { motivo: "Nota de Crédito.", certeza: "confirmado" };
  }

  if (TIPOS_NOTA_DEBITO.has(tipo)) {
    return { motivo: "Nota de Débito.", certeza: "confirmado" };
  }

  if (TIPOS_GUIA_REMISION.has(tipo)) {
    return { motivo: "Guía de Remisión.", certeza: "confirmado" };
  }

  if (TIPOS_LIQUIDACION_COMPRA.has(tipo)) {
    return { motivo: "Liquidación de Compra.", certeza: "confirmado" };
  }

  if (TIPOS_PROFORMA.has(tipo)) {
    return { motivo: "Proforma.", certeza: "confirmado" };
  }

  if (TIPOS_COTIZACION.has(tipo)) {
    return { motivo: "Cotización.", certeza: "confirmado" };
  }

  if (TIPOS_BANCARIOS.has(tipo)) {
    return { motivo: "Documento bancario.", certeza: "confirmado" };
  }

  if (TIPOS_NO_SOPORTADOS.has(tipo)) {
    return { motivo: "Documento no soportado.", certeza: "confirmado" };
  }

  // ---- 1b) Tipos dudosos declarados por la IA: NO eliminar, queda pendiente ----
  if (TIPOS_DUDOSOS.has(tipo)) {
    return { motivo: "Documento no soportado.", certeza: "duda" };
  }

  // ---- 2) Evidencia en el encabezado / título principal del documento ----
  if (NOTA_CREDITO_RE.test(headerTexto)) {
    return { motivo: "Nota de Crédito.", certeza: "confirmado" };
  }

  if (NOTA_DEBITO_RE.test(headerTexto)) {
    return { motivo: "Nota de Débito.", certeza: "confirmado" };
  }

  if (GUIA_REMISION_RE.test(headerTexto)) {
    return { motivo: "Guía de Remisión.", certeza: "confirmado" };
  }

  if (LIQUIDACION_COMPRA_RE.test(headerTexto)) {
    return { motivo: "Liquidación de Compra.", certeza: "confirmado" };
  }

  if (PROFORMA_RE.test(headerTexto)) {
    return { motivo: "Proforma.", certeza: "confirmado" };
  }

  if (COTIZACION_RE.test(headerTexto)) {
    return { motivo: "Cotización.", certeza: "confirmado" };
  }

  if (RETENCION_RE.test(headerTexto)) {
    return { motivo: "Comprobante de Retención.", certeza: "confirmado" };
  }

  // Evidencia de cabecera de tipos dudosos: NO eliminar, queda pendiente
  if (ORDEN_COMPRA_RE.test(headerTexto)) {
    return { motivo: "Orden de Compra.", certeza: "duda" };
  }

  if (ORDEN_SERVICIO_RE.test(headerTexto)) {
    return { motivo: "Orden de Servicio.", certeza: "duda" };
  }

  if (CONTRATO_RE.test(headerTexto)) {
    return { motivo: "Contrato.", certeza: "duda" };
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

  // ---- 5) Mención de nota/guía SOLO en cliente o descripción: ambiguo
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
