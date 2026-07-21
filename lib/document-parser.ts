export interface DocumentoParseado {
  rucEmisor: string | null;
  rucCliente: string | null;
  numeroFactura: string | null;
  serie: string | null;
  correlativo: string | null;
  fechaEmision: string | null;
  montoTotal: number | null;
  moneda: string | null;
  detraccion: number | null;
}

const RUC_RE = /\b(\d{11})\b/g;

const NUMERO_FACTURA_RE =
  /\b([A-Z]{1,4}\d{2,3})\s*[-–—]\s*(\d{3,10})\b/g;

const FECHA_RE =
  /\b(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(\d{4})\b/g;

const MONTO_TOTAL_RE =
  /(?:total|importe\s*total|monto\s*total|pagar|a\s*pagar|saldo)[:\s]*s\/?\s*([\d,]+\.\d{2})/gi;

const MONEDA_SOLES_RE =
  /s\/|soles|moneda[:\s]*soles|pen/i;

const MONEDA_DOLARES_RE =
  /\$|us\$|usd|d[óo]lares?|moneda[:\s]*usd/i;

const DETRACCION_RE =
  /(?:detracci[óo]n|monto\s*detracci[óo]n|importe\s*detracci[óo]n|monto\s*a\s*depositar)[:\s]*s\/?\s*([\d,]+\.\d{2})/gi;

const DETRACCION_PORCENTAJE_RE =
  /detracci[óo]n[:\s]*(\d{1,3})\s*%/gi;

function limpiarNumero(valor: string): number {
  return parseFloat(valor.replace(/[,]/g, ""));
}

function normalizarFecha(dia: string, mes: string, anio: string): string {
  return `${anio}-${mes}-${dia}`;
}

function extraerRuc(texto: string): string | null {
  const matches = Array.from(texto.matchAll(RUC_RE));
  if (matches.length === 0) return null;
  return matches[0][1];
}

function extraerRucCliente(texto: string): string | null {
  const seccionCliente = extraerSeccionCliente(texto);
  const matches = Array.from(seccionCliente.matchAll(RUC_RE));
  if (matches.length === 0) return null;
  return matches[0][1];
}

function extraerSeccionCliente(texto: string): string {
  const patronesCliente = [
    /se[ñn]or[\w\s]*(?:s\.)?([\s\S]*?)(?:\n\s*\n|$)/gi,
    /cliente[\w\s]*(?:s\.)?([\s\S]*?)(?:\n\s*\n|$)/gi,
    /adquirente[\w\s]*(?:s\.)?([\s\S]*?)(?:\n\s*\n|$)/gi,
    /raz[óo]n\s*social\s*(?:del\s*)?cliente[\w\s]*(?:s\.)?([\s\S]*?)(?:\n\s*\n|$)/gi,
    /datos\s*del\s*cliente[\w\s]*(?:s\.)?([\s\S]*?)(?:\n\s*\n|$)/gi,
    /destinatario[\w\s]*(?:s\.)?([\s\S]*?)(?:\n\s*\n|$)/gi,
  ];

  for (const patron of patronesCliente) {
    const match = texto.match(patron);
    if (match && match[1]) {
      return match[1];
    }
  }

  return texto;
}

function extraerNumeroFactura(texto: string): {
  numeroFactura: string | null;
  serie: string | null;
  correlativo: string | null;
} {
  const match = texto.match(NUMERO_FACTURA_RE);
  if (!match) {
    return { numeroFactura: null, serie: null, correlativo: null };
  }
  const serie = match[1];
  const correlativo = match[2];
  return {
    numeroFactura: `${serie}-${correlativo}`,
    serie,
    correlativo,
  };
}

function extraerFecha(texto: string): string | null {
  const match = texto.match(FECHA_RE);
  if (!match) return null;
  return normalizarFecha(match[1], match[2], match[3]);
}

function extraerMontoTotal(texto: string): number | null {
  const match = texto.match(MONTO_TOTAL_RE);
  if (!match) return null;
  return limpiarNumero(match[1]);
}

function extraerMoneda(texto: string): string | null {
  if (MONEDA_DOLARES_RE.test(texto)) return "DOLARES";
  if (MONEDA_SOLES_RE.test(texto)) return "SOLES";
  return null;
}

function extraerDetraccion(texto: string): number | null {
  const match = texto.match(DETRACCION_RE);
  if (match) {
    return limpiarNumero(match[1]);
  }

  const porcentajeMatch = texto.match(DETRACCION_PORCENTAJE_RE);
  if (porcentajeMatch) {
    const porcentaje = parseInt(porcentajeMatch[1], 10);
    const total = extraerMontoTotal(texto);
    if (total !== null) {
      return Math.round((total * porcentaje) / 100);
    }
  }

  return null;
}

export function extraerCampos(texto: string): DocumentoParseado {
  const { numeroFactura, serie, correlativo } = extraerNumeroFactura(texto);

  return {
    rucEmisor: extraerRuc(texto),
    rucCliente: extraerRucCliente(texto),
    numeroFactura,
    serie,
    correlativo,
    fechaEmision: extraerFecha(texto),
    montoTotal: extraerMontoTotal(texto),
    moneda: extraerMoneda(texto),
    detraccion: extraerDetraccion(texto),
  };
}

const MAPA_CAMPOS: [keyof DocumentoParseado, string][] = [
  ["rucEmisor", "rucEmisor"],
  ["rucCliente", "rucCliente"],
  ["numeroFactura", "numeroFactura"],
  ["fechaEmision", "fechaEmision"],
  ["montoTotal", "montoTotal"],
  ["moneda", "moneda"],
  ["detraccion", "detraccion"],
];

function esNuloOVacio(valor: unknown): boolean {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === "string" && valor.trim() === "") return true;
  if (typeof valor === "number" && (isNaN(valor) || valor === 0)) return true;
  return false;
}

export function mergeResultados(
  openai: Record<string, unknown>,
  auto: DocumentoParseado
): Record<string, unknown> {
  const resultado = { ...openai };

  for (const [campoAuto, campoOpenAI] of MAPA_CAMPOS) {
    const valorAuto = auto[campoAuto];
    if (valorAuto === null || valorAuto === undefined) continue;

    if (esNuloOVacio(resultado[campoOpenAI])) {
      resultado[campoOpenAI] = valorAuto;
    }
  }

  return resultado;
}
