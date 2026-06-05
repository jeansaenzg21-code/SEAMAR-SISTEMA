"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const valuations = [
  {
    id: "VAL-001",
    cliente: "REPSOL",
    proyecto: "Mantenimiento Offshore",
    monto: "S/ 500,000",
    estado: "En revisión",
  },
  {
    id: "VAL-002",
    cliente: "TDP",
    proyecto: "Servicio marítimo",
    monto: "S/ 120,000",
    estado: "Aprobado",
  },
]

export function ValuationsContent() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Valorizaciones</h1>
          <p className="text-muted-foreground">
            Seguimiento económico de proyectos y servicios valorizados.
          </p>
        </div>

        <Button>Nueva Valorización</Button>
      </div>

      <div className="grid gap-4">
        {valuations.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{item.id}</span>
                <Badge>{item.estado}</Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-2">
              <p><strong>Cliente:</strong> {item.cliente}</p>
              <p><strong>Proyecto:</strong> {item.proyecto}</p>
              <p><strong>Monto:</strong> {item.monto}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}