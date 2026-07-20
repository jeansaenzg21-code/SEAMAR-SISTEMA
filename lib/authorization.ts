export type RolSistema = "ADMINISTRADOR" | "SUPERVISOR" | "OPERADOR";

const RUTAS_PERMITIDAS: Record<string, string[]> = {
  SUPERVISOR: ["/dashboard", "/approvals", "/configuracion", "/", "/login"],
};

const APIS_PERMITIDAS: Record<string, string[]> = {
  SUPERVISOR: [
    "/api/auth/session",
    "/api/configuracion/empresa",
    "/api/configuracion/apariencia",
    "/api/configuracion/seguridad",
    "/api/dashboard",
    "/api/actividad",
    "/api/valorizaciones",
    "/api/files/upload",
  ],
};

export function tieneAccesoPagina(rol: string, pathname: string): boolean {
  if (rol === "ADMINISTRADOR") return true;
  const permitidas = RUTAS_PERMITIDAS[rol];
  if (!permitidas) return false;
  return permitidas.some(
    (ruta) => pathname === ruta || pathname.startsWith(ruta + "/")
  );
}

export function tieneAccesoApi(rol: string, pathname: string): boolean {
  if (rol === "ADMINISTRADOR") return true;
  const permitidas = APIS_PERMITIDAS[rol];
  if (!permitidas) return false;
  return permitidas.some(
    (ruta) => pathname === ruta || pathname.startsWith(ruta + "/")
  );
}
