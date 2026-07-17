"use client"

import { useRef, useState, useEffect } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Loader2, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmpresaData {
  logoUrl: string | null
  razonSocial: string
  nombreComercial: string
  ruc: string
  direccion: string
  telefono: string
  correo: string
}

function snakeToCamel(row: any): EmpresaData {
  return {
    logoUrl: row.logo || null,
    razonSocial: row.razon_social || "",
    nombreComercial: row.nombre_comercial || "",
    ruc: row.ruc || "",
    direccion: row.direccion || "",
    telefono: row.telefono || "",
    correo: row.correo || "",
  }
}

export function EmpresaSection() {
  const [data, setData] = useState<EmpresaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch("/api/configuracion/empresa")
        if (res.ok) {
          const json = await res.json()
          if (json) {
            setData(snakeToCamel(json))
          } else {
            setData({
              logoUrl: null,
              razonSocial: "",
              nombreComercial: "",
              ruc: "",
              direccion: "",
              telefono: "",
              correo: "",
            })
          }
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    cargar()
  }, [])

  function updateField<K extends keyof EmpresaData>(field: K, value: EmpresaData[K]) {
    setData((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !data) return
    setLogoFile(file)
    setData((prev) => (prev ? { ...prev, logoUrl: URL.createObjectURL(file) } : prev))
  }

  async function handleSave() {
    if (!data) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append("razon_social", data.razonSocial)
      fd.append("nombre_comercial", data.nombreComercial)
      fd.append("ruc", data.ruc)
      fd.append("direccion", data.direccion)
      fd.append("telefono", data.telefono)
      fd.append("correo", data.correo)
      if (logoFile) {
        fd.append("logo", logoFile)
      }

      const res = await fetch("/api/configuracion/empresa", {
        method: "PUT",
        body: fd,
      })

      const json = await res.json()

      if (!res.ok) throw new Error(json.message || "Error al guardar")

      setLogoFile(null)

      toast.success("Los datos de la empresa se guardaron correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-border/80 bg-card shadow-sm">
        <CardContent className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="border-border/80 bg-card shadow-sm">
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          No se pudieron cargar los datos de la empresa.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/80 bg-card shadow-sm">
      <CardContent className="space-y-10 p-8 sm:p-10">
        {/* Logo */}
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-secondary/70 to-secondary/30 shadow-inner transition-all duration-200 hover:border-primary/40 hover:shadow-md"
            )}
          >
            {data.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.logoUrl} alt="Logo de la empresa" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-9 w-9 text-muted-foreground/70" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/80 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
              <Upload className="h-5 w-5 text-foreground" />
              <span className="text-[11px] font-medium text-foreground">Cambiar</span>
            </div>
          </button>
          <div className="space-y-2">
            <p className="text-base font-semibold tracking-tight">Logo de la empresa</p>
            <p className="text-sm text-muted-foreground/80">
              PNG o JPG, recomendado 256x256px. Se usa en el sistema y en documentos generados.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1"
            >
              <Upload className="mr-2 h-3.5 w-3.5" />
              Cambiar logo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleLogoChange}
              className="hidden"
            />
          </div>
        </div>

        <div className="h-px w-full bg-border/70" />

        {/* Campos */}
        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
          <div className="space-y-2.5">
            <Label htmlFor="razonSocial" className="text-sm font-medium text-foreground/90">
              Razón Social
            </Label>
            <Input
              id="razonSocial"
              value={data.razonSocial}
              onChange={(e) => updateField("razonSocial", e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="nombreComercial" className="text-sm font-medium text-foreground/90">
              Nombre Comercial
            </Label>
            <Input
              id="nombreComercial"
              value={data.nombreComercial}
              onChange={(e) => updateField("nombreComercial", e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="ruc" className="text-sm font-medium text-foreground/90">
              RUC
            </Label>
            <Input
              id="ruc"
              value={data.ruc}
              onChange={(e) => updateField("ruc", e.target.value)}
              inputMode="numeric"
              maxLength={11}
              className="h-11"
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="telefono" className="text-sm font-medium text-foreground/90">
              Teléfono
            </Label>
            <Input
              id="telefono"
              value={data.telefono}
              onChange={(e) => updateField("telefono", e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2.5 sm:col-span-2">
            <Label htmlFor="direccion" className="text-sm font-medium text-foreground/90">
              Dirección
            </Label>
            <Input
              id="direccion"
              value={data.direccion}
              onChange={(e) => updateField("direccion", e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2.5 sm:col-span-2">
            <Label htmlFor="correo" className="text-sm font-medium text-foreground/90">
              Correo electrónico
            </Label>
            <Input
              id="correo"
              type="email"
              value={data.correo}
              onChange={(e) => updateField("correo", e.target.value)}
              className="h-11"
            />
          </div>
        </div>

        <div className="flex justify-end border-t border-border/70 pt-8">
          <Button onClick={handleSave} disabled={saving} size="lg" className="px-6 transition-transform active:scale-[0.98]">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}