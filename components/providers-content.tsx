"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import ProviderForm from "@/components/provider-form"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Plus,
  ChevronRight,
  MoreVertical,
} from "lucide-react"
import Link from "next/link"
interface Provider {
  id: number
  razon_social: string
  ruc: string
  estado: string
  contacto_principal: string | null
  correo: string | null
}
const colors = [
  "bg-sky-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
]

const getClientColor = (name: string) => {
  let hash = 0

  for (let i = 0; i < name.length; i++) {
    hash += name.charCodeAt(i)
  }

  return colors[Math.abs(hash) % colors.length]
}

export function ProvidersContent() {
  const [open, setOpen] = useState(false)
  const [providers, setProviders] = useState<Provider[]>([])
  const [search, setSearch] = useState("")
  const cargarProveedores = async () => {
  try {
    const response = await fetch("/api/proveedores")
    const data = await response.json()

    setProviders(data)
  } catch (error) {
    console.error(error)
  }
}

const cambiarEstado = async (
  id: number,
  estado: string
) => {
  try {
    const response = await fetch(
      `/api/proveedores/${id}/estado`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          estado,
        }),
      }
    )

    const data = await response.json()

    if (data.success) {
      cargarProveedores()
    }
  } catch (error) {
    console.error(error)
  }
}

useEffect(() => {
  cargarProveedores()
}, [])

const filteredProviders = providers.filter((provider) =>
  provider.razon_social
    .toLowerCase()
    .includes(search.toLowerCase()) ||
  provider.ruc.includes(search)
)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Proveedores
          </h1>
          <p className="text-muted-foreground">
            Gestiona los proveedores registrados en la plataforma
          </p>
        </div>
        
  <Button onClick={() => setOpen(true)}>
  <Plus className="mr-2 h-4 w-4" />
  Agregar Proveedor
</Button>

      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  placeholder="Buscar por razón social o RUC..."
  className="pl-9 bg-card border-border"
/>
      </div>

      


      {/* Clients Grid */}
{filteredProviders.length === 0 ? (
  <Card className="border-dashed">
    <CardContent className="py-10 text-center">
      <p className="text-muted-foreground">
        No hay proveedores registrados
      </p>
    </CardContent>
  </Card>
) : (
  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
    {filteredProviders.map((provider: Provider) => (
      <Card
        key={provider.id}
        className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer h-full"
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
  className={`h-10 w-10 rounded-x1 ${getClientColor(
    provider.razon_social
  )} flex items-center justify-center`}
>
                <span className="text-lg font-bold text-primary-foreground">
                  {provider.razon_social.charAt(0)}
                </span>
              </div>

              <div>
                <CardTitle className="text-lg">
                  {provider.razon_social}
                </CardTitle>

                <p className="text-sm text-muted-foreground">
                  RUC: {provider.ruc}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  provider.estado === "ACTIVO"
                    ? "text-green-500 border-green-500/50"
                    : provider.estado === "SUSPENDIDO"
                    ? "text-yellow-500 border-yellow-500/50"
                    : "text-red-500 border-red-500/50"
                }
              >
                {provider.estado}
              </Badge>

              <DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
    >
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>

  <DropdownMenuContent
    align="end"
    className="min-w-[180px]"
  >
    <DropdownMenuItem
  onClick={() =>
    cambiarEstado(
      provider.id,
      "ACTIVO"
    )
  }
>
  <Badge
    variant="outline"
    className={`w-full justify-center ${
      provider.estado === "ACTIVO"
        ? "text-green-500 border-green-500/50"
        : "opacity-50"
    }`}
  >
    ACTIVO
  </Badge>
</DropdownMenuItem>

    <DropdownMenuItem
  onClick={() =>
    cambiarEstado(
      provider.id,
      "SUSPENDIDO"
    )
  }
>
  <Badge
    variant="outline"
    className={`w-full justify-center ${
      provider.estado === "SUSPENDIDO"
        ? "text-yellow-500 border-yellow-500/50"
        : "opacity-50"
    }`}
  >
    SUSPENDIDO
  </Badge>
</DropdownMenuItem>

    <DropdownMenuItem
  onClick={() =>
    cambiarEstado(
      provider.id,
      "INACTIVO"
    )
  }
>
  <Badge
    variant="outline"
    className={`w-full justify-center ${
      provider.estado === "INACTIVO"
        ? "text-red-500 border-red-500/50"
        : "opacity-50"
    }`}
  >
    INACTIVO
  </Badge>
</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-3 border-t border-border pt-3">
            <div>
              <p className="text-xs text-muted-foreground">
                Contacto
              </p>
              <p className="text-sm font-medium">
                {provider.contacto_principal || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Correo
              </p>
              <p className="text-sm font-medium">
                {provider.correo || "-"}
              </p>
            </div>
          </div>

          <div className="flex justify-end border-t border-border pt-3">
            <Link
              href={`/providers/${provider.id}`}
              className="text-sm text-primary flex items-center gap-1"
            >
              Ver detalles
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
)}
      {open && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    
    {/* Fondo blur */}
    <div
      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    />

    {/* Modal */}
    <div className="relative z-10 w-full max-w-4xl px-4">
      <div className="relative">
        
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 z-20 text-muted-foreground hover:text-white"
        >
          ✕
        </button>

        <ProviderForm
  onClose={() => {
    setOpen(false)
    cargarProveedores()
  }}
/>
      </div>
    </div>
  </div>
)}
    </div>
  )
}
