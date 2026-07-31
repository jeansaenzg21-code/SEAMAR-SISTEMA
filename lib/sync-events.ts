// =============================================================================
// REGISTRO DE EVENTOS DE SINCRONIZACIÓN EN TIEMPO REAL
// =============================================================================
// Almacena en memoria los eventos generados durante una sincronización de
// documentos. El frontend consulta estos eventos mediante el endpoint
// /api/sincronizaciones/:id (mismo patrón de polling que ya existía), por lo
// que NO se modifica la arquitectura ni se toca el esquema de base de datos.
//
// Los eventos son efímeros por diseño: solo existen mientras dura la
// sincronización y la visualización del resumen. Los registros antiguos se
// limpian automáticamente para no acumular memoria.
// =============================================================================

export type NivelEventoSincronizacion =
  | "success"
  | "warning"
  | "info"
  | "error";

export type TipoEventoSincronizacion =
  | "registrada"
  | "duplicada"
  | "descartado"
  | "error"
  | "info";

export interface EventoSincronizacion {
  id: number;
  nivel: NivelEventoSincronizacion;
  tipo: TipoEventoSincronizacion;
  mensaje: string;
  numeroDocumento: string | null;
  motivo: string | null;
  fecha: string;
}

interface RegistroSincronizacion {
  contador: number;
  eventos: EventoSincronizacion[];
}

const registro = new Map<number, RegistroSincronizacion>();

const TIEMPO_MAXIMO_VIDA_MS = 1000 * 60 * 60;

function limpiarRegistrosAntiguos() {
  const ahora = Date.now();

  for (const [id, valor] of registro) {
    const ultimo = valor.eventos[valor.eventos.length - 1];

    if (ultimo && ahora - new Date(ultimo.fecha).getTime() > TIEMPO_MAXIMO_VIDA_MS) {
      registro.delete(id);
    }
  }
}

export function obtenerEventosSincronizacion(
  sincronizacionId: number
): EventoSincronizacion[] {
  limpiarRegistrosAntiguos();

  return registro.get(sincronizacionId)?.eventos ?? [];
}

export function registrarEventoSincronizacion(
  sincronizacionId: number,
  evento: Omit<EventoSincronizacion, "id" | "fecha">
): void {
  limpiarRegistrosAntiguos();

  let estado = registro.get(sincronizacionId);

  if (!estado) {
    estado = { contador: 0, eventos: [] };
    registro.set(sincronizacionId, estado);
  }

  estado.eventos.push({
    ...evento,
    id: ++estado.contador,
    fecha: new Date().toISOString(),
  });
}
