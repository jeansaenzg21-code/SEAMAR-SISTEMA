import { cookies } from "next/headers";

const COOKIE_NAME = "seamar_session";

export async function crearSesion(usuario: {
  id: number;
  nombre: string;
  usuario: string;
  rol: string;
}) {
  const cookieStore = await cookies();

  cookieStore.set(
    COOKIE_NAME,
    JSON.stringify(usuario),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 horas
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