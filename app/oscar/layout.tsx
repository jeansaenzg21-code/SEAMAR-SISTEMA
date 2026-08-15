import { redirect } from "next/navigation";
import { Manrope, Sora } from "next/font/google";
import { obtenerSesion } from "@/lib/session";
import { esUsuarioOscar } from "@/lib/oscar/oscar";
import { OscarShell } from "@/components/oscar/oscar-shell";
import { OscarTheme } from "@/components/oscar/oscar-theme";

const oscarFont = Manrope({
  subsets: ["latin"],
  variable: "--font-oscar",
});

const displayFont = Sora({
  subsets: ["latin"],
  variable: "--font-oscar-display",
});

export default async function OscarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await obtenerSesion();

  if (!sesion || !esUsuarioOscar(sesion)) {
    redirect("/login");
  }

  return (
    <>
      <OscarTheme fontClass={`${oscarFont.variable} ${displayFont.variable}`} />
      <div
        className={`oscar-module min-h-dvh ${oscarFont.variable} ${displayFont.variable}`}
      >
        <OscarShell>{children}</OscarShell>
      </div>
    </>
  );
}
