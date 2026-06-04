"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Upload,
  FileText,
  FileSpreadsheet,
  File,
  X,
  CheckCircle2,
  AlertCircle,
  CloudUpload,
  Sparkles,
  Brain,
  Scan,
  Database,
  ArrowRight,
  Building2,
  Calendar,
  DollarSign,
  Hash,
  User,
  FileCheck,
  Loader2,
  Receipt,
  FileBarChart,
  ShoppingCart,
  CreditCard,
  Landmark,
  ClipboardList,
  FileQuestion,
  Eye,
  Pencil,
  Save,
  RefreshCw,
  TrendingUp,
  Banknote,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Document type definitions
type DocumentType = 
  | "factura" 
  | "informe" 
  | "orden_compra" 
  | "ticket_gasto" 
  | "constancia_sunat" 
  | "documento_bancario" 
  | "documento_operativo" 
  | "otro"

interface DocumentTypeInfo {
  id: DocumentType
  name: string
  icon: typeof Receipt
  color: string
  description: string
}

const documentTypes: DocumentTypeInfo[] = [
  { id: "factura", name: "Factura", icon: Receipt, color: "text-blue-500", description: "Facturas de proveedores" },
  { id: "informe", name: "Informe", icon: FileBarChart, color: "text-emerald-500", description: "Informes técnicos y operativos" },
  { id: "orden_compra", name: "Orden de Compra", icon: ShoppingCart, color: "text-orange-500", description: "Órdenes de compra a proveedores" },
  { id: "ticket_gasto", name: "Ticket / Gasto", icon: CreditCard, color: "text-purple-500", description: "Gastos menores y tickets" },
  { id: "constancia_sunat", name: "Constancia SUNAT", icon: Landmark, color: "text-red-500", description: "Formularios y constancias tributarias" },
  { id: "documento_bancario", name: "Documento Bancario", icon: Banknote, color: "text-green-500", description: "Comprobantes y estados de cuenta" },
  { id: "documento_operativo", name: "Documento Operativo", icon: ClipboardList, color: "text-cyan-500", description: "Documentos de operaciones" },
  { id: "otro", name: "Otro", icon: FileQuestion, color: "text-gray-500", description: "Otros documentos empresariales" },
]

// Extracted data types per document type
interface FacturaData {
  tipo: "factura"
  empresa: string
  ruc: string
  fecha: string
  numeroFactura: string
  subtotal: string
  igv: string
  total: string
}

interface ConstanciaSunatData {
  tipo: "constancia_sunat"
  numeroFormulario: string
  numeroOrden: string
  ruc: string
  razonSocial: string
  periodo: string
  tipoTributo: string
  importePagado: string
  banco: string
  fechaPago: string
}

interface OrdenCompraData {
  tipo: "orden_compra"
  numeroOC: string
  proveedor: string
  fecha: string
  monto: string
}

interface InformeData {
  tipo: "informe"
  titulo: string
  responsable: string
  fecha: string
  proyectoAsociado: string
}

interface DocumentoBancarioData {
  tipo: "documento_bancario"
  banco: string
  operacion: string
  fecha: string
  monto: string
}

interface TicketGastoData {
  tipo: "ticket_gasto"
  concepto: string
  proveedor: string
  fecha: string
  monto: string
  categoria: string
}

interface DocumentoOperativoData {
  tipo: "documento_operativo"
  titulo: string
  codigo: string
  fecha: string
  area: string
}

interface OtroDocumentoData {
  tipo: "otro"
  titulo: string
  fecha: string
  descripcion: string
}

type ExtractedData = 
  | FacturaData 
  | ConstanciaSunatData 
  | OrdenCompraData 
  | InformeData 
  | DocumentoBancarioData 
  | TicketGastoData
  | DocumentoOperativoData
  | OtroDocumentoData

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  documentType: DocumentType
  status: "uploading" | "analyzing" | "extracting" | "validating" | "completed" | "error"
  progress: number
  statusMessage: string
  extractedData?: ExtractedData
  clientId?: string
  projectId?: string
  isEditing?: boolean
}

const clients = [
  { id: "repsol", name: "Repsol" },
  { id: "tdp", name: "TDP" },
  { id: "bpo", name: "BPO" },
  { id: "tralsa", name: "Tralsa" },
]

const projects = [
  { id: "proj-001", name: "Mantenimiento Plataforma Offshore", client: "repsol" },
  { id: "proj-002", name: "Optimización de Combustible", client: "tdp" },
  { id: "proj-003", name: "Modernización Portuaria", client: "bpo" },
  { id: "proj-004", name: "Sistema de Rastreo", client: "tralsa" },
  { id: "proj-005", name: "Auditoría de Seguridad", client: "repsol" },
  { id: "proj-006", name: "Gestión de Carga", client: "bpo" },
]

const proveedores = [
  "Suministros Marítimos S.A.C.",
  "Petro Industrial Perú",
  "Logística Naval del Pacífico",
  "Combustibles del Sur",
  "Equipos Portuarios Callao",
  "Servicios Técnicos Navieros",
]

const bancos = ["BCP", "BBVA", "Interbank", "Scotiabank", "BanBif"]

const tributos = ["Renta 3ra Categoría", "IGV", "ITAN", "Essalud", "ONP"]

const getStatusMessages = (docType: DocumentType): Record<string, string[]> => {
  const base = {
    uploading: ["Subiendo documento...", "Preparando archivo..."],
    validating: ["Validando datos extraídos...", "Verificando formato...", "Vinculando con proyecto..."],
    completed: ["Datos extraídos correctamente"],
  }

  const typeSpecific: Record<DocumentType, { analyzing: string[]; extracting: string[] }> = {
    factura: {
      analyzing: ["Analizando estructura de factura...", "Detectando campos fiscales...", "Identificando tipo de comprobante..."],
      extracting: ["Extrayendo número de factura...", "Leyendo RUC del emisor...", "Procesando montos y fechas...", "Calculando IGV..."],
    },
    constancia_sunat: {
      analyzing: ["Analizando formulario tributario...", "Detectando tipo de constancia...", "Identificando estructura SUNAT..."],
      extracting: ["Extrayendo número de formulario...", "Leyendo número de orden...", "Identificando RUC y razón social...", "Extrayendo periodo tributario...", "Procesando importe pagado..."],
    },
    orden_compra: {
      analyzing: ["Analizando orden de compra...", "Detectando formato de OC...", "Identificando campos clave..."],
      extracting: ["Extrayendo número de OC...", "Identificando proveedor...", "Leyendo fecha y monto..."],
    },
    informe: {
      analyzing: ["Analizando estructura del informe...", "Detectando secciones...", "Identificando metadatos..."],
      extracting: ["Extrayendo título del informe...", "Identificando responsable...", "Asociando proyecto..."],
    },
    documento_bancario: {
      analyzing: ["Analizando documento bancario...", "Detectando tipo de operación...", "Identificando entidad financiera..."],
      extracting: ["Extrayendo datos del banco...", "Leyendo tipo de operación...", "Procesando monto y fecha..."],
    },
    ticket_gasto: {
      analyzing: ["Analizando ticket de gasto...", "Detectando tipo de comprobante...", "Identificando concepto..."],
      extracting: ["Extrayendo concepto del gasto...", "Identificando proveedor...", "Leyendo monto y fecha..."],
    },
    documento_operativo: {
      analyzing: ["Analizando documento operativo...", "Detectando formato...", "Identificando área responsable..."],
      extracting: ["Extrayendo título...", "Leyendo código de documento...", "Identificando área..."],
    },
    otro: {
      analyzing: ["Analizando documento...", "Detectando estructura...", "Identificando campos relevantes..."],
      extracting: ["Extrayendo información general...", "Procesando datos detectados..."],
    },
  }

  return { ...base, ...typeSpecific[docType] }
}

const generateExtractedData = (docType: DocumentType): ExtractedData => {
  const fecha = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString("es-PE")
  const monto = Math.floor(Math.random() * 45000 + 5000)

  switch (docType) {
    case "factura": {
      const subtotal = monto
      const igv = Math.floor(subtotal * 0.18)
      return {
        tipo: "factura",
        empresa: proveedores[Math.floor(Math.random() * proveedores.length)],
        ruc: `20${Math.floor(Math.random() * 900000000) + 100000000}`,
        fecha,
        numeroFactura: `F${String(Math.floor(Math.random() * 900) + 100).padStart(3, "0")}-${String(Math.floor(Math.random() * 90000) + 10000)}`,
        subtotal: `S/ ${subtotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
        igv: `S/ ${igv.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
        total: `S/ ${(subtotal + igv).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
      }
    }
    case "constancia_sunat":
      return {
        tipo: "constancia_sunat",
        numeroFormulario: `${Math.floor(Math.random() * 9000) + 1000}`,
        numeroOrden: `${Math.floor(Math.random() * 900000000) + 100000000}`,
        ruc: `20${Math.floor(Math.random() * 900000000) + 100000000}`,
        razonSocial: "Seamar Operaciones Marítimas S.A.C.",
        periodo: `${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}/2024`,
        tipoTributo: tributos[Math.floor(Math.random() * tributos.length)],
        importePagado: `S/ ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
        banco: bancos[Math.floor(Math.random() * bancos.length)],
        fechaPago: fecha,
      }
    case "orden_compra":
      return {
        tipo: "orden_compra",
        numeroOC: `OC-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        proveedor: proveedores[Math.floor(Math.random() * proveedores.length)],
        fecha,
        monto: `S/ ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
      }
    case "informe":
      return {
        tipo: "informe",
        titulo: ["Informe de Inspección Técnica", "Reporte de Mantenimiento", "Análisis de Operaciones", "Informe de Seguridad"][Math.floor(Math.random() * 4)],
        responsable: ["Carlos Mendoza", "Ana García", "Roberto Flores", "María Torres"][Math.floor(Math.random() * 4)],
        fecha,
        proyectoAsociado: projects[Math.floor(Math.random() * projects.length)].name,
      }
    case "documento_bancario":
      return {
        tipo: "documento_bancario",
        banco: bancos[Math.floor(Math.random() * bancos.length)],
        operacion: ["Transferencia", "Depósito", "Pago de Servicios", "Retiro"][Math.floor(Math.random() * 4)],
        fecha,
        monto: `S/ ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
      }
    case "ticket_gasto":
      return {
        tipo: "ticket_gasto",
        concepto: ["Combustible", "Viáticos", "Materiales", "Transporte", "Alimentación"][Math.floor(Math.random() * 5)],
        proveedor: ["Grifo Repsol", "Restaurante El Puerto", "Ferretería Naval", "Taxi Express"][Math.floor(Math.random() * 4)],
        fecha,
        monto: `S/ ${(Math.floor(Math.random() * 500) + 50).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
        categoria: ["Operativo", "Administrativo", "Logístico"][Math.floor(Math.random() * 3)],
      }
    case "documento_operativo":
      return {
        tipo: "documento_operativo",
        titulo: ["Manual de Operaciones", "Protocolo de Seguridad", "Procedimiento de Carga", "Checklist de Inspección"][Math.floor(Math.random() * 4)],
        codigo: `DOC-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        fecha,
        area: ["Operaciones", "Seguridad", "Logística", "Mantenimiento"][Math.floor(Math.random() * 4)],
      }
    case "otro":
    default:
      return {
        tipo: "otro",
        titulo: "Documento General",
        fecha,
        descripcion: "Documento procesado correctamente",
      }
  }
}

export function UploadContent() {
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | "">("")
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [showPreview, setShowPreview] = useState<string | null>(null)

  const filteredProjects = selectedClient
    ? projects.filter((p) => p.client === selectedClient)
    : projects

  const selectedDocTypeInfo = documentTypes.find(d => d.id === selectedDocType)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (!selectedDocType) return
    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
  }, [selectedDocType, selectedClient, selectedProject])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && selectedDocType) {
      const selectedFiles = Array.from(e.target.files)
      processFiles(selectedFiles)
    }
  }

  const processFiles = (fileList: File[]) => {
    if (!selectedDocType) return

    const newFiles: UploadedFile[] = fileList.map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      type: file.type,
      documentType: selectedDocType,
      status: "uploading" as const,
      progress: 0,
      statusMessage: "Subiendo documento...",
      clientId: selectedClient,
      projectId: selectedProject,
    }))

    setFiles((prev) => [...prev, ...newFiles])

    newFiles.forEach((file) => {
      simulateAIProcessing(file.id, selectedDocType)
    })
  }

  const simulateAIProcessing = (fileId: string, docType: DocumentType) => {
    const stages: Array<{ status: UploadedFile["status"]; duration: number; progressEnd: number }> = [
      { status: "uploading", duration: 600, progressEnd: 12 },
      { status: "analyzing", duration: 1400, progressEnd: 38 },
      { status: "extracting", duration: 2200, progressEnd: 78 },
      { status: "validating", duration: 800, progressEnd: 95 },
      { status: "completed", duration: 400, progressEnd: 100 },
    ]

    const statusMessages = getStatusMessages(docType)
    let currentStageIndex = 0
    let currentProgress = 0

    const runStage = () => {
      if (currentStageIndex >= stages.length) return

      const stage = stages[currentStageIndex]
      const messages = statusMessages[stage.status]
      let messageIndex = 0

      const messageInterval = setInterval(() => {
        if (messageIndex < messages.length) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, statusMessage: messages[messageIndex] }
                : f
            )
          )
          messageIndex++
        }
      }, stage.duration / messages.length)

      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 2.5
        if (currentProgress >= stage.progressEnd) {
          currentProgress = stage.progressEnd
          clearInterval(progressInterval)
          clearInterval(messageInterval)

          if (stage.status === "completed") {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? {
                      ...f,
                      status: "completed",
                      progress: 100,
                      statusMessage: "Extracción completada",
                      extractedData: generateExtractedData(docType),
                    }
                  : f
              )
            )
          } else {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? { ...f, status: stage.status, progress: currentProgress }
                  : f
              )
            )
            currentStageIndex++
            setTimeout(runStage, 150)
          }
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, status: stage.status, progress: currentProgress }
                : f
            )
          )
        }
      }, 80)
    }

    runStage()
  }

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const toggleEdit = (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, isEditing: !f.isEditing } : f
      )
    )
  }

  const confirmFile = (fileId: string) => {
    // Simulate saving and updating metrics
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, isEditing: false } : f
      )
    )
  }

  const getFileIcon = (type: string) => {
    if (type.includes("pdf") || type.includes("document")) return FileText
    if (type.includes("sheet") || type.includes("excel") || type.includes("csv"))
      return FileSpreadsheet
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
        return <CloudUpload className="h-4 w-4 animate-pulse" />
      case "analyzing":
        return <Scan className="h-4 w-4 animate-pulse" />
      case "extracting":
        return <Brain className="h-4 w-4 animate-pulse" />
      case "validating":
        return <Database className="h-4 w-4 animate-pulse" />
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />
    }
  }

  const getStatusColor = (status: UploadedFile["status"]) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500"
      case "error":
        return "bg-destructive"
      default:
        return "bg-primary"
    }
  }

  const getDocTypeIcon = (docType: DocumentType) => {
    const typeInfo = documentTypes.find(d => d.id === docType)
    return typeInfo ? typeInfo.icon : FileText
  }

  const getDocTypeColor = (docType: DocumentType) => {
    const typeInfo = documentTypes.find(d => d.id === docType)
    return typeInfo ? typeInfo.color : "text-gray-500"
  }

  // Render extracted data based on document type
  const renderExtractedData = (file: UploadedFile) => {
    if (!file.extractedData) return null
    const data = file.extractedData

    const DataField = ({ icon: Icon, label, value, highlight = false }: { icon: typeof Hash, label: string, value: string, highlight?: boolean }) => (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3 w-3" />
          {label}
        </div>
        <p className={cn("text-sm", highlight ? "font-semibold text-primary" : "font-medium")}>{value}</p>
      </div>
    )

    switch (data.tipo) {
      case "factura":
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DataField icon={Hash} label="Nº Factura" value={data.numeroFactura} />
            <DataField icon={Building2} label="RUC" value={data.ruc} />
            <DataField icon={User} label="Empresa" value={data.empresa} />
            <DataField icon={Calendar} label="Fecha" value={data.fecha} />
            <DataField icon={DollarSign} label="Subtotal" value={data.subtotal} />
            <DataField icon={DollarSign} label="IGV (18%)" value={data.igv} />
            <DataField icon={DollarSign} label="Total" value={data.total} highlight />
          </div>
        )
      case "constancia_sunat":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DataField icon={Hash} label="Nº Formulario" value={data.numeroFormulario} />
            <DataField icon={Hash} label="Nº Orden" value={data.numeroOrden} />
            <DataField icon={Building2} label="RUC" value={data.ruc} />
            <DataField icon={User} label="Razón Social" value={data.razonSocial} />
            <DataField icon={Calendar} label="Periodo" value={data.periodo} />
            <DataField icon={Landmark} label="Tributo" value={data.tipoTributo} />
            <DataField icon={DollarSign} label="Importe Pagado" value={data.importePagado} highlight />
            <DataField icon={Banknote} label="Banco" value={data.banco} />
            <DataField icon={Calendar} label="Fecha Pago" value={data.fechaPago} />
          </div>
        )
      case "orden_compra":
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DataField icon={Hash} label="Nº OC" value={data.numeroOC} />
            <DataField icon={User} label="Proveedor" value={data.proveedor} />
            <DataField icon={Calendar} label="Fecha" value={data.fecha} />
            <DataField icon={DollarSign} label="Monto" value={data.monto} highlight />
          </div>
        )
      case "informe":
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DataField icon={FileBarChart} label="Título" value={data.titulo} />
            <DataField icon={User} label="Responsable" value={data.responsable} />
            <DataField icon={Calendar} label="Fecha" value={data.fecha} />
            <DataField icon={ArrowRight} label="Proyecto" value={data.proyectoAsociado} />
          </div>
        )
      case "documento_bancario":
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DataField icon={Banknote} label="Banco" value={data.banco} />
            <DataField icon={CreditCard} label="Operación" value={data.operacion} />
            <DataField icon={Calendar} label="Fecha" value={data.fecha} />
            <DataField icon={DollarSign} label="Monto" value={data.monto} highlight />
          </div>
        )
      case "ticket_gasto":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DataField icon={Receipt} label="Concepto" value={data.concepto} />
            <DataField icon={User} label="Proveedor" value={data.proveedor} />
            <DataField icon={Calendar} label="Fecha" value={data.fecha} />
            <DataField icon={DollarSign} label="Monto" value={data.monto} highlight />
            <DataField icon={ClipboardList} label="Categoría" value={data.categoria} />
          </div>
        )
      case "documento_operativo":
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DataField icon={FileText} label="Título" value={data.titulo} />
            <DataField icon={Hash} label="Código" value={data.codigo} />
            <DataField icon={Calendar} label="Fecha" value={data.fecha} />
            <DataField icon={Building2} label="Área" value={data.area} />
          </div>
        )
      case "otro":
      default:
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DataField icon={FileText} label="Título" value={data.titulo} />
            <DataField icon={Calendar} label="Fecha" value={data.fecha} />
            <DataField icon={FileQuestion} label="Descripción" value={data.descripcion} />
          </div>
        )
    }
  }

  const completedFiles = files.filter(f => f.status === "completed")
  const processingFiles = files.filter(f => f.status !== "completed" && f.status !== "error")

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Subir Documento</h1>
              <p className="text-muted-foreground">
                Extracción inteligente de datos mediante IA
              </p>
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
          <Brain className="h-3.5 w-3.5" />
          OCR Inteligente
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Configuration */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Configuración del Documento</CardTitle>
              <CardDescription>Seleccione el tipo, cliente y proyecto antes de subir</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Document Type Selector */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Tipo de Documento</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {documentTypes.map((docType) => {
                    const Icon = docType.icon
                    const isSelected = selectedDocType === docType.id
                    return (
                      <button
                        key={docType.id}
                        onClick={() => setSelectedDocType(docType.id)}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-lg border p-3 transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        <Icon className={cn("h-5 w-5", isSelected ? "text-primary" : docType.color)} />
                        <span className={cn("text-xs font-medium text-center", isSelected ? "text-primary" : "text-foreground")}>
                          {docType.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {selectedDocTypeInfo && (
                  <p className="text-xs text-muted-foreground">{selectedDocTypeInfo.description}</p>
                )}
              </div>

              {/* Client & Project Selection */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger id="client">
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project">Proyecto</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger id="project">
                      <SelectValue placeholder="Seleccionar proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Drop Zone */}
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-all duration-300",
                  !selectedDocType
                    ? "border-border/50 bg-muted/20 cursor-not-allowed"
                    : isDragOver
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : "border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
                )}
              >
                {!selectedDocType ? (
                  <>
                    <div className="rounded-full p-4 mb-4 bg-muted/50">
                      <CloudUpload className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Seleccione un tipo de documento primero</p>
                  </>
                ) : (
                  <>
                    <div className={cn(
                      "rounded-full p-4 mb-4 transition-all duration-300",
                      isDragOver ? "bg-primary/20 scale-110" : "bg-muted"
                    )}>
                      <CloudUpload className={cn(
                        "h-8 w-8 transition-all duration-300",
                        isDragOver ? "text-primary" : "text-primary"
                      )} />
                    </div>
                    <p className="text-base font-medium">Arrastra tu documento aquí</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      o haz clic para seleccionar archivo
                    </p>
                    <p className="text-xs text-muted-foreground mt-3">
                      PDF, XML, Excel, CSV, Imágenes (JPG, PNG)
                    </p>
                    <div className="mt-4">
                      <Button asChild variant="outline" size="sm">
                        <label className="cursor-pointer">
                          <Upload className="mr-2 h-4 w-4" />
                          Seleccionar Archivo
                          <input
                            type="file"
                            className="hidden"
                            multiple
                            accept=".pdf,.xml,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                            onChange={handleFileInput}
                          />
                        </label>
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Processing Files */}
          {processingFiles.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <CardTitle className="text-base">Procesando</CardTitle>
                  </div>
                  <Badge variant="secondary">{processingFiles.length} archivo(s)</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {processingFiles.map((file) => {
                    const DocIcon = getDocTypeIcon(file.documentType)
                    return (
                      <div key={file.id} className="rounded-lg border border-border bg-muted/20 p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="rounded-md p-2 bg-muted">
                            <DocIcon className={cn("h-4 w-4", getDocTypeColor(file.documentType))} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                          {getStatusIcon(file.status)}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFile(file.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-300 ease-out",
                                getStatusColor(file.status)
                              )}
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                              {file.statusMessage}
                            </p>
                            <p className="text-xs text-muted-foreground font-medium">{Math.round(file.progress)}%</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed Files */}
          {completedFiles.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <CardTitle className="text-base">Datos Extraídos</CardTitle>
                  </div>
                  <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                    {completedFiles.length} completado(s)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {completedFiles.map((file) => {
                    const DocIcon = getDocTypeIcon(file.documentType)
                    const docTypeInfo = documentTypes.find(d => d.id === file.documentType)
                    return (
                      <div key={file.id} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
                        {/* File Header */}
                        <div className="flex items-center gap-3 p-4 border-b border-emerald-500/10">
                          <div className="rounded-md p-2 bg-emerald-500/10">
                            <DocIcon className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{file.name}</p>
                              <Badge variant="outline" className="text-[10px] px-1.5">
                                {docTypeInfo?.name}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPreview(file.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleEdit(file.id)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFile(file.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Extracted Data */}
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-xs font-medium text-emerald-500">
                              Campos detectados automáticamente
                            </span>
                          </div>
                          {renderExtractedData(file)}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between p-4 pt-0">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <RefreshCw className="h-3 w-3" />
                            Actualiza centro de costos al confirmar
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => toggleEdit(file.id)}>
                              <Pencil className="h-3.5 w-3.5 mr-1.5" />
                              Editar
                            </Button>
                            <Button size="sm" onClick={() => confirmFile(file.id)}>
                              <Save className="h-3.5 w-3.5 mr-1.5" />
                              Confirmar y Guardar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* AI Processing Info */}
          <Card className="bg-card border-border border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">Extracción con IA</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                El sistema detecta automáticamente los campos según el tipo de documento seleccionado.
              </p>
              <div className="space-y-2">
                {[
                  "Reconocimiento óptico (OCR)",
                  "Detección de campos clave",
                  "Validación de datos",
                  "Vinculación automática",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Document Types Summary */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tipos Soportados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {documentTypes.slice(0, 6).map((docType) => {
                  const Icon = docType.icon
                  return (
                    <div key={docType.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon className={cn("h-4 w-4", docType.color)} />
                      {docType.name}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actividad de Hoy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Documentos subidos</span>
                <span className="font-medium">32</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Procesados por IA</span>
                <span className="font-medium text-emerald-500">28</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pendientes de revisión</span>
                <span className="font-medium text-amber-500">4</span>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tiempo ahorrado</span>
                  <span className="font-medium text-primary">~5.2 horas</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integration Note */}
          <Card className="bg-card border-border border-dashed">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Integración en tiempo real</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Los documentos confirmados actualizan automáticamente los centros de costos y métricas de rentabilidad.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
