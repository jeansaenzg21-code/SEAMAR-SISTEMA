// =============================================================================
// VALIDACIÓN DE RESPALDO POR RUC
// =============================================================================
// Mecanismo de respaldo (fallback) para el procesamiento automático de facturas.
//
// Se ejecuta ÚNICAMENTE cuando existe una inconsistencia o baja confianza en la
// identificación de emisor/cliente. La detección y la resolución se basan
// EXCLUSIVAMENTE en los RUC extraídos de la factura (nunca en nombres, que son
// ambiguos, incorrectos o inconsistentes):
//   - RUC del emisor  = RUC de la empresa configurada  → COBRAR
//   - RUC del cliente = RUC de la empresa configurada  → PAGAR
//
// Caso especial: si el mismo RUC de la empresa aparece como emisor Y como
// cliente, el documento NO se clasifica automáticamente: se marca para
// revisión y se deja la clasificación sin modificar, registrando observación.
//
// Cuando los RUC no permiten determinar el tipo, no modifica el resultado y
// devuelve una observación para su registro.
// =============================================================================

const RUC_EMPRESA_POR_DEFECTO = "20611842458";
const RAZON_SOCIAL_EMPRESA = "SEAMAR DIVERS INTERNATIONAL S.A.C.";
const PREFIJO_OBSERVACION = "[VALIDACION-RUC]";
const MARCA_REVISION = "REQUIERE REVISION";

export interface DatosValidacionRuc {
  rucEmisor: string | null;
  rucCliente: string | null;
  empresaEmisora: string | null;
  empresaCliente: string | null;
  destino: string | null;
  entidadPrincipal?: string | null;
}

export interface ResultadoValidacionRuc {
  aplicada: boolean;
  inconsistenciaDetectada: boolean;
  requiereRevision: boolean;
  destino: string | null;
  empresaEmisora: string | null;
  empresaCliente: string | null;
  entidadPrincipal: string | null;
  observacion: string | null;
}

// =============================================================================
// RUC Y RAZÓN SOCIAL DE LA EMPRESA CONFIGURADA
// =============================================================================

export function obtenerRucEmpresa(): string {
  return String(process.env.SEAMAR_RUC || RUC_EMPRESA_POR_DEFECTO).replace(
    /\D/g,
    ""
  );
}

export function obtenerRazonSocialEmpresa(): string {
  return RAZON_SOCIAL_EMPRESA;
}

// =============================================================================
// UTILIDADES
// =============================================================================

function normalizarRuc(valor: string | null | undefined): string {
  if (!valor) return "";
  return String(valor).replace(/\D/g, "");
}

function destinoTieneValor(destino: string | null): boolean {
  return destino === "COBRAR" || destino === "PAGAR";
}

// =============================================================================
// VALIDACIÓN DE RESPALDO (basada exclusivamente en RUC)
// =============================================================================

export function validarClasificacionPorRuc(
  datos: DatosValidacionRuc
): ResultadoValidacionRuc {
  const rucEmpresa = obtenerRucEmpresa();

  const rucEmisor = normalizarRuc(datos.rucEmisor);
  const rucCliente = normalizarRuc(datos.rucCliente);

  const emisorEsSeamar = rucEmisor === rucEmpresa && rucEmisor !== "";
  const clienteEsSeamar = rucCliente === rucEmpresa && rucCliente !== "";

  const destinoActual = datos.destino ?? null;
  const destinoSinValor = !destinoTieneValor(destinoActual);

  const base = {
    destino: destinoActual,
    empresaEmisora: datos.empresaEmisora ?? null,
    empresaCliente: datos.empresaCliente ?? null,
    entidadPrincipal: datos.entidadPrincipal ?? null,
  };

  // ---------------------------------------------------------------
  // Caso 1: mismo RUC de la empresa en emisor y cliente.
  // No se clasifica automáticamente: se deja sin modificar y se
  // registra una observación marcando el documento para revisión.
  // ---------------------------------------------------------------
  if (emisorEsSeamar && clienteEsSeamar) {
    return {
      ...base,
      aplicada: false,
      inconsistenciaDetectada: true,
      requiereRevision: true,
      observacion:
        `${PREFIJO_OBSERVACION} ${MARCA_REVISION}: el RUC de la empresa (${rucEmpresa}) aparece como emisor y como cliente. ` +
        `Clasificación incierta, no se modifica el destino (${destinoActual || "null"}). ` +
        `Se requiere revisión manual.`,
    };
  }

  // ---------------------------------------------------------------
  // Caso 2: el RUC del emisor es el de la empresa → COBRAR.
  // El RUC prevalece sobre cualquier señal no confiable (nombre,
  // contexto, destino previo). Solo actúa si hay baja confianza
  // (destino sin valor) o si contradice el destino actual.
  // ---------------------------------------------------------------
  if (emisorEsSeamar) {
    const contradice = destinoTieneValor(destinoActual) && destinoActual !== "COBRAR";

    if (destinoSinValor || contradice) {
      return {
        aplicada: true,
        inconsistenciaDetectada: true,
        requiereRevision: false,
        destino: "COBRAR",
        empresaEmisora: RAZON_SOCIAL_EMPRESA,
        empresaCliente: datos.empresaCliente ?? null,
        entidadPrincipal: datos.empresaCliente ?? null,
        observacion:
          `${PREFIJO_OBSERVACION} El RUC del emisor (${rucEmisor}) corresponde a la empresa configurada (${rucEmpresa}) → COBRAR. ` +
          `El RUC prevalece sobre cualquier señal no confiable y el documento se clasifica como COBRAR.`,
      };
    }
  }

  // ---------------------------------------------------------------
  // Caso 3: el RUC del cliente es el de la empresa → PAGAR.
  // ---------------------------------------------------------------
  if (clienteEsSeamar) {
    const contradice = destinoTieneValor(destinoActual) && destinoActual !== "PAGAR";

    if (destinoSinValor || contradice) {
      return {
        aplicada: true,
        inconsistenciaDetectada: true,
        requiereRevision: false,
        destino: "PAGAR",
        empresaEmisora: datos.empresaEmisora ?? null,
        empresaCliente: RAZON_SOCIAL_EMPRESA,
        entidadPrincipal: datos.empresaEmisora ?? null,
        observacion:
          `${PREFIJO_OBSERVACION} El RUC del cliente (${rucCliente}) corresponde a la empresa configurada (${rucEmpresa}) → PAGAR. ` +
          `El RUC prevalece sobre cualquier señal no confiable y el documento se clasifica como PAGAR.`,
      };
    }
  }

  // ---------------------------------------------------------------
  // Caso 4: baja confianza (destino sin valor) y ningún RUC permite
  // resolver. Se mantiene el comportamiento actual y se registra la
  // observación marcando el documento para revisión.
  // ---------------------------------------------------------------
  if (destinoSinValor) {
    return {
      ...base,
      aplicada: false,
      inconsistenciaDetectada: true,
      requiereRevision: true,
      observacion:
        `${PREFIJO_OBSERVACION} ${MARCA_REVISION}: destino sin determinar y los RUC extraídos ` +
        `(emisor=${rucEmisor || "null"} | cliente=${rucCliente || "null"}) no corresponden a la empresa configurada (${rucEmpresa}). ` +
        `Se mantiene el comportamiento actual.`,
    };
  }

  // ---------------------------------------------------------------
  // Sin inconsistencia ni baja confianza: no se modifica nada.
  // ---------------------------------------------------------------
  return {
    ...base,
    aplicada: false,
    inconsistenciaDetectada: false,
    requiereRevision: false,
    observacion: null,
  };
}
