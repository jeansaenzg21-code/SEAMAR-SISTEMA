"use client"

import { useEffect, useState } from "react"
import {
  Filter,
  Download,
  Search,
  Pencil,
  Eye,
  RefreshCw
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
  | "FACTURADO"

type CuentaPorCobrar = {
  id: string
  codigo: string
  cliente: string
  proyecto: string
  numero_factura: string
  monto: number
  saldo: number
  estado: "PENDIENTE" | "VENCIDO" | "FACTURADO"
  fecha_emision: string
  fecha_vencimiento: string

  archivo_url: string
}


function StatusBadge({ status }: { status: Status }) {
  const label = {
    PENDIENTE: "Pendiente",
    VENCIDO: "Vencido",
    FACTURADO: "Facturado",
  }

  const styles = {
    PENDIENTE:
      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",

    VENCIDO:
      "bg-red-500/10 text-red-400 border-red-500/20",

    FACTURADO:
      "bg-green-500/10 text-green-400 border-green-500/20",
  }

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {label[status]}
    </span>
  )
}

export function AccountsReceivableContent() {
  const [accountsReceivable, setAccountsReceivable] = useState<CuentaPorCobrar[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [clientFilter, setClientFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const [clientes, setClientes] = useState<any[]>([])
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
  cargarCuentasPorCobrar()
  cargarClientes()
}, [])

const cargarCuentasPorCobrar = async () => {

  try {

    const response =
      await fetch("/api/cuentas-por-cobrar")

    const data =
      await response.json()

    setAccountsReceivable(data)

  } catch (error) {

    console.error(error)

  }

}

const cargarClientes = async () => {

  try {

    const response =
      await fetch("/api/clientes")

    const data =
      await response.json()

    setClientes(data)

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

    const response =
      await fetch(
        "/api/sincronizar-documentos",
        {
          method: "POST"
        }
      );

    const data =
      await response.json();

setDocumentosDetectados(
  data.documentosProcesados
);

    const sincronizacionId =
  data.sincronizacionId;

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

        await cargarCuentasPorCobrar();

        setResultadoSync(
          sync
        );

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

  const filteredAccounts = accountsReceivable.filter((v) => {
    if (statusFilter !== "all" && v.estado !== statusFilter) return false
    if (clientFilter !== "all" && v.cliente !== clientFilter) return false
    if (
  searchQuery &&
  !String(v.codigo || "")
    .toLowerCase()
    .includes(searchQuery.toLowerCase()) &&
  !String(v.cliente || "")
    .toLowerCase()
    .includes(searchQuery.toLowerCase()) &&
  !String(v.numero_factura || "")
    .toLowerCase()
    .includes(searchQuery.toLowerCase())
) {
  return false
}

    return true
  })


  const descargarExcel = (item: CuentaPorCobrar) => {
  const encabezados = [
    "Código",
    "Cliente",
    "Factura",
    "Monto",
    "Saldo",
    "Estado",
    "Fecha Emisión",
    "Fecha Vencimiento",
  ]

  const datos = [
    item.codigo,
    item.cliente,
    item.numero_factura,
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

const modalProgreso = (
  sincronizando && (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

      <div className="bg-card border rounded-xl p-6 w-[550px]">

        <h2 className="text-xl font-bold mb-4">
          Sincronizando documentos
        </h2>

        <p className="mb-2">
          Se detectaron {documentosDetectados} documentos nuevos
        </p>

        <p className="mb-4 text-sm text-muted-foreground">
          {mensajeProgreso}
        </p>

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
          CxC generadas:
          {resultadoSync.cuentas_cobrar}
        </p>

        {resultadoSync.cuentas_pagar > 0 && (
          <p>
            CxP generadas:
            {resultadoSync.cuentas_pagar}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-6">

          {resultadoSync.cuentas_pagar > 0 && (

            <Button
              variant="outline"
              onClick={() =>
                window.location.href =
                "/cuentas-por-pagar"
              }
            >
              Ver cuentas por pagar
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
  return (
  <>
    
  {modalProgreso}
  {modalResumen}

    <div className="min-h-screen">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
  Cuentas por Cobrar
</h1>

<p className="text-muted-foreground">
  Gestión documental y financiera de cuentas por cobrar
  generadas automáticamente desde documentos.
</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cuentas por cobrar..."
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
  <SelectItem value="all">
    Todos
  </SelectItem>

  <SelectItem value="PENDIENTE">
    Pendiente
  </SelectItem>

  <SelectItem value="VENCIDO">
    Vencido
  </SelectItem>

  <SelectItem value="FACTURADO">
    Facturado
  </SelectItem>
</SelectContent>
            </Select>

            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-44 bg-secondary border-border">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>

  <SelectItem value="all">
    Todos los clientes
  </SelectItem>

  {clientes.map((cliente) => (

    <SelectItem
      key={cliente.id}
      value={cliente.razon_social}
    >
      {cliente.razon_social}
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
    <RefreshCw
      className="h-4 w-4 text-blue-500"
    />
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
<th className="px-4 py-3 text-left font-medium">Cliente</th>
<th className="px-4 py-3 text-left font-medium">Proyecto</th>
<th className="px-4 py-3 text-left font-medium">Factura</th>
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
                      <td className="px-4 py-4 font-medium">
  {item.codigo}
</td>

<td className="px-4 py-4">
  {item.cliente}
</td>

<td className="px-4 py-4">
  {item.proyecto}
</td>

<td className="px-4 py-4 font-medium">
  {item.numero_factura}
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
    ? new Date(item.fecha_emision)
        .toLocaleDateString("es-PE")
    : "-"}
</td>

<td className="px-4 py-4">
  {item.fecha_vencimiento
    ? new Date(item.fecha_vencimiento)
        .toLocaleDateString("es-PE")
    : "-"}
</td>
                    
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Button
  size="icon"
  variant="outline"
  onClick={() =>
    window.open(
      item.archivo_url,
      "_blank"
    )
  }
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