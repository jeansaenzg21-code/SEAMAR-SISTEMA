export const USUARIO_OSCAR = "Oscar";

export const NOMBRE_MODULO_OSCAR = "Cuentas por Pagar";

export interface SesionOscar {
  id: number;
  nombre: string;
  usuario: string;
  rol: string;
  cargo?: string | null;
  avatar?: string | null;
  tema?: string;
}

export function esUsuarioOscar(
  sesion: { usuario?: string } | null | undefined
): boolean {
  return sesion?.usuario === USUARIO_OSCAR;
}

export function esRutaOscar(pathname: string): boolean {
  return (
    pathname === "/oscar" ||
    pathname.startsWith("/oscar/") ||
    pathname.startsWith("/api/oscar/")
  );
}
