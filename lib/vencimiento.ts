// =============================================================================
// FECHA DE VENCIMIENTO POR DEFECTO Y SU ORIGEN
// =============================================================================
// Cuando una cuenta (CxC / CxP) se registra sin fecha de vencimiento, el
// sistema le asigna la fecha del día de registro + 15 días.
// Ejemplo: si se registra hoy 2026-08-28, vence el 2026-09-12.
//
// vencimiento_origen indica de dónde salió la fecha de vencimiento:
//   'FACTURA'  -> extraída directamente de la factura (NO editable)
//   'SISTEMA'  -> asignada automáticamente (+15 días) porque no vino (editable)
//   'MANUAL'   -> ingresada/actualizada por el usuario (editable)
// =============================================================================

export type VencimientoOrigen = "FACTURA" | "SISTEMA" | "MANUAL";

export function fechaVencimientoPorDefecto(): string {
  const ahora = new Date();
  const vence = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 15);

  const anio = vence.getFullYear();
  const mes = String(vence.getMonth() + 1).padStart(2, "0");
  const dia = String(vence.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

export interface VencimientoResuelto {
  fecha: string;
  origen: VencimientoOrigen;
}

// Resuelve la fecha de vencimiento al registrar una cuenta:
// - Si la factura trae su propia fecha -> se conserva con origen 'FACTURA'.
// - Si el usuario la indicó manualmente  -> se conserva con origen 'MANUAL'.
// - Si no viene ninguna                 -> día de registro + 15 días, origen 'SISTEMA'.
export function resolverVencimiento(
  valor: string | null | undefined,
  extraidoFactura: boolean
): VencimientoResuelto {
  const proveido = Boolean(valor && String(valor).trim());

  if (!proveido) {
    return { fecha: fechaVencimientoPorDefecto(), origen: "SISTEMA" };
  }

  return {
    fecha: String(valor).trim(),
    origen: extraidoFactura ? "FACTURA" : "MANUAL",
  };
}