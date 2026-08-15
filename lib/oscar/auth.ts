import { obtenerSesion } from "@/lib/session";
import { esUsuarioOscar, USUARIO_OSCAR } from "./oscar";
import type { SesionOscar } from "./oscar";

export type ResultadoSesionOscar =
  | { ok: true; sesion: SesionOscar; error: null; status: 200 }
  | { ok: false; sesion: null; error: string; status: 401 | 403 };

export async function requerirSesionOscar(): Promise<ResultadoSesionOscar> {
  const sesion = await obtenerSesion();

  if (!sesion) {
    return { ok: false, sesion: null, error: "No autenticado", status: 401 };
  }

  if (!esUsuarioOscar(sesion)) {
    return { ok: false, sesion: null, error: "Acceso denegado", status: 403 };
  }

  return {
    ok: true,
    sesion: sesion as SesionOscar,
    error: null,
    status: 200,
  };
}

export const mensajeUsuarioOscar = `Módulo exclusivo del usuario ${USUARIO_OSCAR}`;
