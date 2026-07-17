"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Anchor, Eye, EyeOff, Loader2 } from "lucide-react"
import { useTheme } from "next-themes"
import type { EmpresaData } from "@/hooks/use-empresa"
import { ForgotPasswordDialog } from "@/components/auth/forgot-password-dialog"

export default function LoginPage() {
  const router = useRouter()
  const { setTheme } = useTheme()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("") 
  const [password, setPassword] = useState("")
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null)
  const [forgotOpen, setForgotOpen] = useState(false)

  useEffect(() => {
    fetch("/api/configuracion/empresa")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json) {
          setEmpresa({
            id: json.id ?? null,
            razonSocial: json.razon_social ?? "",
            nombreComercial: json.nombre_comercial ?? "",
            ruc: json.ruc ?? "",
            direccion: json.direccion ?? "",
            telefono: json.telefono ?? "",
            correo: json.correo ?? "",
            logo: json.logo ?? null,
          })
        }
      })
      .catch(() => {})
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
  email,
  password,
}),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error);
      return;
    }

    if (data.tema) {
      setTheme(data.tema === "CLARO" ? "light" : "dark")
    }

    router.push("/dashboard");
    router.refresh();
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
     
      <div
  className="relative mx-auto"
  style={{ width: "440px" }}
>
        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 flex items-center justify-center mb-5">
            {empresa?.logo ? (
              <img src={empresa.logo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Anchor className="w-12 h-12 text-muted-foreground" />
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {empresa?.nombreComercial || "Plataforma"}
          </h1>
          {empresa?.razonSocial && (
            <p className="text-sm text-muted-foreground/80 mt-1.5">
              {empresa.razonSocial}
            </p>
          )}
        </div>

        <div className="mx-auto w-full rounded-2xl border border-border/60 bg-card/90 shadow-2xl backdrop-blur-md">
          <CardHeader className="space-y-2 pb-6 pt-7">
            <CardTitle className="text-xl text-center">Bienvenido</CardTitle>
            <CardDescription className="text-center">
              Inicia sesión para continuar
            </CardDescription>
          </CardHeader>
          <CardContent className="px-7 pb-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="login-usuario">Usuario</Label>
                <Input
                  id="login-usuario"
                  type="text"
                  autoComplete="off"
                  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="Ingrese su usuario"
                  className="bg-secondary border-border"
                  required
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setForgotOpen(true)}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Ingrese su contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-secondary border-border pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-primary text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
            </form>


          </CardContent>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          © 2026 {empresa?.nombreComercial || "Plataforma"}.
        </p>
      </div>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  )
}