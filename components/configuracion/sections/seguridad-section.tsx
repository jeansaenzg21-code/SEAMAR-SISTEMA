"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KeyRound, Loader2, ShieldCheck } from "lucide-react"

interface PasswordForm {
  actual: string
  nueva: string
  confirmar: string
}

const EMPTY_FORM: PasswordForm = { actual: "", nueva: "", confirmar: "" }

function validate(form: PasswordForm): string | null {
  if (!form.actual || !form.nueva || !form.confirmar) {
    return "Completa todos los campos"
  }
  if (form.nueva.length < 8) {
    return "La nueva contraseña debe tener al menos 8 caracteres"
  }
  if (form.nueva !== form.confirmar) {
    return "Las contraseñas no coinciden"
  }
  if (form.nueva === form.actual) {
    return "La nueva contraseña debe ser distinta a la actual"
  }
  return null
}

// Simulado: sin backend todavía. Cuando exista, esto se reemplaza por
// PUT /api/configuracion/seguridad/password { actual, nueva } -> 200 | 400
export function SeguridadSection() {
  const [form, setForm] = useState<PasswordForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  function updateField(field: keyof PasswordForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const validationError = validate(form)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast.success("Tu contraseña se actualizó correctamente")
      setForm(EMPTY_FORM)
    }, 600)
  }

  return (
    <Card className="border-border/80 bg-card shadow-sm">
      <CardContent className="p-8 sm:p-10">
        <div className="mb-9 flex items-start gap-4 rounded-xl border border-blue-500/15 bg-blue-500/[0.04] p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
            <ShieldCheck className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight">Cambiar contraseña</p>
            <p className="mt-1 text-sm text-muted-foreground/80">
              Usa una contraseña de al menos 8 caracteres que no uses en otro lugar.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-md space-y-6">
          <div className="space-y-2.5">
            <Label htmlFor="actual" className="flex items-center gap-2 text-sm font-medium text-foreground/90">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
              Contraseña actual
            </Label>
            <Input
              id="actual"
              type="password"
              autoComplete="current-password"
              value={form.actual}
              onChange={(e) => updateField("actual", e.target.value)}
              className="h-11 transition-shadow focus-visible:ring-2"
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="nueva" className="text-sm font-medium text-foreground/90">
              Nueva contraseña
            </Label>
            <Input
              id="nueva"
              type="password"
              autoComplete="new-password"
              value={form.nueva}
              onChange={(e) => updateField("nueva", e.target.value)}
              className="h-11 transition-shadow focus-visible:ring-2"
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="confirmar" className="text-sm font-medium text-foreground/90">
              Confirmar contraseña
            </Label>
            <Input
              id="confirmar"
              type="password"
              autoComplete="new-password"
              value={form.confirmar}
              onChange={(e) => updateField("confirmar", e.target.value)}
              className="h-11 transition-shadow focus-visible:ring-2"
            />
          </div>

          <div className="flex justify-end border-t border-border/70 pt-8">
            <Button type="submit" disabled={saving} size="lg" className="px-6 transition-transform active:scale-[0.98]">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar contraseña
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}