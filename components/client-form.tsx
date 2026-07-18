"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
type ClientFormProps = {
  onClose: () => void
}

export default function ClientForm({
  onClose,
}: ClientFormProps) {
    const [businessName, setBusinessName] = useState("")
    const [ruc, setRuc] = useState("")
    const [rucConsultado, setRucConsultado] = useState("")
    const [status, setStatus] = useState("Activo")
    const [contactoPrincipal, setContactoPrincipal] = useState("")
    const [correo, setCorreo] = useState("")
    const [telefono, setTelefono] = useState("")
    const [direccion, setDireccion] = useState("")
    const correoValido =
  correo === "" ||
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
    
    const isFormValid =
  businessName.trim() !== "" &&
  ruc.trim().length === 11 &&
  status !== "" &&
  (telefono === "" || telefono.length === 9) &&
  correoValido
    const registrarCliente = async () => {
  try {
    if (ruc !== rucConsultado) {
      alert(
        "El RUC fue modificado. Consulte SUNAT nuevamente."
  )
  return
}

    const response = await fetch("/api/clientes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razon_social: businessName,
        ruc,
        estado: status.toUpperCase(),
        contacto_principal: contactoPrincipal,
        correo,
        telefono,
        direccion,
      }),
    })

    const data = await response.json()

    if (data.success) {
  onClose()
} else {
  alert(data.message)
}
  } catch (error) {
    console.error(error)
    alert("Error de conexión")
  }
}
const consultarRuc = async () => {
  if (ruc.length !== 11) {
    alert("El RUC debe tener 11 dígitos")
    return
  }

  try {
    const response = await fetch(
      "/api/sunat/ruc",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          ruc,
        }),
      }
    )

    const data = await response.json()

    if (data.code !== "200") {

  setBusinessName("")
  setDireccion("")
  setRucConsultado("")

  let mensaje =
    "No se pudo consultar el RUC."

  if (
    data.code === "401"
  ) {
    mensaje =
      "El servicio de consulta RUC no está disponible en este momento."
  }

  alert(mensaje)

  return
}

    setBusinessName(
      data.razon_social || ""
    )
    setRucConsultado(ruc)

    setDireccion(
      data.direccion || ""
    )

  } catch (error) {
    console.error(error)
    alert("Error al consultar SUNAT")
  }
}
const handleCancelar = () => {
  setBusinessName("")
  setRuc("")
  setRucConsultado("")
  setStatus("Activo")
  setContactoPrincipal("")
  setCorreo("")
  setTelefono("")
  setDireccion("")

  onClose()
}

  return (
    <div className="max-w-[37.5rem] mx-auto pt-8">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Registrar Cliente</CardTitle>
          <p className="text-xs text-red-400 mt-2">
  * Campos obligatorios
</p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">
                Razón Social *
              </label>
              <Input
  value={businessName}
  onChange={(e) => setBusinessName(e.target.value)}
  maxLength={100}
  placeholder="Ingrese la razón social"
  className={`mt-2 ${
    businessName.trim() === ""
      ? "border-red-500/50"
      : ""
  }`}
/>
            </div>

            <div>
              <label className="text-sm font-medium">
                RUC *
              </label>
              <div className="relative mt-2">
  <Input
    value={ruc}
    onChange={(e) => {
  const nuevoRuc =
    e.target.value
      .replace(/\D/g, "")
      .slice(0, 11)

  setRuc(nuevoRuc)

  setBusinessName("")
  setDireccion("")
  setRucConsultado("")
}}
    maxLength={11}
    placeholder="Ingrese el RUC"
    className={`pr-10 ${
      ruc.length !== 11
        ? "border-red-500/50"
        : ""
    }`}
  />

  <button
    type="button"
    onClick={consultarRuc}
    disabled={ruc.length !== 11}
    className="
      absolute
      right-3
      top-1/2
      -translate-y-1/2
      text-muted-foreground
      hover:text-primary
      disabled:opacity-40
    "
  >
    <Search className="h-4 w-4" />
  </button>
</div>

            </div>
          </div>

          <div>
            <div>
  <label className="text-sm font-medium">
    Estado *
  </label>

  <div className="flex gap-3 mt-3">
    <Badge
      onClick={() => setStatus("Activo")}
      className={`cursor-pointer px-4 py-2 ${
        status === "Activo"
          ? "bg-green-500 text-white"
          : "bg-green-500/10 text-green-500 border border-green-500/30"
      }`}
    >
      Activo
    </Badge>

    <Badge
      onClick={() => setStatus("Suspendido")}
      className={`cursor-pointer px-4 py-2 ${
        status === "Suspendido"
          ? "bg-yellow-500 text-black"
          : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30"
      }`}
    >
      Suspendido
    </Badge>

    <Badge
      onClick={() => setStatus("Inactivo")}
      className={`cursor-pointer px-4 py-2 ${
        status === "Inactivo"
          ? "bg-red-500 text-white"
          : "bg-red-500/10 text-red-500 border border-red-500/30"
      }`}
    >
      Inactivo
    </Badge>
  </div>
</div>
          </div>

          <div>
            <label className="text-sm font-medium">
              Contacto Principal
            </label>
            <Input
  value={contactoPrincipal}
  onChange={(e) => setContactoPrincipal(e.target.value)}
  placeholder="Nombre del contacto"
  className="mt-2"
/>
          </div>

          <div>
            <label className="text-sm font-medium">
              Correo
            </label>
            <Input
  type="email"
  value={correo}
  onChange={(e) => setCorreo(e.target.value)}
  placeholder="correo@empresa.com"
  className={`mt-2 ${
    !correoValido
      ? "border-red-500/50"
      : ""
  }`}
/>
{correo !== "" && !correoValido && (
  <p className="mt-1 text-xs text-red-400">
    Ingrese un correo válido
  </p>
)}
          </div>

          <div>
            <label className="text-sm font-medium">
              Teléfono
            </label>
            <Input
  value={telefono}
  onChange={(e) =>
    setTelefono(
      e.target.value.replace(/\D/g, "")
    )
  }
  maxLength={9}
  placeholder="Ingrese el teléfono"
  className={`mt-2 ${
    telefono !== "" && telefono.length !== 9
      ? "border-red-500/50"
      : ""
  }`}
/>
{telefono !== "" && telefono.length !== 9 && (
  <p className="mt-1 text-xs text-red-400">
    El teléfono debe contener 9 dígitos
  </p>
)}
          </div>

          <div>
            <label className="text-sm font-medium">
              Dirección
            </label>
            <Input
  value={direccion}
  onChange={(e) => setDireccion(e.target.value)}
  placeholder="Ingrese la dirección"
  className="mt-2"
/>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
  variant="outline"
  onClick={handleCancelar}
>
  Cancelar
</Button>

            <Button
  disabled={!isFormValid}
  onClick={registrarCliente}
>
  Registrar Cliente
</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}