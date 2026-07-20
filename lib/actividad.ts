import pool from "@/lib/mysql";
import type { ResultSetHeader } from "mysql2/promise";

// =============================================================================
// TIPOS DE ACTIVIDAD
// =============================================================================

export type TipoActividad =
  | "cxc"
  | "cxp"
  | "valorizacion"
  | "cliente"
  | "proyecto"
  | "conciliacion"
  | "configuracion";

// =============================================================================
// ACCIONES
// =============================================================================

export type AccionActividad =
  | "crear"
  | "actualizar"
  | "aprobar"
  | "observar"
  | "enviar_revision"
  | "eliminar"
  | "pagar"
  | "cobrar"
  | "importacion"
  | "activar"
  | "desactivar";

// =============================================================================
// INPUT
// =============================================================================

export interface RegistrarActividadInput {
  tipo: TipoActividad;
  accion: AccionActividad;

  titulo: string;
  subtitulo?: string | null;

  usuarioNombre?: string | null;

  referenciaId?: number | null;
}

// =============================================================================
// MODELO
// =============================================================================

export interface ActividadSistema {
  id: number;

  tipo: TipoActividad;
  accion: AccionActividad;

  titulo: string;
  subtitulo: string | null;

  usuarioNombre: string | null;

  referenciaId: number | null;

  leido: boolean;

  createdAt: string;
}

// =============================================================================
// REGISTRAR ACTIVIDAD
// =============================================================================

export async function registrarActividad(
  input: RegistrarActividadInput
): Promise<number> {

  const {
    tipo,
    accion,
    titulo,
    subtitulo = null,
    usuarioNombre = null,
    referenciaId = null,
  } = input;

  const [result] = await pool.query<ResultSetHeader>(
    `
    INSERT INTO actividad_sistema
    (
      tipo,
      accion,
      titulo,
      subtitulo,
      usuario_nombre,
      referencia_id
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      tipo,
      accion,
      titulo.trim(),
      subtitulo?.trim() || null,
      usuarioNombre?.trim() || null,
      referenciaId,
    ]
  );

  return result.insertId;
}