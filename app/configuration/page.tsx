import type { Metadata } from "next"
import { ConfiguracionContent } from "@/components/configuracion/configuracion-content"

export const metadata: Metadata = {
  title: "Configuración | SEAMAR",
}

export default function ConfiguracionPage() {
  return <ConfiguracionContent />
}