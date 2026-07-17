"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, CheckCircle, Mail, KeyRound } from "lucide-react"

type Paso = "correo" | "codigo" | "nueva_password" | "exito"

interface ForgotPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const [paso, setPaso] = useState<Paso>("correo")
  const [correo, setCorreo] = useState("")
  const [codigo, setCodigo] = useState("")
  const [password, setPassword] = useState("")
  const [confirmarPassword, setConfirmarPassword] = useState("")
  const [resetId, setResetId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setPaso("correo")
      setCorreo("")
      setCodigo("")
      setPassword("")
      setConfirmarPassword("")
      setResetId(null)
    }
    onOpenChange(nextOpen)
  }

  async function handleEnviarCorreo(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || "Error al enviar el correo")
        return
      }

      setPaso("codigo")
      toast.success(json.mensaje)
    } catch {
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerificarCodigo(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || "Código inválido")
        return
      }

      setResetId(json.resetId)
      setPaso("nueva_password")
    } catch {
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetId, password, confirmarPassword }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || "Error al restablecer la contraseña")
        return
      }

      setPaso("exito")
      toast.success("Contraseña actualizada correctamente")
    } catch {
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  function volverAlLogin() {
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        {paso === "correo" && (
          <form onSubmit={handleEnviarCorreo}>
            <DialogHeader>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center">Recuperar contraseña</DialogTitle>
              <DialogDescription className="text-center">
                Ingresa el correo registrado y te enviaremos un código de verificación.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="recuperar-correo">Correo electrónico</Label>
                <Input
                  id="recuperar-correo"
                  type="email"
                  required
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar código
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </form>
        )}

        {paso === "codigo" && (
          <form onSubmit={handleVerificarCodigo}>
            <DialogHeader>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center">Código de verificación</DialogTitle>
              <DialogDescription className="text-center">
                Ingresa el código de 6 dígitos que enviamos a tu correo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="recuperar-codigo">Código</Label>
                <Input
                  id="recuperar-codigo"
                  type="text"
                  required
                  maxLength={6}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="bg-secondary border-border text-center text-2xl tracking-[8px]"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button type="submit" className="w-full" disabled={loading || codigo.length !== 6}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verificar código
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setPaso("correo")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </DialogFooter>
          </form>
        )}

        {paso === "nueva_password" && (
          <form onSubmit={handleResetPassword}>
            <DialogHeader>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center">Nueva contraseña</DialogTitle>
              <DialogDescription className="text-center">
                Ingresa tu nueva contraseña.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nueva-password">Nueva contraseña</Label>
                <Input
                  id="nueva-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmar-password">Confirmar contraseña</Label>
                <Input
                  id="confirmar-password"
                  type="password"
                  required
                  minLength={6}
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Restablecer contraseña
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setPaso("codigo")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </DialogFooter>
          </form>
        )}

        {paso === "exito" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
              <DialogTitle className="text-center">Contraseña actualizada</DialogTitle>
              <DialogDescription className="text-center">
                Tu contraseña se actualizó correctamente. Ahora puedes iniciar sesión con tu nueva contraseña.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="pt-4">
              <Button type="button" className="w-full" onClick={volverAlLogin}>
                Volver al inicio de sesión
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
