import type { Metadata } from "next"
import Script from "next/script"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "@/lib/theme-provider"
import { RoleProvider } from "@/lib/role-context"
import { obtenerSesion } from "@/lib/session"
import { Toaster } from "sonner"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sistema de Gestión Empresarial",
  description:
    "Plataforma de gestión empresarial con automatización de facturas, centros de costos y gestión documental",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const sesion = await obtenerSesion()

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <Script
          id="oscar-theme-flash-guard"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=window.location.pathname;if(p.indexOf('/oscar')===0){var r=document.documentElement;r.classList.add('oscar-module')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          <RoleProvider sesion={sesion}>
            {children}
          </RoleProvider>

          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
