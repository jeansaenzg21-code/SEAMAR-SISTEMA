"use client"

import { Fragment, memo, useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"
import {
  AlertCircle,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Coins,
  Eye,
  FileStack,
  FileText,
  Filter,
  FolderOpen,
  GitBranch,
  Hash,
  Info,
  ListChecks,
  Lock,
  MessageSquare,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UploadCloud,
  User,
  type LucideIcon,
} from "lucide-react"
import { useRol, useUser } from "@/lib/role-context"
import { cacheGet, cacheSet } from "@/lib/simple-cache"

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
import { ExportDialog } from "@/components/export-dialog"
import type { ValorizacionStatus, DocumentoValorizacion } from "@/lib/types"
import { cn, formatCurrency, mapEstadoApiToStatus } from "@/lib/utils"
import { monedaO } from "@/lib/moneda"
import { StatusBadge } from "@/components/status-badge"
import { ValuationMetricsCards } from "@/components/valuation-metrics-cards"

/* ============================================================================
 * 1) TYPES
 * ==========================================================================*/

interface Valuation {
  id: string
  codigo: string
  client: string
  orden_servicio: string
  type: string
  description: string
  projectName: string
  amount: number
  moneda: string
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
  creado_por?: string
enviado_revision_por?: string
aprobado_por?: string
observado_por?: string
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
  moneda?: string
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
  moneda?: string
  documentos_adjuntos?: number | string
  estado?: string
  fecha_ejecucion?: string
  encargado?: string
  archivo_nombre?: string
  archivo_url?: string
  observacion_sistema?: string
  fecha_fin?: string | null
  creado_por?: string
  enviado_revision_por?: string
  aprobado_por?: string
  observado_por?: string
  [key: string]: unknown
  
}

/** Campos editables del formulario de creación/edición. */
interface ValorizacionFormValues {
  client: string
  type: string
  ordenServicio: string
  description: string
  amount: string
  moneda: string
  fecha: string
  encargado: string
  documentos: File[]
}

interface ApiResult {
  success: boolean
  message?: string
  [key: string]: unknown
}

/** Item devuelto por la detección del archivo de importación (ej: hoja del Excel). */
interface ItemDetectado {
  id: string
  nombre: string
}

type VistaCliente = "repsol" | "tdp" | "tralza" | "general"

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
const ORDEN_SERVICIO_LABEL: Record<"repsol" | "tdp" | "tralza", string> = {
  repsol: "N° O/T",
  tdp: "N° OS",
  tralza: "N° OS",
}

/* ============================================================================
 * 3) LÓGICA DE NEGOCIO / MAPEOS (funciones puras)
 * ==========================================================================*/

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
    moneda: monedaO(item.moneda, "SOLES"),
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
    creado_por: item.creado_por,
enviado_revision_por: item.enviado_revision_por,
aprobado_por: item.aprobado_por,
observado_por: item.observado_por,
    documentos: Array.isArray(item.documentos) ? (item.documentos as DocumentoValorizacion[]) : [],
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
  if (filtro.includes("TRANSPORTES") || filtro.includes("TRALZA") || filtro.includes("TRALSA"))
    return "tralza"
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
  formData.append("moneda", monedaO(values.moneda, "SOLES"))
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

/* ============================================================================
 * 4) CAPA DE RED (mismos endpoints y payloads que el componente original)
 * ==========================================================================*/

/**
 * Parsea una respuesta evitando el "Unexpected token '<' ... is not valid JSON"
 * que ocurre cuando el servidor devuelve una página HTML (404/500) en vez de JSON.
 */
async function parseJsonSeguro(res: Response): Promise<unknown> {
  const texto = await res.text()
  try {
    return JSON.parse(texto)
  } catch {
    return null
  }
}

async function fetchValorizacionesApi(): Promise<ApiValorizacionItem[] | ApiResult> {
  const res = await fetch("/api/valorizaciones")
  const data = await parseJsonSeguro(res)
  return Array.isArray(data) ? data : (data as ApiResult) ?? { success: false }
}

const CACHE_KEY_CLIENTES = "clientes"

async function fetchClientesApi(): Promise<Cliente[]> {
  const cached = cacheGet<Cliente[]>(CACHE_KEY_CLIENTES)
  if (cached) return cached
  const res = await fetch("/api/clientes")
  const data = await parseJsonSeguro(res)
  const clientes = Array.isArray(data) ? data : []
  cacheSet(CACHE_KEY_CLIENTES, clientes)
  return clientes
}

async function fetchProyectosClienteApi(clienteId: string | number): Promise<ProyectoCliente[]> {
  const res = await fetch(`/api/proyectos/cliente/${clienteId}`)
  const data = await parseJsonSeguro(res)
  return Array.isArray(data) ? data : []
}

async function fetchDocumentosApi(valorizacionId: string): Promise<DocumentoValorizacion[]> {
  const res = await fetch(`/api/valorizaciones/${valorizacionId}/documentos`)
  if (!res.ok) return []
  const data = await parseJsonSeguro(res)
  return Array.isArray(data) ? (data as DocumentoValorizacion[]) : []
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
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10
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

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredValuations.length / ITEMS_PER_PAGE)), [filteredValuations])

  const paginatedValuations = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredValuations.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredValuations, currentPage])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  const vistaCliente = useMemo(() => getVistaCliente(clientFilter), [clientFilter])

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
        alert(data.mensaje || "Valorización registrada correctamente")
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
      `${monedaO(item.moneda, "SOLES") === "DOLARES" ? "US$" : "S/"} ${item.amount.toLocaleString("es-PE")}`,
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
    paginatedValuations,
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

    // paginación
    currentPage,
    setCurrentPage,
    totalPages,

    // acciones
    reload: cargarValorizaciones,
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
  // "repsol", "tdp" y "tralza" muestran la misma columna de orden de servicio,
  // solo cambia la etiqueta del encabezado.
  const mostrarColumnaOrdenServicio =
    vistaCliente === "repsol" || vistaCliente === "tdp" || vistaCliente === "tralza"

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-0">
        <div className="overflow-x-auto rounded-md hidden lg:block">
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
                    {ORDEN_SERVICIO_LABEL[vistaCliente as "repsol" | "tdp" | "tralza"]}
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
                      {item.pu ? formatCurrency(item.pu, item.moneda) : "-"}
                    </td>
                  )}

                  <td className="px-5 py-4 whitespace-nowrap align-top">
                    {item.amount != null ? formatCurrency(item.amount, item.moneda) : "-"}
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
                        <DropdownMenuItem
                          onClick={() => onEditar(item)}
                          className={item.status === "approved" ? "text-muted-foreground data-[highlighted]:text-muted-foreground" : ""}
                        >
                          {item.status === "approved" ? (
                            <span className="flex items-center gap-2">
                              <Lock className="h-3.5 w-3.5" />
                              Editar
                            </span>
                          ) : (
                            "Editar"
                          )}
                        </DropdownMenuItem>
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

        <p className="text-red-500 lg:hidden">
          Mobile valuations: {valuations.length}
        </p>
        <div className="block lg:hidden space-y-3 mt-4">
          {valuations.map((item) => {
            console.log("MOBILE ITEM", item)
            return (
              <Card key={item.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{item.codigo || item.id}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between"><span>Cliente:</span><span className="text-right font-medium text-foreground">{item.client}</span></div>
                    {item.orden_servicio && <div className="flex justify-between"><span>OS:</span><span className="text-right font-medium text-foreground">{item.orden_servicio}</span></div>}
                    <div className="flex justify-between"><span>Monto:</span><span className="text-right font-medium text-foreground">{formatCurrency(item.amount, item.moneda)}</span></div>
                    <div className="flex justify-between"><span>Periodo:</span><span className="text-right font-medium text-foreground">{item.date}</span></div>
                    {item.projectName && <div className="flex justify-between"><span>Proyecto:</span><span className="text-right font-medium text-foreground">{item.projectName}</span></div>}
                    <div className="flex justify-between"><span>Encargado:</span><span className="text-right font-medium text-foreground">{item.encargado}</span></div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => onVer(item)}>Ver</Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 min-h-[44px]"
                      onClick={() => onEditar(item)}
                    >
                      {item.status === "approved" ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" />
                          Editar
                        </span>
                      ) : (
                        "Editar"
                      )}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="min-h-[44px]"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEnviarRevision(item)}>Enviar a revisión</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDescargar(item)}>Descargar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
  )
})}
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

interface UsuarioSistema {
  id: string | number
  usuario: string
  nombre: string
  cargo?: string | null
  estado?: string
}

/** Observación registrada para una valorización (valorizacion_observaciones). */
interface ObservacionDetalle {
  id: string | number
  tipo?: string
  observacion?: string
  usuario?: string
  fecha?: string
  estado?: string
  fecha_resolucion?: string | null
}

/** Formatea una fecha ISO a dd/MM/yyyy hh:mm (hora local). */
function formatearFechaObservacion(fecha?: string): string {
  if (!fecha) return ""
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return fecha
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${min}`
}

const FORM_INICIAL: ValorizacionFormValues = {
  client: "",
  type: "",
  ordenServicio: "",
  description: "",
  amount: "",
  moneda: "SOLES",
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
  const [usuariosSistema, setUsuariosSistema] = useState<UsuarioSistema[]>([])
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false)

  const proyectosCliente = useProyectosCliente(form.client, clientes)

  useEffect(() => {
    if (!open) return

    let cancelado = false
    setCargandoUsuarios(true)

    fetch("/api/configuracion/usuarios", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelado) return
        const activos = (Array.isArray(data) ? data : []).filter(
          (u: UsuarioSistema) => u?.estado === "ACTIVO" || u?.estado == null
        )
        setUsuariosSistema(activos)
      })
      .catch(() => {
        if (!cancelado) setUsuariosSistema([])
      })
      .finally(() => {
        if (!cancelado) setCargandoUsuarios(false)
      })

    return () => {
      cancelado = true
    }
  }, [open])

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
        moneda: monedaO(editingValuation.moneda, "SOLES"),
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
      if (proyecto.monto != null) actualizarCampo("amount", String(proyecto.monto))
      if (proyecto.moneda) actualizarCampo("moneda", monedaO(proyecto.moneda, "SOLES"))
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
      <DialogContent className="w-full sm:max-w-[46rem] flex flex-col gap-0 p-0 max-h-[90vh] overflow-hidden sm:rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {editingValuation ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </span>
            {editingValuation ? "Editar Valorización" : "Nueva Valorización"}
          </DialogTitle>
          <DialogDescription>
            Complete los datos principales de la valorización. Los campos con{" "}
            <span className="text-destructive">*</span> son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Información general
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Cliente
                  <span className="text-destructive">*</span>
                </Label>
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
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  Servicio / Proyecto
                </Label>
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
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  N° Orden de Servicio
                </Label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    className="pl-9"
                    placeholder="Ej: OS-000112"
                    value={form.ordenServicio}
                    onChange={(e) => actualizarCampo("ordenServicio", e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                  Monto estimado
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Banknote className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    className="pl-9"
                    type="number"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => actualizarCampo("amount", e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                  Moneda
                </Label>
                <Select value={form.moneda} onValueChange={(v) => actualizarCampo("moneda", v)} disabled={isSaving}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOLES">Soles (S/)</SelectItem>
                    <SelectItem value="DOLARES">Dólares (US$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  Fecha de Inicio
                </Label>
                <Input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => actualizarCampo("fecha", e.target.value)}
                  disabled={isSaving}
                  className="[color-scheme:dark]"
                />
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Encargado
                </Label>
                <Select
                  value={form.encargado}
                  onValueChange={(v) => actualizarCampo("encargado", v)}
                  disabled={isSaving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        cargandoUsuarios
                          ? "Cargando usuarios..."
                          : "Seleccione el encargado"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {cargandoUsuarios ? (
                      <SelectItem value="__cargando__" disabled>
                        Cargando usuarios...
                      </SelectItem>
                    ) : usuariosSistema.length === 0 ? (
                      <SelectItem value="__vacio__" disabled>
                        No hay usuarios registrados
                      </SelectItem>
                    ) : (
                      usuariosSistema.map((u) => (
                        <SelectItem key={u.id ?? u.usuario} value={u.nombre}>
                          <span className="flex flex-col">
                            <span>{u.nombre}</span>
                            <span className="text-xs font-normal text-muted-foreground">
                              {u.cargo || u.usuario}
                            </span>
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  Descripción
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  placeholder="Introduzca la descripción..."
                  value={form.description}
                  onChange={(e) => actualizarCampo("description", e.target.value)}
                  disabled={isSaving}
                  className="min-h-[90px] resize-none"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center gap-2">
              <FileStack className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Documentos de respaldo
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-3">
              {form.client && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Empresa
                    </p>
                    <p className="truncate text-sm font-semibold">{form.client}</p>
                  </div>
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Requeridos
                    </p>
                    <p className="text-sm font-semibold">{cantidadDocumentosRequeridos} documento(s)</p>
                  </div>
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Adjuntados
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        cantidadDocumentosRequeridos > 0 &&
                        cantidadDocumentosAdjuntos >= cantidadDocumentosRequeridos
                          ? "text-green-500"
                          : cantidadDocumentosAdjuntos > 0
                            ? "text-yellow-500"
                            : ""
                      }`}
                    >
                      {cantidadDocumentosAdjuntos}
                    </p>
                  </div>
                </div>
              )}

              {tieneDocumentosExistentes ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-600">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Esta valorización ya posee documentos registrados. Elimine primero los documentos
                      existentes para poder cargar nuevos archivos.
                    </span>
                  </div>

                  <div className="space-y-2">
                    {documentosExistentes.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-primary" />
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
                              className="text-xs font-medium text-blue-400 hover:underline"
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
                    className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 ${
                      isSaving ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                      <UploadCloud className="h-6 w-6" />
                    </span>
                    <span className="text-sm font-semibold">Subir documentos</span>
                    <span className="text-xs text-muted-foreground">
                      Arrastra tus archivos aquí o haz clic para seleccionarlos
                    </span>
                    <span className="text-[11px] text-muted-foreground/70">
                      PDF, Excel, imágenes y otros formatos
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
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-2.5">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Progreso de documentos requeridos
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          cantidadDocumentosAdjuntos >= cantidadDocumentosRequeridos
                            ? "text-green-500"
                            : "text-yellow-500"
                        }`}
                      >
                        {cantidadDocumentosAdjuntos}/{cantidadDocumentosRequeridos}
                      </span>
                    </div>
                  )}

                  {form.documentos.length > 0 && (
                    <div className="space-y-2">
                      {form.documentos.map((doc, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5"
                        >
                          <FileText className="h-4 w-4 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{doc.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {doc.size > 1024 * 1024
                                ? `${(doc.size / (1024 * 1024)).toFixed(1)} MB`
                                : `${(doc.size / 1024).toFixed(0)} KB`}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                            #{index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t bg-muted/20 px-6 py-4 sm:items-center sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={isSaving} className="min-w-[190px]">
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {editingValuation ? "Actualizando..." : "Guardando..."}
              </>
            ) : editingValuation ? (
              <>
                <Pencil className="h-4 w-4 mr-2" />
                Actualizar Valorización
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Crear Valorización
              </>
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
  nombreUsuario: string
rolUsuario: string
}

/** Cabecera de sección, con el mismo estilo que el formulario de edición. */
function DetalleSeccion({
  icon: Icon,
  titulo,
}: {
  icon: LucideIcon
  titulo: string
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {titulo}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

/** Fila de resumen (solo lectura), con el dato alineado a la derecha. */
function FilaResumen({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <dt className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </dt>
      <dd className="min-w-0 text-right text-sm font-semibold text-foreground">{value || "—"}</dd>
    </div>
  )
}

function ValorizacionDetailDialog({
  open,
  onOpenChange,
  valuation,
  enviarAObservado,
  nombreUsuario,
  rolUsuario,
}: ValorizacionDetailDialogProps) {
  const [comentarioObservacion, setComentarioObservacion] = useState("")
  const [observacionesDetalle, setObservacionesDetalle] = useState<ObservacionDetalle[]>([])
  const [cargandoObservaciones, setCargandoObservaciones] = useState(false)

  useEffect(() => {
    if (!open || !valuation) return

    let cancelado = false
    setCargandoObservaciones(true)
    setObservacionesDetalle([])

    fetch(`/api/valorizaciones/${valuation.id}/detalle`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: { observaciones?: unknown }) => {
        if (cancelado) return
        setObservacionesDetalle(
          Array.isArray(data.observaciones) ? (data.observaciones as ObservacionDetalle[]) : []
        )
      })
      .catch(() => {
        if (!cancelado) setObservacionesDetalle([])
      })
      .finally(() => {
        if (!cancelado) setCargandoObservaciones(false)
      })

    return () => {
      cancelado = true
    }
  }, [open, valuation])

  if (!valuation) return null

  const esAprobada = valuation.status === "approved"

  async function handleEnviarAObservado() {
    const success = await enviarAObservado(valuation!, comentarioObservacion)
    if (success) {
      setComentarioObservacion("")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-[46rem] flex flex-col gap-0 p-0 max-h-[90vh] overflow-hidden sm:rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex flex-wrap items-center gap-3">
            <span className="flex h-11 w-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Eye className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="mb-0.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Detalle de Valorización
              </span>
              <span className="block text-2xl font-extrabold tracking-tight text-foreground">
                {valuation.codigo || "VAL—"}
              </span>
            </span>
            <span className="ml-auto shrink-0">
              <StatusBadge status={valuation.status} />
            </span>
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-2">
            <span>{valuation.client || "Sin cliente"}</span>
            <span>·</span>
            <span>{valuation.projectName || "Sin proyecto"}</span>
            <span>·</span>
            <span>{valuation.date || "Sin fecha"}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <ValuationMetricsCards items={[
            { label: "MONTO", value: formatCurrency(valuation.amount, valuation.moneda) },
            { label: "AVANCE", value: `${getAvanceValorizacion(valuation.status)}%` },
            {
              label: "DOCUMENTOS",
              value: `${valuation.documentos?.length ?? valuation.documentos_adjuntos ?? 0}`,
            },
          ]} />

          <div>
            <DetalleSeccion icon={ClipboardList} titulo="Información general" />

            <div className="overflow-hidden rounded-2xl border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent px-5 py-4 ring-1 ring-inset ring-primary/10">
                <span className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Banknote className="h-4 w-4" />
                  Monto
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-2xl font-bold tracking-tight">
                    {formatCurrency(valuation.amount, valuation.moneda)}
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      valuation.moneda === "DOLARES"
                        ? "bg-blue-500/15 text-blue-500"
                        : "bg-green-500/15 text-green-500"
                    )}
                  >
                    <Coins className="h-3 w-3" />
                    {valuation.moneda || "SOLES"}
                  </span>
                </span>
              </div>

              <dl className="divide-y divide-border">
                <FilaResumen icon={Building2} label="Cliente" value={valuation.client} />
                <FilaResumen icon={FolderOpen} label="Servicio / Proyecto" value={valuation.projectName} />
                <FilaResumen icon={Hash} label="N° Orden de Servicio" value={valuation.orden_servicio} />
                <FilaResumen icon={CalendarDays} label="Fecha" value={valuation.date} />
                {valuation.pu > 0 && (
                  <FilaResumen icon={Banknote} label="Precio unitario" value={formatCurrency(valuation.pu, valuation.moneda)} />
                )}
                <FilaResumen icon={User} label="Encargado" value={valuation.encargado} />
              </dl>

              {valuation.description && (
                <div className="border-t border-border px-5 py-4">
                  <p className="mb-1.5 flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Descripción
                  </p>
                  <p className="text-sm font-medium leading-relaxed text-foreground">
                    {valuation.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <DetalleSeccion icon={FileStack} titulo="Documentos de respaldo" />

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-lg border bg-card px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Empresa
                  </p>
                  <p className="truncate text-sm font-semibold">{valuation.client || "—"}</p>
                </div>
                <div className="rounded-lg border bg-card px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Requeridos
                  </p>
                  <p className="text-sm font-semibold">
                    {getCantidadDocumentosRequeridos(valuation.client)} documento(s)
                  </p>
                </div>
                <div className="rounded-lg border bg-card px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Adjuntados
                  </p>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      getCantidadDocumentosRequeridos(valuation.client) > 0 &&
                        (valuation.documentos?.length ?? valuation.documentos_adjuntos ?? 0) >=
                          getCantidadDocumentosRequeridos(valuation.client)
                        ? "text-green-500"
                        : (valuation.documentos?.length ?? valuation.documentos_adjuntos ?? 0) > 0
                          ? "text-yellow-500"
                          : ""
                    )}
                  >
                    {valuation.documentos?.length ?? valuation.documentos_adjuntos ?? 0}
                  </p>
                </div>
              </div>

              <DocumentosPreview documentos={valuation.documentos} />
            </div>
          </div>

          <div>
            <DetalleSeccion icon={GitBranch} titulo="Línea de aprobación" />

            <div className="space-y-0 pl-1">
              <div className="relative flex gap-4 pl-4 pb-6">
                <span className="absolute left-[5px] top-1 h-px w-px rounded-full bg-primary/40 ring-4 ring-primary/10" />
                <div className="absolute left-[7px] top-2 h-full w-px bg-border" />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold">
                    {valuation.creado_por || "Sistema"}
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      Borrador
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">Creación de borrador</p>
                  <p className="text-xs text-muted-foreground">{valuation.date || "—"}</p>
                </div>
              </div>

              {valuation.status !== "draft" && (
                <div className="relative flex gap-4 pl-4 pb-6">
                  <span
                    className={cn(
                      "absolute left-[5px] top-1 h-px w-px rounded-full ring-4",
                      valuation.status === "approved" || valuation.status === "invoiced"
                        ? "bg-green-500 ring-green-500/15"
                        : "bg-primary/40 ring-primary/10"
                    )}
                  />
                  <div className={cn(
                    "absolute left-[7px] top-2 h-full w-px",
                    valuation.status === "approved" || valuation.status === "invoiced"
                      ? "bg-green-500/40"
                      : "bg-border"
                  )} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold">
                      {valuation.enviado_revision_por || "Pendiente"}
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        En revisión
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">Envió a cliente para revisión</p>
                  </div>
                </div>
              )}

              {valuation.status === "approved" || valuation.status === "invoiced" ? (
                <div className="relative flex gap-4 pl-4">
                  <span className="absolute left-[5px] top-1 h-px w-px rounded-full bg-green-500 ring-4 ring-green-500/15" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold">
                      {valuation.aprobado_por || "Pendiente"}
                      <span className="flex items-center gap-1 rounded-md bg-green-500/15 px-2 py-0.5 text-[11px] font-medium text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Aprobada
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">Valorización aprobada</p>
                    <p className="text-xs text-muted-foreground">{valuation.fecha_fin || "—"}</p>
                  </div>
                </div>
              ) : valuation.status === "observed" ? (
                <div className="relative flex gap-4 pl-4">
                  <span className="absolute left-[5px] top-1 h-px w-px rounded-full bg-yellow-500 ring-4 ring-yellow-500/15" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold">
                      {valuation.observado_por || "Pendiente"}
                      <span className="rounded-md bg-yellow-500/15 px-2 py-0.5 text-[11px] font-medium text-yellow-600">
                        Observada
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">Corrección solicitada por el cliente</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <DetalleSeccion icon={MessageSquare} titulo="Observaciones" />

            {cargandoObservaciones ? (
              <p className="text-sm text-muted-foreground">Cargando observaciones...</p>
            ) : observacionesDetalle.length === 0 &&
              !valuation.observacion_sistema ? (
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">No hay observaciones registradas.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {observacionesDetalle.length === 0 && valuation.observacion_sistema && (
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-sm">{valuation.observacion_sistema}</p>
                  </div>
                )}

                {observacionesDetalle.map((obs) => (
                  <div key={obs.id} className="rounded-lg border bg-muted/20 p-4">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          obs.tipo === "SISTEMA"
                            ? "bg-blue-500/15 text-blue-500"
                            : "bg-amber-500/15 text-amber-600"
                        )}
                      >
                        {obs.tipo || "SISTEMA"}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          obs.estado === "RESUELTA"
                            ? "bg-green-500/15 text-green-600"
                            : obs.estado === "EN_PROGRESO"
                              ? "bg-yellow-500/15 text-yellow-600"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {obs.estado || "PENDIENTE"}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{obs.observacion}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>Registrada por {obs.usuario || "Sistema"}</span>
                      <span>·</span>
                      <span>{formatearFechaObservacion(obs.fecha)}</span>
                      {obs.estado === "RESUELTA" && obs.fecha_resolucion && (
                        <>
                          <span>·</span>
                          <span>Resuelta {formatearFechaObservacion(obs.fecha_resolucion)}</span>
                        </>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {esAprobada && (
              <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                Valorización aprobada: no puedes enviar comentarios ni solicitar correcciones.
              </p>
            )}

            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Comentario para el cliente..."
                value={comentarioObservacion}
                onChange={(e) => setComentarioObservacion(e.target.value)}
                disabled={esAprobada}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !esAprobada) handleEnviarAObservado()
                }}
              />
              <Button variant="outline" onClick={handleEnviarAObservado} disabled={esAprobada}>
                Enviar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t bg-muted/20 px-6 py-4 sm:items-center sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            variant="outline"
            onClick={handleEnviarAObservado}
            disabled={esAprobada}
            className="text-destructive"
            title={
              esAprobada
                ? "No puedes solicitar una corrección en una valorización aprobada"
                : undefined
            }
          >
            {esAprobada ? (
              <span className="flex items-center gap-1.5">
                <Lock className="h-4 w-4" />
                Solicitar corrección
              </span>
            ) : (
              <>
                <MessageSquare className="h-4 w-4 mr-2" />
                Solicitar corrección
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ============================================================================
 * 7) COMPONENTE PRINCIPAL (orquestador)
 * ==========================================================================*/

export function ValuationsContent() {
  const {
    valuations,
    filteredValuations,
    paginatedValuations,
    clientes,
    vistaCliente,
    statusFilter,
    setStatusFilter,
    clientFilter,
    setClientFilter,
    selectedPeriod,
    setSelectedPeriod,
    enviarRevision,
    enviarAObservado,
    fetchDocumentos,
    eliminarDocumento,
    guardarValorizacion,
    descargarExcel,
    reload: cargarValorizaciones,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useValorizaciones()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [mostrarImportador, setMostrarImportador] = useState(false)
  const [mostrarExportador, setMostrarExportador] = useState(false)
  const [empresaImportacion, setEmpresaImportacion] = useState("")
  const [archivoImportacion, setArchivoImportacion] = useState<File | null>(null)
  const [analizando, setAnalizando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [itemsImportacion, setItemsImportacion] = useState<ItemDetectado[]>([])
  const [seleccionImportacion, setSeleccionImportacion] = useState<string[]>([])
  const [busquedaImportacion, setBusquedaImportacion] = useState("")
  const [errorImportacion, setErrorImportacion] = useState<string | null>(null)
  const [resultadoImportacion, setResultadoImportacion] = useState<number | null>(null)
  const [editingValuation, setEditingValuation] = useState<Valuation | null>(null)

  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedValuation, setSelectedValuation] = useState<Valuation | null>(null)

  const { rol: rolUsuario } = useRol()
  const sesionUsuario = useUser()
  const nombreUsuario = sesionUsuario?.nombre || "Usuario"

  const abrirCreacion = useCallback(() => {
    setEditingValuation(null)
    setIsFormOpen(true)
  }, [])

  const abrirEdicion = useCallback((item: Valuation) => {
    if (item.status === "approved") {
      toast.error("Ya no puedes editar una valorización aprobada")
      return
    }
    setEditingValuation(item)
    setIsFormOpen(true)
  }, [])

  const abrirDetalle = useCallback(
    async (item: Valuation) => {
      const yaTieneDocumentos = Array.isArray(item.documentos) && item.documentos.length > 0
      const documentos = yaTieneDocumentos ? item.documentos : await fetchDocumentos(item.id)
      setSelectedValuation({ ...item, documentos })
      setIsDetailOpen(true)
    },
    [fetchDocumentos]
  )

  /* ==========================================================================
   * Flujo de importación (Analizar archivo -> Seleccionar -> Importar)
   * =========================================================================*/

  const pasoImportacion: 1 | 2 | 3 = resultadoImportacion !== null ? 3 : itemsImportacion.length > 0 ? 2 : 1

  const itemsImportacionFiltrados = useMemo(() => {
    const termino = busquedaImportacion.trim().toLowerCase()
    if (!termino) return itemsImportacion
    return itemsImportacion.filter((item) => item.nombre.toLowerCase().includes(termino))
  }, [itemsImportacion, busquedaImportacion])

  const resetImportacion = useCallback(() => {
    setEmpresaImportacion("")
    setArchivoImportacion(null)
    setItemsImportacion([])
    setSeleccionImportacion([])
    setBusquedaImportacion("")
    setErrorImportacion(null)
    setResultadoImportacion(null)
  }, [])

  const cerrarImportacion = useCallback(() => {
    if (analizando || importando) return
    setMostrarImportador(false)
    resetImportacion()
  }, [analizando, importando, resetImportacion])

  const volverAArchivo = useCallback(() => {
    setItemsImportacion([])
    setSeleccionImportacion([])
    setBusquedaImportacion("")
    setErrorImportacion(null)
  }, [])

  const cambiarEmpresaImportacion = useCallback(
    (empresa: string) => {
      setEmpresaImportacion(empresa)
      setArchivoImportacion(null)
      setItemsImportacion([])
      setSeleccionImportacion([])
      setBusquedaImportacion("")
      setErrorImportacion(null)
      setResultadoImportacion(null)
    },
    []
  )

  const toggleValorizacionImportacion = useCallback((id: string) => {
    setSeleccionImportacion((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    )
  }, [])

  const analizarArchivoImportacion = useCallback(async () => {
    if (analizando || importando || !empresaImportacion || !archivoImportacion) return

    setAnalizando(true)
    setErrorImportacion(null)
    setResultadoImportacion(null)

    try {
      const formData = new FormData()
      formData.append("empresa", empresaImportacion)
      formData.append("archivo", archivoImportacion)

      const res = await fetch("/api/importar-valorizacion", { method: "POST", body: formData })
      const data = (await parseJsonSeguro(res)) as
        | { success?: boolean; items?: ItemDetectado[]; error?: string }
        | null

      if (!data?.success) {
        setErrorImportacion(data?.error || "No se pudo analizar el archivo")
        setItemsImportacion([])
        setSeleccionImportacion([])
        return
      }

      if (!data.items || data.items.length === 0) {
        setErrorImportacion(
          empresaImportacion === "REPSOL"
            ? "No se encontraron hojas de valorización (VAL...) en el archivo Excel."
            : "No se encontraron valorizaciones en el archivo."
        )
        setItemsImportacion([])
        setSeleccionImportacion([])
        return
      }

      setItemsImportacion(data.items)
      setSeleccionImportacion(data.items.map((item) => item.id))
      setBusquedaImportacion("")
    } catch (error) {
      console.error(error)
      setErrorImportacion("Error al analizar el archivo")
    } finally {
      setAnalizando(false)
    }
  }, [analizando, importando, empresaImportacion, archivoImportacion])

  const importarSeleccionadas = useCallback(async () => {
    if (importando || analizando || seleccionImportacion.length === 0) return

    setImportando(true)
    setErrorImportacion(null)

    try {
      const formData = new FormData()
      formData.append("empresa", empresaImportacion)
      formData.append("archivo", archivoImportacion!)
      formData.append("valorizaciones", JSON.stringify(seleccionImportacion))

      const res = await fetch("/api/importar-valorizacion", { method: "POST", body: formData })
      const data = (await parseJsonSeguro(res)) as
        | { success?: boolean; creadas?: number; data?: unknown[]; error?: string }
        | null

      if (!data?.success) {
        setErrorImportacion(data?.error || "Error al importar valorizaciones")
        return
      }

      setResultadoImportacion(Number(data.creadas) || 0)
      await cargarValorizaciones()
    } catch (error) {
      console.error(error)
      setErrorImportacion("Error al importar valorizaciones")
    } finally {
      setImportando(false)
    }
  }, [importando, analizando, seleccionImportacion, empresaImportacion, archivoImportacion, cargarValorizaciones])

  const pasosImportacion = [
    { n: 1, etiqueta: "Archivo" },
    { n: 2, etiqueta: "Selección" },
    { n: 3, etiqueta: "Resultado" },
  ] as const

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
              <SelectTrigger className="w-full lg:w-44 bg-secondary border-border">
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
              <SelectTrigger className="w-full lg:w-44 bg-secondary border-border">
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
              className="h-10 w-full lg:w-[180px] rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none [color-scheme:dark]"
            />
          </div>

          <div className="flex flex-wrap gap-3">

            <Button variant="outline" className="border-border w-full lg:w-auto" onClick={() => setMostrarExportador(true)}>
              <FileText />
              Exportar
            </Button>

            <Button onClick={abrirCreacion} className="w-full lg:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Valorización
            </Button>
           <Button
  variant="outline"
  onClick={() => setMostrarImportador(true)}
  className="w-full lg:w-auto"
>
  <FileText className="h-4 w-4 mr-2" />
  Importar Valorización
</Button>
          </div>
        </div>

        <ValorizacionesTable
          valuations={paginatedValuations}
          vistaCliente={vistaCliente}
          onVer={abrirDetalle}
          onEditar={abrirEdicion}
          onEnviarRevision={enviarRevision}
          onDescargar={descargarExcel}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {(currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, filteredValuations.length)} de {filteredValuations.length} valorizaciones
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center gap-1">
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-muted-foreground">...</span>
                    )}
                    <Button
                      variant={currentPage === p ? "default" : "outline"}
                      size="sm"
                      className="min-w-[36px]"
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </Button>
                  </span>
                ))}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
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
  nombreUsuario={nombreUsuario}
  rolUsuario={rolUsuario}
/>
<Dialog
  open={mostrarImportador}
  onOpenChange={(next) => {
    if (next) {
      setMostrarImportador(true)
      return
    }
    cerrarImportacion()
  }}
>
  <DialogContent className="w-full sm:max-w-[42rem] max-h-[85vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-xl">
        <FileStack className="h-5 w-5 text-primary" />
        Importar valorización
      </DialogTitle>
      <DialogDescription>
        {pasoImportacion === 1
          ? "Seleccione la empresa y el archivo, luego analícelo para detectar las valorizaciones."
          : pasoImportacion === 2
            ? `Se detectaron ${itemsImportacion.length} valorizaciones en el archivo. Marque las que desea importar.`
            : "Resumen de la importación."}
      </DialogDescription>
    </DialogHeader>

    {/* Indicador de pasos */}
    <div className="flex items-center gap-3 border-b border-border pb-4">
      {pasosImportacion.map((paso, index) => (
        <Fragment key={paso.n}>
          <div className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                paso.n < pasoImportacion
                  ? "bg-primary/15 text-primary"
                  : paso.n === pasoImportacion
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {paso.n < pasoImportacion ? (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                paso.n
              )}
            </div>
            <span
              className={`text-xs font-medium ${
                paso.n === pasoImportacion ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {paso.etiqueta}
            </span>
          </div>
          {index < pasosImportacion.length - 1 && (
            <div className={`h-px flex-1 ${paso.n < pasoImportacion ? "bg-primary/40" : "bg-border"}`} />
          )}
        </Fragment>
      ))}
    </div>

    <div className="space-y-5 py-4">
      {/* Error */}
      {errorImportacion && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorImportacion}</span>
        </div>
      )}

      {/* PASO 1: Empresa + Archivo */}
      {pasoImportacion === 1 && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Empresa
              </span>
            </div>
            <div className="p-4">
              <Select
                value={empresaImportacion}
                onValueChange={cambiarEmpresaImportacion}
                disabled={analizando || importando}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REPSOL">REPSOL</SelectItem>
                  <SelectItem value="TDP">TERMINALES DEL PERÚ</SelectItem>
                  <SelectItem value="TRALZA">TRANSPORTES Y ALMACENAMIENTO DE LIQUIDOS S.A. - TRALSA</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">
                {empresaImportacion === "REPSOL"
                  ? "Formato Excel (.xlsx, .xls) con una hoja por valorización."
                  : empresaImportacion
                    ? "Archivo PDF de la valorización."
                    : "Seleccione una empresa para ver el formato aceptado."}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Archivo
              </span>
            </div>
            <div className="p-4">
              <label
                htmlFor="archivo-importacion"
                className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 ${
                  analizando || importando ? "pointer-events-none opacity-50" : ""
                } ${archivoImportacion ? "border-primary/50 bg-primary/5" : ""}`}
              >
                {archivoImportacion ? (
                  <>
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <FileText className="h-6 w-6" />
                    </span>
                    <span className="max-w-full truncate px-2 text-sm font-semibold">
                      {archivoImportacion.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(archivoImportacion.size / 1024).toFixed(1)} KB · haz clic para cambiar
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                      <UploadCloud className="h-6 w-6" />
                    </span>
                    <span className="text-sm font-semibold">Subir archivo</span>
                    <span className="text-xs text-muted-foreground">
                      Haz clic para seleccionar el archivo a importar
                    </span>
                  </>
                )}
              </label>

              <Input
                id="archivo-importacion"
                type="file"
                className="hidden"
                accept={empresaImportacion === "REPSOL" ? ".xlsx,.xls" : ".pdf"}
                disabled={analizando || importando}
                onChange={(e) => {
                  const archivo = e.target.files?.[0]
                  if (archivo) {
                    setArchivoImportacion(archivo)
                    setItemsImportacion([])
                    setSeleccionImportacion([])
                    setBusquedaImportacion("")
                    setErrorImportacion(null)
                    setResultadoImportacion(null)
                  }
                  e.target.value = ""
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* PASO 2: Selección de valorizaciones */}
      {pasoImportacion === 2 && (
        <>
          {empresaImportacion === "REPSOL" && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar valorización por hoja..."
                value={busquedaImportacion}
                onChange={(e) => setBusquedaImportacion(e.target.value)}
                disabled={analizando || importando}
              />
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <ListChecks className="h-4 w-4 text-primary" />
                {seleccionImportacion.length} de {itemsImportacion.length} seleccionadas
              </span>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  disabled={analizando || importando || itemsImportacionFiltrados.length === 0}
                  onClick={() => setSeleccionImportacion(itemsImportacionFiltrados.map((item) => item.id))}
                >
                  Todas
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  disabled={analizando || importando || seleccionImportacion.length === 0}
                  onClick={() => setSeleccionImportacion([])}
                >
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="max-h-[13rem] space-y-1 overflow-y-auto p-2">
              {itemsImportacionFiltrados.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No se encontraron resultados para la búsqueda.
                </p>
              ) : (
                itemsImportacionFiltrados.map((item) => {
                  const seleccionada = seleccionImportacion.includes(item.id)
                  return (
                    <label
                      key={item.id}
                      onClick={() => toggleValorizacionImportacion(item.id)}
                      className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50 ${
                        seleccionada ? "bg-primary/5" : ""
                      }`}
                    >
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                          seleccionada
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        }`}
                      >
                        {seleccionada && (
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm">{item.nombre}</span>
                    </label>
                  )
                })
              )}
            </div>

            <div className="border-t border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${
                        itemsImportacion.length
                          ? Math.round((seleccionImportacion.length / itemsImportacion.length) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {itemsImportacion.length
                    ? Math.round((seleccionImportacion.length / itemsImportacion.length) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* PASO 3: Resultado */}
      {pasoImportacion === 3 && (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15 text-green-500">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold">Importación completada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Se importaron{" "}
            <span className="font-medium text-foreground">{resultadoImportacion}</span> de{" "}
            {seleccionImportacion.length} valorizaciones seleccionadas.
          </p>
          {resultadoImportacion !== null &&
            resultadoImportacion < seleccionImportacion.length && (
              <p className="mt-1 text-xs text-yellow-600">
                Las restantes ya existían en el sistema y fueron omitidas.
              </p>
            )}
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => {
              setResultadoImportacion(null)
              setItemsImportacion([])
              setSeleccionImportacion([])
              setBusquedaImportacion("")
              setArchivoImportacion(null)
              setEmpresaImportacion("")
            }}
          >
            Importar otro archivo
          </Button>
        </div>
      )}

      {/* Indicadores de carga */}
      {analizando && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
          <div className="text-sm">
            <p className="font-medium text-blue-500">Analizando archivo...</p>
            <p className="text-xs text-muted-foreground">Detectando valorizaciones en el documento</p>
          </div>
        </div>
      )}
      {importando && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
          <div className="text-sm">
            <p className="font-medium text-blue-500">Importando valorizaciones...</p>
            <p className="text-xs text-muted-foreground">Subiendo archivo y guardando datos</p>
          </div>
        </div>
      )}
    </div>

    <DialogFooter>
      {pasoImportacion === 1 ? (
        <>
          <Button variant="outline" onClick={cerrarImportacion} disabled={analizando || importando}>
            Cancelar
          </Button>
          <Button
            disabled={!empresaImportacion || !archivoImportacion || analizando || importando}
            onClick={analizarArchivoImportacion}
          >
            {analizando ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Analizar archivo
              </>
            )}
          </Button>
        </>
      ) : pasoImportacion === 2 ? (
        <>
          <Button variant="outline" onClick={volverAArchivo} disabled={analizando || importando}>
            Volver
          </Button>
          <Button
            disabled={seleccionImportacion.length === 0 || analizando || importando}
            onClick={importarSeleccionadas}
          >
            {importando ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4 mr-2" />
                Importar seleccionadas ({seleccionImportacion.length})
              </>
            )}
          </Button>
        </>
      ) : (
        <Button onClick={cerrarImportacion}>Listo</Button>
      )}
    </DialogFooter>
  </DialogContent>
</Dialog>
<ExportDialog
  open={mostrarExportador}
  onOpenChange={setMostrarExportador}
  clientes={clientes}
  valuations={valuations}
  nombreUsuario={nombreUsuario}
/>
    </div>
  )
  
}