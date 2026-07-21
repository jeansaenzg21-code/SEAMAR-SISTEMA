import { cookies } from "next/headers";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "app_session";

export async function crearSesion(usuario: {
  id: number;
  nombre: string;
  usuario: string;
  rol: string;
  tema?: string;
  cargo?: string | null;
  avatar?: string | null;
}) {
  const cookieStore = await cookies();

  cookieStore.set(
    COOKIE_NAME,
    JSON.stringify(usuario),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: Number(process.env.SESSION_MAX_AGE_SECONDS) || 28800,
    }
  );
}

export async function obtenerSesion() {
  const cookieStore = await cookies();

  const cookie = cookieStore.get(COOKIE_NAME);

  if (!cookie) return null;

  try {
    return JSON.parse(cookie.value);
  } catch {
    return null;
  }
}

export async function cerrarSesion() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
