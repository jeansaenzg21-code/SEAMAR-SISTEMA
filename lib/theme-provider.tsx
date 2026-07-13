"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

/**
 * Envoltorio delgado sobre next-themes.
 *
 * Por qué next-themes y no un context propio:
 * - Aplica el tema antes del primer paint (evita parpadeo/"flash") inyectando
 *   un script inline, algo que un useEffect + localStorage casero no logra.
 * - Ya resuelve exactamente los 3 requisitos pedidos: aplicar inmediatamente,
 *   afectar toda la app (vía className en <html>) y persistir en localStorage.
 * - Es 1 dependencia muy pequeña (sin sub-dependencias), no un framework de
 *   theming nuevo: encaja con "no usar librerías innecesarias".
 *
 * Uso en app/layout.tsx (root layout), envolviendo <body>:
 *
 *   import { ThemeProvider } from "@/lib/theme-provider"
 *
 *   <html lang="es" suppressHydrationWarning>
 *     <body>
 *       <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
 *         {children}
 *       </ThemeProvider>
 *     </body>
 *   </html>
 *
 * Requisitos adicionales:
 * 1) instalar la dependencia:  npm install next-themes
 * 2) en tailwind.config.ts asegurar:  darkMode: "class"
 * 3) agregar suppressHydrationWarning en la etiqueta <html> (evita warning
 *    de hidratación porque el tema se decide en el cliente antes del paint)
 *
 * defaultTheme="dark" mantiene el comportamiento actual (todo el sistema
 * arranca en oscuro) hasta que el usuario elija explícitamente "Modo Claro"
 * desde Configuración > Apariencia.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}