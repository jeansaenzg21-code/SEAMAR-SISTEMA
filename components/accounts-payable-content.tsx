"use client"

import { useEffect, useState } from "react"
import {
  Filter,
  Download,
  Search,
  Eye,
  RefreshCw,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Status =
  | "PENDIENTE"
  | "VENCIDO"
  | "PAGADO"

type CuentaPorPagar = {
  id: string
  codigo: string
  proveedor: string
  proyecto: string
  tipo_documento: string
  numero_documento: string
  monto: number
  saldo: number
  estado: Status
  fecha_emision: string
  fecha_vencimiento: string
  archivo_url: string
}

function StatusBadge({ status }: { status: Status }) {
  const label = {
    PENDIENTE: "Pendiente",
    VENCIDO: "Vencido",
    PAGADO: "Pagado",
  }

  const styles = {
    PENDIENTE: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    VENCIDO: "bg-red-500/10 text-red-400 border-red-500/20",
    PAGADO: "bg-green-500/10 text-green-400 border-green-500/20",
  }

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {label[status]}
    </span>
  )
}

export function AccountsPayableContent() {
  const [accountsPayable, setAccountsPayable] = useState<CuentaPorPagar[]>([])
  const [nuevosIds, setNuevosIds] =
  useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState("all")
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const [proveedores, setProveedores] = useState<any[]>([])
  const [mostrarResumen, setMostrarResumen] =
  useState(false);

const [resultadoSync, setResultadoSync] =
  useState<any>(null);

const [sincronizando, setSincronizando] =
  useState(false);

const [progreso, setProgreso] =
  useState(0);

const [mensajeProgreso, setMensajeProgreso] =
  useState("");

const [documentosDetectados, setDocumentosDetectados] =
  useState(0);

  useEffect(() => {
    cargarCuentasPorPagar()
    cargarProveedores()
  }, [])

  const cargarCuentasPorPagar = async (
  cantidadNueva = 0
) => {
    try {
      const response = await fetch("/api/cuentas-por-pagar")
      const data = await response.json()

      setAccountsPayable(data)
      if (cantidadNueva > 0) {

  const idsNuevos =
    data
      .slice(0, cantidadNueva)
      .map((x: any) => Number(x.id));

  setNuevosIds(idsNuevos);

}
    } catch (error) {
      console.error(error)
    }
  }

  const cargarProveedores = async () => {
    try {
      const response = await fetch("/api/proveedores")
      const data = await response.json()

      setProveedores(data)
    } catch (error) {
      console.error(error)
    }
  }

  const sincronizarOneDrive = async () => {

  setSincronizando(true);

  setDocumentosDetectados(0);

  setProgreso(0);

  setMensajeProgreso(
    "Buscando documentos nuevos en OneDrive..."
  );

  try {

    const inicio =
      await fetch(
        "/api/iniciar-sincronizacion",
        {
          method: "POST"
        }
      );

    const data =
      await inicio.json();

    const sincronizacionId =
      data.sincronizacionId;

    fetch(
      "/api/sincronizar-documentos",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          sincronizacionId
        })
      }
    );

    setDocumentosDetectados(
      data.totalDocumentos || 0
    );

    const intervalo =
      setInterval(
        async () => {

          const r =
            await fetch(
              `/api/sincronizaciones/${sincronizacionId}`
            );

          const sync =
            await r.json();

          const porcentaje =
            sync.total_documentos > 0
              ? Math.round(
                  (
                    sync.procesados /
                    sync.total_documentos
                  ) * 100
                )
              : 100;

          setProgreso(
            porcentaje
          );

          setMensajeProgreso(
            sync.mensaje
          );

          if (
            sync.estado ===
            "COMPLETADO"
          ) {

            clearInterval(
              intervalo
            );

            setSincronizando(
              false
            );

            await cargarCuentasPorPagar(
  sync.cuentas_pagar
);

setResultadoSync(sync);

            setMostrarResumen(
              true
            );

          }

        },
        1000
      );

  } catch (error) {

    console.error(error);

    alert(
      "Error al sincronizar"
    );

  }

}

const modalProgreso = (
  sincronizando && (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

      <div className="bg-card border rounded-xl p-6 w-[550px]">

        <div className="flex items-center gap-3 mb-4">

  <RefreshCw
    className="h-6 w-6 text-blue-500 animate-spin"
  />

  <h2 className="text-xl font-bold">
    Sincronizando documentos
  </h2>

</div>

        <p className="mb-2">
          Se detectaron {documentosDetectados} documentos nuevos
        </p>

        <p className="text-xs text-muted-foreground mb-3">
  Analizando documentos y generando movimientos financieros...
</p>

        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">

  <RefreshCw
    className="h-4 w-4 animate-spin"
  />

  <span>
    {mensajeProgreso}
  </span>

</div>

        <div className="w-full bg-secondary rounded-full h-4 overflow-hidden">

          <div
            className="bg-blue-500 h-4 transition-all"
            style={{
              width: `${progreso}%`
            }}
          />

        </div>

        <p className="text-center mt-3 font-medium">
          {progreso}%
        </p>

      </div>

    </div>

  )
);

const modalResumen = (
  mostrarResumen &&
  resultadoSync && (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

      <div className="bg-card border rounded-xl p-6 w-[500px]">

        <h2 className="text-xl font-bold mb-4">
          Sincronización completada
        </h2>

        <p>
          Documentos procesados:
          {resultadoSync.total_documentos}
        </p>

        <p>
          CxP generadas:
          {resultadoSync.cuentas_pagar}
        </p>

        {resultadoSync.cuentas_cobrar > 0 && (
          <p>
            CxC generadas:
            {resultadoSync.cuentas_cobrar}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-6">

          {resultadoSync.cuentas_cobrar > 0 && (

            <Button
              variant="outline"
              onClick={() =>
                window.location.href =
                "/accounts-receivable"
              }
            >
              Ver cuentas por cobrar
            </Button>

          )}

          <Button
            onClick={() =>
              setMostrarResumen(false)
            }
          >
            Aceptar
          </Button>

        </div>

      </div>

    </div>

  )
);

  const filteredAccounts = accountsPayable.filter((item) => {
    if (statusFilter !== "all" && item.estado !== statusFilter) return false
    if (supplierFilter !== "all" && item.proveedor !== supplierFilter) return false

    if (
      searchQuery &&
      !String(item.codigo || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) &&
      !String(item.proveedor || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) &&
      !String(item.tipo_documento || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) &&
      !String(item.numero_documento || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    ) {
      return false
    }

    return true
  })

  const descargarExcel = (item: CuentaPorPagar) => {
    const encabezados = [
      "Código",
      "Proveedor",
      "Proyecto",
      "Tipo Documento",
      "Número Documento",
      "Monto",
      "Saldo",
      "Estado",
      "Fecha Emisión",
      "Fecha Vencimiento",
    ]

    const datos = [
      item.codigo,
      item.proveedor,
      item.proyecto,
      item.tipo_documento,
      item.numero_documento,
      item.monto,
      item.saldo,
      item.estado,
      item.fecha_emision,
      item.fecha_vencimiento,
    ]

    const contenido = [
      encabezados.map((v) => `"${v}"`).join(";"),
      datos.map((v) => `"${v}"`).join(";"),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + contenido], {
      type: "text/csv;charset=utf-8;",
    })

    const url = window.URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `${item.codigo}.csv`
    a.click()

    window.URL.revokeObjectURL(url)
  }

  return (
  <>
    {modalProgreso}
    {modalResumen}

    <div className="min-h-screen">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Cuentas por Pagar
          </h1>

          <p className="text-muted-foreground">
            Gestión documental y financiera de cuentas por pagar
            generadas automáticamente desde documentos.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

              <Input
                placeholder="Buscar cuentas por pagar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 bg-secondary border-border">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="VENCIDO">Vencido</SelectItem>
                <SelectItem value="PAGADO">Pagado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-44 bg-secondary border-border">
                <SelectValue placeholder="Proveedor" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  Todos los proveedores
                </SelectItem>

                {proveedores.map((proveedor) => (
                  <SelectItem
                    key={proveedor.id}
                    value={proveedor.razon_social}
                  >
                    {proveedor.razon_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="icon"
              title="Sincronizar OneDrive"
              onClick={sincronizarOneDrive}
            >
              <RefreshCw className="h-4 w-4 text-blue-500" />
            </Button>

            <Button
              variant="outline"
              className="border-border"
            >
              <Download />
              Exportar
            </Button>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Código</th>
                    <th className="px-4 py-3 text-left font-medium">Proveedor</th>
                    <th className="px-4 py-3 text-left font-medium">Proyecto</th>
                    <th className="px-4 py-3 text-left font-medium">Tipo Doc.</th>
                    <th className="px-4 py-3 text-left font-medium">N° Documento</th>
                    <th className="px-4 py-3 text-left font-medium">Monto</th>
                    <th className="px-4 py-3 text-left font-medium">Saldo</th>
                    <th className="px-4 py-3 text-left font-medium">Estado</th>
                    <th className="px-4 py-3 text-left font-medium">Emisión</th>
                    <th className="px-4 py-3 text-left font-medium">Vencimiento</th>
                    <th className="px-4 py-3 text-left font-medium">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAccounts.map((item) => (
                    <tr key={item.id} className="border-b border-border">
                      <div className="flex items-center gap-2">

  {nuevosIds.includes(
    Number(item.id)
  ) && (

    <div
      className="w-2 h-2 rounded-full bg-blue-500"
    />

  )}

  {item.codigo}

</div>

                      <td className="px-4 py-4">
                        {item.proveedor}
                      </td>

                      <td className="px-4 py-4">
                        {item.proyecto}
                      </td>

                      <td className="px-4 py-4">
                        {item.tipo_documento || "-"}
                      </td>

                      <td className="px-4 py-4 font-medium">
                        {item.numero_documento || "-"}
                      </td>

                      <td className="px-4 py-4">
                        S/ {Number(item.monto).toLocaleString("es-PE")}
                      </td>

                      <td className="px-4 py-4">
                        S/ {Number(item.saldo).toLocaleString("es-PE")}
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={item.estado} />
                      </td>

                      <td className="px-4 py-4">
                        {item.fecha_emision
                          ? new Date(item.fecha_emision).toLocaleDateString("es-PE")
                          : "-"}
                      </td>

                      <td className="px-4 py-4">
                        {item.fecha_vencimiento
                          ? new Date(item.fecha_vencimiento).toLocaleDateString("es-PE")
                          : "-"}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => {
                              if (item.archivo_url) {
                                window.open(item.archivo_url, "_blank")
                              }
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => descargarExcel(item)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredAccounts.length === 0 && (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        No hay cuentas por pagar registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
        </div>
  </>
  )
}