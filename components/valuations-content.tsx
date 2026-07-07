"use client"

import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { Download, FileText, Filter, MoreVertical, Plus, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DocumentosPreview } from "@/components/DocumentosPreview"

/* ============================================================================
 * 1) TYPES
 * ==========================================================================*/

type ValorizacionStatus = "draft" | "under_review" | "observed" | "approved" | "invoiced"

interface DocumentoValorizacion {
  id: string | number
  nombre?: string
  archivo_nombre?: string
  nombre_archivo?: string
  url?: string
  archivo_url?: string
  [key: string]: unknown
}

interface Valuation {
  id: string
  codigo: string
  client: string
  orden_servicio: string
  type: string
  description: string
  projectName: string
  amount: number
  status: ValorizacionStatus
  date: string
  encargado: string
  archivo_nombre?: string
  observacion_sistema?: string
  archivo_url?: string
  fecha_fin?: string | null
  pu: number
  numero_oc?: string
  numero_requerimiento?: string
  proveedor?: string
  documentos_completos: number
  documentos_adjuntos?: number
  documentos?: DocumentoValorizacion[]
}

interface Cliente {
  id: string | number
  razon_social: string
  [key: string]: unknown
}

interface ProyectoCliente {
  id: string | number
  nombre: string
  tipo?: string
  descripcion?: string
  monto?: number
  [key: string]: unknown
}

/** Shape crudo que devuelve GET /api/valorizaciones (snake_case del backend). */
interface ApiValorizacionItem {
  id: string
  codigo?: string
  proyecto_nombre?: string
  proveedor?: string
  numero_orden_servicio?: string
  negocio_operacion?: string
  descripcion?: string
  monto?: number | string
  pu?: number | string
  documentos_adjuntos?: number | string
  estado?: string
  fecha_ejecucion?: string
  encargado?: string
  archivo_nombre?: string
  archivo_url?: string
  observacion_sistema?: string
  fecha_fin?: string | null
  [key: string]: unknown
}

/** Campos editables del formulario de creación/edición. */
interface ValorizacionFormValues {
  client: string
  type: string
  ordenServicio: string
  description: string
  amount: string
  fecha: string
  encargado: string
  documentos: File[]
}

interface ApiResult {
  success: boolean
  message?: string
  [key: string]: unknown
}

type VistaCliente = "repsol" | "tdp" | "general"

/* ============================================================================
 * 2) CONSTANTES / ENUMS
 * ==========================================================================*/

/**
 * Enum de estados de negocio. Los valores coinciden 1:1 con el tipo
 * `ValorizacionStatus` ya usado en toda la UI, para no romper nada
 * que compare contra los strings literales ("draft", "approved", etc.).
 */
const VALORIZATION_STATUS = {
  DRAFT: "draft",
  UNDER_REVIEW: "under_review",
  OBSERVED: "observed",
  APPROVED: "approved",
  INVOICED: "invoiced",
} as const satisfies Record<string, ValorizacionStatus>

/** Estados tal cual los devuelve/espera el backend (MySQL). */
const VALORIZATION_API_STATUS = {
  BORRADOR: "BORRADOR",
  EN_REVISION: "EN_REVISION",
  OBSERVADO: "OBSERVADO",
  APROBADO: "APROBADO",
} as const

const VALORIZATION_STATUS_LABEL: Record<ValorizacionStatus, string> = {
  draft: "Borrador",
  under_review: "En revisión",
  observed: "Observado",
  approved: "Aprobado",
  invoiced: "Facturado",
}

const VALORIZATION_STATUS_STYLE: Record<ValorizacionStatus, string> = {
  draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  under_review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  observed: "bg-red-500/10 text-red-400 border-red-500/20",
  approved: "bg-green-500/10 text-green-400 border-green-500/20",
  invoiced: "bg-blue-500/10 text-blue-400 border-blue-500/20",
}

/**
 * Reglas de cantidad de documentos requeridos por empresa.
 * Mismo orden y mismos matches que la lógica original
 * (REPSOL -> TDP/TERMINALES -> TRALSA -> 0 por defecto).
 */
const EMPRESA_DOCUMENTOS_REQUERIDOS: Array<{
  match: (nombreEmpresa: string) => boolean
  cantidad: number
}> = [
  { match: (n) => n.includes("REPSOL"), cantidad: 4 },
  { match: (n) => n.includes("TDP") || n.includes("TERMINALES"), cantidad: 3 },
  { match: (n) => n.includes("TRALSA"), cantidad: 5 },
]

/** Etiqueta de la columna "orden de servicio" según la vista de cliente activa. */
const ORDEN_SERVICIO_LABEL: Record<Extract<VistaCliente, "repsol" | "tdp">, string> = {
  repsol: "N° O/T",
  tdp: "N° OS",
}

/* ============================================================================
 * 3) LÓGICA DE NEGOCIO / MAPEOS (funciones puras)
 * ==========================================================================*/

/** BORRADOR/EN_REVISION/OBSERVADO/APROBADO (backend) -> ValorizacionStatus (UI). */
function mapEstadoApiToStatus(estado: string | undefined): ValorizacionStatus {
  switch (estado) {
    case VALORIZATION_API_STATUS.BORRADOR:
      return VALORIZATION_STATUS.DRAFT
    case VALORIZATION_API_STATUS.EN_REVISION:
      return VALORIZATION_STATUS.UNDER_REVIEW
    case VALORIZATION_API_STATUS.OBSERVADO:
      return VALORIZATION_STATUS.OBSERVED
    case VALORIZATION_API_STATUS.APROBADO:
      return VALORIZATION_STATUS.APPROVED
    default:
      return VALORIZATION_STATUS.DRAFT
  }
}

/** Traduce un registro crudo de `/api/valorizaciones` al shape usado por la UI. */
function mapApiItemToValuation(item: ApiValorizacionItem): Valuation {
  return {
    id: item.id,
    codigo: item.codigo || "",
    projectName: item.proyecto_nombre || item.negocio_operacion || "",
    client: item.proveedor || "",
    orden_servicio: item.numero_orden_servicio || "",
    type: item.negocio_operacion || "",
    description: item.descripcion || "",
    amount: Number(item.monto || 0),
    pu: Number(item.pu || 0),
    documentos_adjuntos: Number(item.documentos_adjuntos || 0),
    documentos_completos: Number(item.documentos_adjuntos || 0),
    status: mapEstadoApiToStatus(item.estado),
    date: item.fecha_ejecucion?.split("T")[0] || "",
    encargado: item.encargado || "",
    archivo_nombre: item.archivo_nombre || "",
    archivo_url: item.archivo_url || "",
    observacion_sistema: item.observacion_sistema || "",
    fecha_fin: item.fecha_fin || null,
  }
}

/** % de avance mostrado en el detalle, según estado. */
function getAvanceValorizacion(status: ValorizacionStatus | string): number {
  if (status === VALORIZATION_STATUS.DRAFT) return 10
  if (status === VALORIZATION_STATUS.UNDER_REVIEW) return 40
  if (status === VALORIZATION_STATUS.OBSERVED) return 40
  if (status === VALORIZATION_STATUS.APPROVED) return 100
  return 0
}

/** Cantidad de documentos exigidos según el nombre de la empresa/cliente. */
function getCantidadDocumentosRequeridos(empresa: string): number {
  const nombre = (empresa || "").toUpperCase()
  const regla = EMPRESA_DOCUMENTOS_REQUERIDOS.find((r) => r.match(nombre))
  return regla?.cantidad ?? 0
}

/** Determina qué columnas especiales mostrar en la tabla según el filtro de cliente activo. */
function getVistaCliente(clientFilter: string): VistaCliente {
  const filtro = (clientFilter || "").toUpperCase()
  if (filtro.includes("REPSOL")) return "repsol"
  if (filtro.includes("TERMINALES") || filtro.includes("TDP")) return "tdp"
  return "general"
}

/** Normaliza (sin tildes, mayúsculas) para comparar nombres de cliente. */
function normalizarNombre(valor: string | undefined | null): string {
  return (valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
}

/**
 * Arma el FormData que consumen POST/PATCH /api/valorizaciones,
 * respetando exactamente los mismos nombres de campo del backend.
 */
function buildValorizacionFormData(values: ValorizacionFormValues, proyectoNombre: string): FormData {
  const formData = new FormData()

  formData.append("proveedor", values.client)
  formData.append("ruc", "")
  formData.append("proyecto_id", values.type)
  formData.append("negocio_operacion", proyectoNombre || "")
  formData.append("numero_orden_servicio", values.ordenServicio)
  formData.append("descripcion", values.description)
  formData.append("monto", String(values.amount))
  formData.append("estado", VALORIZATION_API_STATUS.BORRADOR)
  formData.append("moneda", "PEN")
  formData.append("periodo", values.fecha)
  formData.append("fecha_ejecucion", values.fecha)
  formData.append("encargado", values.encargado)

  values.documentos.forEach((doc) => {
    formData.append("documentos", doc)
  })

  return formData
}

/**
 * Regla de negocio: valida la cantidad de documentos requeridos por empresa,
 * salvo que la valorización en edición ya tenga documentos registrados
 * (en ese caso no se exige volver a adjuntar nada).
 */
function validarDocumentosRequeridos(params: {
  client: string
  documentosNuevos: number
  tieneDocumentosExistentes: boolean
}): { valid: boolean; message?: string } {
  const { client, documentosNuevos, tieneDocumentosExistentes } = params

  if (tieneDocumentosExistentes) return { valid: true }

  const requeridos = getCantidadDocumentosRequeridos(client)

  if (requeridos > 0 && documentosNuevos < requeridos) {
    return {
      valid: false,
      message: `Para ${client} debes adjuntar ${requeridos} documentos.`,
    }
  }

  return { valid: true }
}

function formatCurrencyPEN(amount: number | null | undefined): string {
  if (amount == null) return "-"
  return `S/ ${Number(amount).toLocaleString("es-PE")}`
}

/* ============================================================================
 * 4) CAPA DE RED (mismos endpoints y payloads que el componente original)
 * ==========================================================================*/

async function fetchValorizacionesApi(): Promise<ApiValorizacionItem[] | ApiResult> {
  const res = await fetch("/api/valorizaciones")
  return res.json()
}

async function fetchClientesApi(): Promise<Cliente[]> {
  const res = await fetch("/api/clientes")
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

async function fetchProyectosClienteApi(clienteId: string | number): Promise<ProyectoCliente[]> {
  const res = await fetch(`/api/proyectos/cliente/${clienteId}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

async function fetchDocumentosApi(valorizacionId: string): Promise<DocumentoValorizacion[]> {
  const res = await fetch(`/api/valorizaciones/${valorizacionId}/documentos`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

async function eliminarDocumentoApi(documentoId: string | number): Promise<ApiResult> {
  const res = await fetch(`/api/valorizaciones/documentos/${documentoId}`, {
    method: "DELETE",
  })
  return res.json()
}

async function actualizarEstadoApi(
  valorizacionId: string,
  estado: string,
  observacion?: string
): Promise<ApiResult> {
  const res = await fetch(`/api/valorizaciones/${valorizacionId}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(observacion !== undefined ? { estado, observacion } : { estado }),
  })
  return res.json()
}

async function guardarValorizacionApi(editingId: string | null, formData: FormData): Promise<ApiResult> {
  const url = editingId ? `/api/valorizaciones/${editingId}` : "/api/valorizaciones"
  const method = editingId ? "PATCH" : "POST"

  const res = await fetch(url, { method, body: formData })
  return res.json()
}

async function sincronizarOneDriveApi(): Promise<{ nuevos?: number; [key: string]: unknown }> {
  const res = await fetch("/api/sincronizar-valorizaciones", { method: "POST" })
  return res.json()
}

/* ============================================================================
 * 5) HOOKS
 * ==========================================================================*/

/**
 * Dado el nombre de cliente seleccionado en el formulario y la lista de
 * clientes ya cargada, resuelve el `cliente.id` y trae sus proyectos/servicios.
 * Aislado en su propio hook porque solo lo necesita el formulario
 * (no la tabla ni el detalle), y así evita relanzar fetches innecesarios.
 */
function useProyectosCliente(client: string, clientes: Cliente[]) {
  const [proyectosCliente, setProyectosCliente] = useState<ProyectoCliente[]>([])

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      if (!client) {
        setProyectosCliente([])
        return
      }

      const clienteEncontrado = clientes.find((c) => c.razon_social === client)
      if (!clienteEncontrado) return

      try {
        const data = await fetchProyectosClienteApi(clienteEncontrado.id)
        if (!cancelado) setProyectosCliente(data)
      } catch (error) {
        console.error(error)
        if (!cancelado) setProyectosCliente([])
      }
    }

    cargar()
    return () => {
      cancelado = true
    }
  }, [client, clientes])

  return proyectosCliente
}

/**
 * Hook principal: fetch de datos, filtros y acciones de negocio
 * (crear/editar, enviar a revisión, observar, sincronizar, documentos).
 */
function useValorizaciones() {
  const [valuations, setValuations] = useState<Valuation[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  const [statusFilter, setStatusFilter] = useState("all")
  const [clientFilter, setClientFilter] = useState("all")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
const [sincronizando, setSincronizando] = useState(false)
  const cargarValorizaciones = useCallback(async () => {
    try {
      const data = await fetchValorizacionesApi()

      if (!Array.isArray(data)) {
        alert((data as ApiResult)?.message || "Error al cargar valorizaciones")
        console.error("ERROR API VALORIZACIONES:", data)
        setValuations([])
        return
      }

      setValuations(data.map(mapApiItemToValuation))
    } catch (error) {
      console.error(error)
    }
  }, [])

  useEffect(() => {
    cargarValorizaciones()
  }, [cargarValorizaciones])

  useEffect(() => {
    async function cargarClientes() {
      try {
        const data = await fetchClientesApi()
        setClientes(data)
      } catch (error) {
        console.error(error)
        setClientes([])
      }
    }
    cargarClientes()
  }, [])

  const filteredValuations = useMemo(() => {
    return valuations.filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false

      if (
        clientFilter !== "all" &&
        clientFilter !== "TODOS" &&
        normalizarNombre(v.client) !== normalizarNombre(clientFilter) &&
        v.proveedor !== clientFilter
      ) {
        return false
      }

      if (selectedPeriod && !v.date.startsWith(selectedPeriod)) return false

      if (
        searchQuery &&
        !String(v.id).includes(searchQuery) &&
        !v.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !v.orden_servicio.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }

      return true
    })
  }, [valuations, statusFilter, clientFilter, selectedPeriod, searchQuery])

  const vistaCliente = useMemo(() => getVistaCliente(clientFilter), [clientFilter])

  const sincronizarOneDrive = useCallback(async () => {
    try {
    setSincronizando(true)

      const data = await sincronizarOneDriveApi()
      await cargarValorizaciones()
      alert(`Sincronización completada.\nNuevos archivos: ${data.nuevos}`)
    } catch (error) {
      console.error(error)
      alert("Error al sincronizar")
    }finally {
  setSincronizando(false)
}
  }, [cargarValorizaciones])

  const enviarRevision = useCallback(
    async (item: Valuation) => {
      try {
        const observacionAutomatica = !item.archivo_nombre
          ? "Falta adjuntar el documento principal de valorización"
          : ""

        if (observacionAutomatica) {
          const enviarAObservaciones = confirm(
            `Se detectó la siguiente observación:\n\n${observacionAutomatica}\n\n¿Desea enviar la valorización a Observaciones?`
          )
          if (!enviarAObservaciones) return

          const data = await actualizarEstadoApi(
            item.id,
            VALORIZATION_API_STATUS.OBSERVADO,
            observacionAutomatica
          )

          if (!data.success) {
            alert("No se pudo enviar a Observaciones")
            return
          }

          await cargarValorizaciones()
          alert("Valorización enviada a Observaciones")
          return
        }

        const data = await actualizarEstadoApi(item.id, VALORIZATION_API_STATUS.EN_REVISION)

        if (!data.success) {
          alert("No se pudo enviar a revisión")
          return
        }

        await cargarValorizaciones()
        alert("Valorización enviada a revisión")
      } catch (error) {
        console.error(error)
        alert("Error al enviar a revisión")
      }
    },
    [cargarValorizaciones]
  )

  /** Devuelve `success` para que el diálogo de detalle decida si cerrarse. */
  const enviarAObservado = useCallback(
    async (item: Valuation, comentario?: string): Promise<boolean> => {
      try {
        const observacion =
          comentario && comentario.trim() !== ""
            ? comentario.trim()
            : "Corrección solicitada desde Valorizaciones"

        const data = await actualizarEstadoApi(item.id, VALORIZATION_API_STATUS.OBSERVADO, observacion)

        if (!data.success) {
          alert(data.message || "No se pudo enviar a Observaciones")
          return false
        }

        await cargarValorizaciones()
        alert("Enviado a Observaciones")
        return true
      } catch (error) {
        console.error(error)
        alert("Error al enviar a Observaciones")
        return false
      }
    },
    [cargarValorizaciones]
  )

  const fetchDocumentos = useCallback(async (valorizacionId: string): Promise<DocumentoValorizacion[]> => {
    try {
      return await fetchDocumentosApi(valorizacionId)
    } catch (error) {
      console.error(error)
      return []
    }
  }, [])

  const eliminarDocumento = useCallback(async (documentoId: string | number): Promise<ApiResult> => {
    try {
      const data = await eliminarDocumentoApi(documentoId)
      if (!data.success) {
        alert(data.message || "No se pudo eliminar el documento")
      }
      return data
    } catch (error) {
      console.error(error)
      alert("Error al eliminar el documento")
      return { success: false }
    }
  }, [])

  /**
   * Crea o actualiza una valorización. Mantiene la misma validación de
   * documentos por empresa y el mismo contrato de FormData que el original.
   */
  const guardarValorizacion = useCallback(
    async (
      values: ValorizacionFormValues,
      editingId: string | null,
      proyectoNombre: string,
      tieneDocumentosExistentes: boolean
    ): Promise<ApiResult> => {
      if (!values.client || !values.description || !values.amount) {
        const message = "Completa los campos principales"
        alert(message)
        return { success: false, message }
      }

      const validacion = validarDocumentosRequeridos({
        client: values.client,
        documentosNuevos: values.documentos.length,
        tieneDocumentosExistentes,
      })

      if (!validacion.valid) {
        alert(validacion.message)
        return { success: false, message: validacion.message }
      }

      try {
        const formData = buildValorizacionFormData(values, proyectoNombre)
        const data = await guardarValorizacionApi(editingId, formData)

        if (!data.success) {
          alert(data.message)
          return data
        }

        await cargarValorizaciones()
        alert("Valorización registrada correctamente")
        return data
      } catch (error) {
        console.error(error)
        alert("Error al registrar valorización")
        return { success: false }
      }
    },
    [cargarValorizaciones]
  )

  const descargarExcel = useCallback((item: Valuation) => {
    const encabezados = [
      "ID Valorización",
      "Cliente",
      "N° Orden de Servicio",
      "Tipo",
      "Descripción",
      "Monto",
      "Estado",
      "Encargado",
      "Fecha",
    ]

    const datos = [
      item.codigo,
      item.client,
      item.orden_servicio,
      item.type,
      item.description,
      `S/ ${item.amount.toLocaleString("es-PE")}`,
      item.status,
      item.encargado,
      item.date,
    ]

    const contenido = [
      encabezados.map((v) => `"${v}"`).join(";"),
      datos.map((v) => `"${v}"`).join(";"),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `valorizacion-${item.id}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }, [])

  return {
    // datos
    valuations,
    filteredValuations,
    clientes,
    vistaCliente,

    // filtros
    statusFilter,
    setStatusFilter,
    clientFilter,
    setClientFilter,
    selectedPeriod,
    setSelectedPeriod,
    searchQuery,
    setSearchQuery,

    // acciones
    reload: cargarValorizaciones,
    sincronizando,
    sincronizarOneDrive,
    enviarRevision,
    enviarAObservado,
    fetchDocumentos,
    eliminarDocumento,
    guardarValorizacion,
    descargarExcel,
  }
}

/* ============================================================================
 * 6) COMPONENTES DE UI
 * ==========================================================================*/

function StatusBadgeComponent({ status }: { status: ValorizacionStatus }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${VALORIZATION_STATUS_STYLE[status]}`}
    >
      {VALORIZATION_STATUS_LABEL[status]}
    </span>
  )
}

const StatusBadge = memo(StatusBadgeComponent)

interface ValorizacionesTableProps {
  valuations: Valuation[]
  vistaCliente: VistaCliente
  onVer: (item: Valuation) => void
  onEditar: (item: Valuation) => void
  onEnviarRevision: (item: Valuation) => void
  onDescargar: (item: Valuation) => void
}

function ValorizacionesTableComponent({
  valuations,
  vistaCliente,
  onVer,
  onEditar,
  onEnviarRevision,
  onDescargar,
}: ValorizacionesTableProps) {
  // "repsol" y "tdp" muestran la misma columna de orden de servicio,
  // solo cambia la etiqueta del encabezado.
  const mostrarColumnaOrdenServicio = vistaCliente === "repsol" || vistaCliente === "tdp"

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-0">
        <div className="overflow-x-auto rounded-md">
          <table className="w-full table-auto text-sm">
            <thead className="border-b bg-secondary">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide min-w-[120px] whitespace-nowrap">
                  ID
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
                  Cliente
                </th>
                {mostrarColumnaOrdenServicio && (
                  <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
                    {ORDEN_SERVICIO_LABEL[vistaCliente as "repsol" | "tdp"]}
                  </th>
                )}
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
                  Proyecto
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
                  Descripción
                </th>
                {vistaCliente === "repsol" && (
                  <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
                    P. U.
                  </th>
                )}
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
                  Total
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
                  Fecha Inicio
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
                  Fecha Fin
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
                  Estado
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
                  Encargado
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
                  Documentos
                </th>
                <th className="px-4 py-3 text-left font-medium">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {valuations.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="px-5 py-4 font-medium min-w-[120px] whitespace-nowrap">
                    {item.codigo || `VAL-2026-${String(item.id).padStart(3, "0")}`}
                  </td>

                  <td className="px-5 py-4 align-top">{item.client || "-"}</td>

                  {mostrarColumnaOrdenServicio && (
                    <td className="px-5 py-4 whitespace-nowrap align-top">
                      {item.orden_servicio || "-"}
                    </td>
                  )}

                  <td className="px-5 py-4 max-w-[260px] align-top">
                    <p className="line-clamp-2 text-sm font-medium">{item.projectName || "-"}</p>
                  </td>

                  <td className="px-5 py-4 max-w-[320px] align-top">
                    <p className="line-clamp-2 text-sm">{item.description || "-"}</p>
                  </td>

                  {vistaCliente === "repsol" && (
                    <td className="px-5 py-4 whitespace-nowrap align-top">
                      {item.pu ? formatCurrencyPEN(item.pu) : "-"}
                    </td>
                  )}

                  <td className="px-5 py-4 whitespace-nowrap align-top">
                    {item.amount != null ? formatCurrencyPEN(item.amount) : "-"}
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap align-top">{item.date || "-"}</td>

                  <td className="px-5 py-4 whitespace-nowrap align-top">
  {item.status === "approved" && item.fecha_fin
    ? new Date(item.fecha_fin).toLocaleDateString("es-PE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
    : "-"}
</td>

                  <td className="px-5 py-4 min-w-[120px] whitespace-nowrap align-top">
                    <StatusBadge status={item.status} />
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap align-top">{item.encargado || "-"}</td>

                  <td className="px-5 py-4 align-top">
                    {item.archivo_url ? (
                      <a
                        href={item.archivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 text-xs hover:underline"
                      >
                        Ver documento
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {(item.documentos_adjuntos || 0) > 0 ? (
                          <span className="text-green-500 font-medium">Archivos completos</span>
                        ) : (
                          <span className="text-red-500 font-medium">Sin documentos</span>
                        )}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="outline">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onVer(item)}>Ver</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditar(item)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEnviarRevision(item)}>
                          Enviar a revisión
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDescargar(item)}>Descargar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Memoizado: la tabla es la parte más costosa de re-renderizar (puede tener
 * muchas filas). Con los callbacks memoizados en el padre (useCallback) y
 * los datos ya filtrados (useMemo en el hook), esta tabla solo vuelve a
 * renderizar cuando `valuations` o `vistaCliente` realmente cambian.
 */
const ValorizacionesTable = memo(ValorizacionesTableComponent)

const FORM_INICIAL: ValorizacionFormValues = {
  client: "",
  type: "",
  ordenServicio: "",
  description: "",
  amount: "",
  fecha: "",
  encargado: "",
  documentos: [],
}

interface ValorizacionFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingValuation: Valuation | null
  clientes: Cliente[]
  guardarValorizacion: (
    values: ValorizacionFormValues,
    editingId: string | null,
    proyectoNombre: string,
    tieneDocumentosExistentes: boolean
  ) => Promise<ApiResult>
  fetchDocumentos: (id: string) => Promise<DocumentoValorizacion[]>
  eliminarDocumento: (id: string | number) => Promise<ApiResult>
}

function ValorizacionFormModal({
  open,
  onOpenChange,
  editingValuation,
  clientes,
  guardarValorizacion,
  fetchDocumentos,
  eliminarDocumento,
}: ValorizacionFormModalProps) {
  const [form, setForm] = useState<ValorizacionFormValues>(FORM_INICIAL)
  const [documentosExistentes, setDocumentosExistentes] = useState<DocumentoValorizacion[]>([])
  const [isLoadingDocumentosExistentes, setIsLoadingDocumentosExistentes] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const proyectosCliente = useProyectosCliente(form.client, clientes)

  const cargarDocumentosExistentes = useCallback(
    async (id: string) => {
      setIsLoadingDocumentosExistentes(true)
      try {
        const data = await fetchDocumentos(id)
        setDocumentosExistentes(data)
      } finally {
        setIsLoadingDocumentosExistentes(false)
      }
    },
    [fetchDocumentos]
  )

  // Precarga el formulario cada vez que el modal se abre, en modo creación o edición.
  useEffect(() => {
    if (!open) return

    if (editingValuation) {
      setForm({
        client: editingValuation.client,
        type: editingValuation.type,
        ordenServicio: editingValuation.orden_servicio,
        description: editingValuation.description,
        amount: String(editingValuation.amount),
        fecha: editingValuation.date,
        encargado: editingValuation.encargado,
        documentos: [],
      })
      setDocumentosExistentes([])
      cargarDocumentosExistentes(editingValuation.id)
    } else {
      setForm(FORM_INICIAL)
      setDocumentosExistentes([])
    }
  }, [open, editingValuation, cargarDocumentosExistentes])

  const cantidadDocumentosRequeridos = useMemo(
    () => getCantidadDocumentosRequeridos(form.client),
    [form.client]
  )
  const cantidadDocumentosAdjuntos = form.documentos.length
  const tieneDocumentosExistentes = !!editingValuation && documentosExistentes.length > 0

  function actualizarCampo<K extends keyof ValorizacionFormValues>(campo: K, valor: ValorizacionFormValues[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function seleccionarProyecto(proyectoId: string) {
    actualizarCampo("type", proyectoId)

    const proyecto = proyectosCliente.find((p) => String(p.id) === proyectoId)
    if (proyecto) {
      actualizarCampo("description", proyecto.descripcion || proyecto.nombre || "")
      if (proyecto.monto) actualizarCampo("amount", String(proyecto.monto))
    }
  }

  function agregarDocumentos(files: FileList | null) {
    const nuevos = Array.from(files || [])
    setForm((prev) => ({ ...prev, documentos: [...prev.documentos, ...nuevos] }))
  }

  async function handleEliminarDocumento(documentoId: string | number) {
    const confirmar = confirm("¿Desea eliminar este documento?")
    if (!confirmar) return

    const { success } = await eliminarDocumento(documentoId)
    if (success && editingValuation) {
      await cargarDocumentosExistentes(editingValuation.id)
    }
  }

  async function handleGuardar() {
    setIsSaving(true)
    try {
      const proyectoSeleccionado = proyectosCliente.find((p) => String(p.id) === String(form.type))
      const { success } = await guardarValorizacion(
        form,
        editingValuation?.id ?? null,
        proyectoSeleccionado?.nombre || "",
        tieneDocumentosExistentes
      )

      if (success) {
        onOpenChange(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingValuation ? "Editar Valorización" : "Nueva Valorización"}</DialogTitle>
          <DialogDescription>Complete los datos principales de la valorización.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="grid gap-2">
            <Label>Cliente</Label>
            <Select value={form.client} onValueChange={(v) => actualizarCampo("client", v)} disabled={isSaving}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.razon_social}>
                    {cliente.razon_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Servicio / Proyecto</Label>
            <Select value={form.type} onValueChange={seleccionarProyecto} disabled={isSaving}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proyecto o servicio" />
              </SelectTrigger>
              <SelectContent>
                {proyectosCliente.length === 0 ? (
                  <SelectItem value="sin-proyectos" disabled>
                    No hay proyectos/servicios
                  </SelectItem>
                ) : (
                  proyectosCliente.map((proyecto) => (
                    <SelectItem key={proyecto.id} value={String(proyecto.id)}>
                      {proyecto.tipo} - {proyecto.nombre}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>N° Orden de Servicio</Label>
            <Input
              placeholder="Ej: OS-000112"
              value={form.ordenServicio}
              onChange={(e) => actualizarCampo("ordenServicio", e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="grid gap-2">
            <Label>Monto estimado (S/)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => actualizarCampo("amount", e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="grid gap-2">
            <Label>Fecha de Inicio</Label>
            <Input
              type="date"
              value={form.fecha}
              onChange={(e) => actualizarCampo("fecha", e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="grid gap-2 col-span-2">
            <Label>Encargado</Label>
            <Input
              placeholder="Ingrese Encargado"
              value={form.encargado}
              onChange={(e) => actualizarCampo("encargado", e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="grid gap-2 col-span-2">
            <Label>Descripción</Label>
            <Textarea
              placeholder="Introduzca la descripción..."
              value={form.description}
              onChange={(e) => actualizarCampo("description", e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="grid gap-2 col-span-2">
            <Label>Documentos de respaldo</Label>

            {form.client && (
              <div className="rounded-lg border p-3 mb-2">
                <p className="font-medium">Empresa: {form.client}</p>
                <p>Requiere: {cantidadDocumentosRequeridos} documentos</p>
                <p>Adjuntados: {cantidadDocumentosAdjuntos}</p>
              </div>
            )}

            {tieneDocumentosExistentes ? (
              <div className="space-y-3">
                <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-600">
                  Esta valorización ya posee documentos registrados. Elimine primero los documentos
                  existentes para poder cargar nuevos archivos.
                </div>

                <div className="space-y-2">
                  {documentosExistentes.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm">
                          {doc.nombre || doc.archivo_nombre || doc.nombre_archivo || `Documento ${doc.id}`}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {(doc.url || doc.archivo_url) && (
                          <a
                            href={String(doc.url || doc.archivo_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline"
                          >
                            Ver
                          </a>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isSaving}
                          onClick={() => handleEliminarDocumento(doc.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <label
                  htmlFor="documentos"
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center hover:bg-muted/50 ${
                    isSaving ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  <span className="text-sm font-medium">Subir documentos</span>
                  <span className="text-xs text-muted-foreground">
                    Adjunta los archivos requeridos según la empresa
                  </span>
                </label>

                <Input
                  id="documentos"
                  type="file"
                  multiple
                  className="hidden"
                  disabled={isSaving}
                  onChange={(e) => {
                    agregarDocumentos(e.target.files)
                    e.target.value = ""
                  }}
                />

                {form.client && cantidadDocumentosRequeridos > 0 && (
                  <div className="rounded-md bg-muted/40 p-3 text-sm">
                    <span className="font-medium">
                      {cantidadDocumentosAdjuntos}/{cantidadDocumentosRequeridos}
                    </span>{" "}
                    documentos adjuntos requeridos para {form.client}
                  </div>
                )}

                {form.documentos.length > 0 && (
                  <div className="space-y-1">
                    {form.documentos.map((doc, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        {index + 1}. {doc.name}
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={isSaving}>
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {editingValuation ? "Actualizando..." : "Guardando..."}
              </>
            ) : editingValuation ? (
              "Actualizar Valorización"
            ) : (
              "Crear Valorización"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ValorizacionDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  valuation: Valuation | null
  enviarAObservado: (item: Valuation, comentario?: string) => Promise<boolean>
}

function ValorizacionDetailDialog({
  open,
  onOpenChange,
  valuation,
  enviarAObservado,
}: ValorizacionDetailDialogProps) {
  const [comentarioObservacion, setComentarioObservacion] = useState("")

  if (!valuation) return null

  async function handleEnviarAObservado() {
    const success = await enviarAObservado(valuation!, comentarioObservacion)
    if (success) {
      setComentarioObservacion("")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{valuation.codigo}</p>

            <DialogTitle className="text-xl">{valuation.description || "Sin proyecto"}</DialogTitle>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <StatusBadge status={valuation.status} />
              <span>{valuation.client}</span>
              <span>·</span>
              <span>{valuation.date}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 border-y py-6">
          <div className="rounded-lg border p-4 text-center">
            <p className="text-xs text-muted-foreground">MONTO</p>
            <p className="text-lg font-bold">S/ {Number(valuation.amount).toLocaleString("es-PE")}</p>
          </div>

          <div className="rounded-lg border p-4 text-center">
            <p className="text-xs text-muted-foreground">AVANCE</p>
            <p className="text-lg font-bold">{getAvanceValorizacion(valuation.status)}%</p>
          </div>

          <div className="rounded-lg border p-4 text-center">
            <p className="text-xs text-muted-foreground">RESP.</p>
            <p className="text-lg font-bold">{valuation.encargado || "Sin responsable"}</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground">DOCUMENTOS ADJUNTOS</p>
          <DocumentosPreview documentos={valuation.documentos} />
        </div>

        <div className="space-y-4 pt-4">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground">LÍNEA DE APROBACIÓN</p>

          <div className="border-l pl-4 space-y-5">
            <div>
              <p className="font-semibold">A. Rivas · SEAMAR</p>
              <p className="text-sm text-muted-foreground">Creación de borrador</p>
              <p className="text-xs text-muted-foreground">{valuation.date}</p>
            </div>

            <div>
              <p className="font-semibold">{valuation.encargado || "Responsable"} · SEAMAR</p>
              <p className="text-sm text-muted-foreground">Envió a cliente para revisión</p>
              <p className="text-xs text-muted-foreground">En revisión</p>
            </div>

            <div>
              <p className="font-semibold">Cliente · {valuation.client}</p>
              <p className="text-sm text-muted-foreground">Pendiente de aprobación</p>
              <p className="text-xs text-muted-foreground">—</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground">OBSERVACIONES</p>

          <div className="rounded-lg border bg-muted/30 p-4">
            {valuation.observacion_sistema ? (
              <p className="text-sm">{valuation.observacion_sistema}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No hay observaciones registradas.</p>
            )}

            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Responder observación..."
                value={comentarioObservacion}
                onChange={(e) => setComentarioObservacion(e.target.value)}
              />

              <Button variant="outline" onClick={handleEnviarAObservado}>
                Enviar
              </Button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 border-t bg-background pt-4">
          <Button variant="outline" className="w-full" onClick={handleEnviarAObservado}>
            Solicitar corrección
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ============================================================================
 * 7) COMPONENTE PRINCIPAL (orquestador)
 * ==========================================================================*/

export function ValuationsContent() {
  const {
    filteredValuations,
    clientes,
    vistaCliente,
    statusFilter,
    setStatusFilter,
    sincronizando,
    clientFilter,
    setClientFilter,
    selectedPeriod,
    setSelectedPeriod,
    sincronizarOneDrive,
    enviarRevision,
    enviarAObservado,
    fetchDocumentos,
    eliminarDocumento,
    guardarValorizacion,
    descargarExcel,
  } = useValorizaciones()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingValuation, setEditingValuation] = useState<Valuation | null>(null)

  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedValuation, setSelectedValuation] = useState<Valuation | null>(null)
  const [mostrarCompilacion, setMostrarCompilacion] = useState(false)
  const [pasoCompilacion, setPasoCompilacion] = useState(0)

const pasosCompilacion = [
  "Conectando con OneDrive...",
  "Buscando valorizaciones...",
  "Descargando documentos...",
  "Analizando documentos con IA...",
  "Guardando valorizaciones..."
]

  const abrirCreacion = useCallback(() => {
    setEditingValuation(null)
    setIsFormOpen(true)
  }, [])

  const abrirEdicion = useCallback((item: Valuation) => {
    setEditingValuation(item)
    setIsFormOpen(true)
  }, [])

  const abrirDetalle = useCallback(
    async (item: Valuation) => {
      const documentos = await fetchDocumentos(item.id)
      setSelectedValuation({ ...item, documentos })
      setIsDetailOpen(true)
    },
    [fetchDocumentos]
  )

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Valorizaciones</h1>
          <p className="text-muted-foreground">
            Gestión visual de valorizaciones asociadas a clientes, proyectos y órdenes de servicio.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 bg-secondary border-border">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="under_review">En revisión</SelectItem>
                <SelectItem value="observed">Observado</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="invoiced">Facturado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-44 bg-secondary border-border">
                <SelectValue placeholder="Clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Clientes</SelectItem>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.razon_social}>
                    {cliente.razon_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="h-10 w-[180px] rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none [color-scheme:dark]"
            />
          </div>

          <div className="flex gap-3">
            <Button
  variant="ghost"
  onClick={async () => {
  setMostrarCompilacion(true)
  setPasoCompilacion(0)

  const intervalo = setInterval(() => {
    setPasoCompilacion((prev) => (prev < 4 ? prev + 1 : prev))
  }, 1500)

  try {
    await sincronizarOneDrive()
  } finally {
    clearInterval(intervalo)
    setMostrarCompilacion(false)
  }
}}
  disabled={sincronizando}
  title={sincronizando ? "Compilando valorizaciones..." : "Sincronizar OneDrive"}
>
  {sincronizando ? (
    <>
      <RefreshCw className="mr-2 h-4 w-4 animate-spin text-blue-500" />
      Compilando valorizaciones...
    </>
  ) : (
    <RefreshCw className="h-4 w-4 text-blue-500" />
  )}
</Button>

            <Button variant="outline" className="border-border">
              <Download />
              Exportar
            </Button>

            <Button onClick={abrirCreacion}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Valorización
            </Button>
          </div>
        </div>

        <ValorizacionesTable
          valuations={filteredValuations}
          vistaCliente={vistaCliente}
          onVer={abrirDetalle}
          onEditar={abrirEdicion}
          onEnviarRevision={enviarRevision}
          onDescargar={descargarExcel}
        />
      </div>

      <ValorizacionFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editingValuation={editingValuation}
        clientes={clientes}
        guardarValorizacion={guardarValorizacion}
        fetchDocumentos={fetchDocumentos}
        eliminarDocumento={eliminarDocumento}
      />

      <ValorizacionDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        valuation={selectedValuation}
        enviarAObservado={enviarAObservado}
      />
{mostrarCompilacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80">
          <div className="w-[480px] rounded-xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Compilando valorizaciones
                </h2>
                <p className="text-sm text-slate-300">
  {pasosCompilacion[pasoCompilacion]}
</p>
              </div>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-700">
              <div
  className="h-full rounded-full bg-blue-600 transition-all duration-700"
  style={{
    width: `${((pasoCompilacion + 1) / pasosCompilacion.length) * 100}%`,
  }}
/>
            </div>
            <div className="mt-6 space-y-2">
  {pasosCompilacion.map((paso, index) => (
    <div
      key={paso}
      className="flex items-center gap-3 text-sm"
    >
      {index < pasoCompilacion ? (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white text-xs">
          ✓
        </div>
      ) : index === pasoCompilacion ? (
        <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      ) : (
        <div className="h-4 w-4 rounded-full border border-slate-500" />
      )}

      <span
        className={
          index <= pasoCompilacion
            ? "text-white"
            : "text-slate-500"
        }
      >
        {paso}
      </span>
    </div>
  ))}
</div>

            <p className="mt-4 text-sm text-slate-300">
  Paso {pasoCompilacion + 1} de {pasosCompilacion.length}
</p>
          </div>
        </div>
      )}

    </div>
  )
}