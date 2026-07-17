import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { tieneAccesoPagina, tieneAccesoApi } from "@/lib/authorization";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "app_session";

const apiPublicas = [
  "/api/login",
  "/api/auth/session",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-reset-code",
  "/api/configuracion/empresa",
  "/api/files/upload",
];

function esApiPublica(pathname: string) {
  return apiPublicas.some(
    (ruta) => pathname === ruta || pathname.startsWith(ruta + "/")
  );
}

function obtenerRol(request: NextRequest): string | null {
  try {
    const cookie = request.cookies.get(COOKIE_NAME);
    if (!cookie?.value) return null;
    const sesion = JSON.parse(cookie.value);
    return sesion.rol || null;
  } catch {
    return null;
  }
}

const modulosDeshabilitados = [
  "/analytics/profitability",
  "/analytics/cost-centers",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rol = obtenerRol(request);

  // Módulos deshabilitados — 404
  if (modulosDeshabilitados.some(
    (ruta) => pathname === ruta || pathname.startsWith(ruta + "/")
  )) {
    return NextResponse.json(
      { error: "Módulo no disponible" },
      { status: 404 }
    );
  }

  // --- API routes ---
  if (pathname.startsWith("/api/")) {
    if (esApiPublica(pathname)) {
      return NextResponse.next();
    }
    if (!rol) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }
    if (!tieneAccesoApi(rol, pathname)) {
      return NextResponse.json(
        { error: "Acceso denegado" },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  // --- Page routes ---
  if (rol && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!rol && pathname !== "/login" && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (rol && !tieneAccesoPagina(rol, pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
