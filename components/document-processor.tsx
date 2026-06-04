'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from './header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Search, 
  FileText, 
  MoreHorizontal, 
  Upload, 
  File, 
  Image as ImageIcon,
  FileSpreadsheet,
  Sparkles,
  X,
  ChevronRight,
  Check,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { useFinancial } from '../lib/context'
import type { Documento, CuentaPorCobrar, CuentaPorPagar } from '@/lib/types'

type WizardStep = 'upload' | 'review' | 'confirm'
type TipoMovimiento = 'cobrar' | 'pagar'

export default function DocumentosPage() {




  const router = useRouter()
  const { 
    documentos, 
    addDocumento, 
    clientes, 
    proyectos,
    proveedores,
    addCuentaPorCobrar,
    addCuentaPorPagar
  } = useFinancial()

  console.log("PRIMER CLIENTE:", clientes[0])
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [wizardStep, setWizardStep] = useState<WizardStep>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  // Form state for document extraction
  const [extractedData, setExtractedData] = useState({
  nombre: '',
  tipo: 'factura' as Documento['tipo'],
  empresaProveedor: '',
  fecha: '',
  fechaVencimiento: '',
  monto: '',
  clienteId: '',
  proyectoId: '',
  proveedorId: '',
  centroCosto: '',
  tipoMovimiento: 'cobrar' as TipoMovimiento,
  tipoGasto: '',
  rawData: {} as Record<string, any>
})

  const handleFileSelect = async (file: File) => {

  setSelectedFile(file)

  try {

    const formData = new FormData()

    formData.append("file", file)

    const res = await fetch("/api/documentos", {
      method: "POST",
      body: formData
    })

    const result = await res.json()

    console.log(result)

    if (result.success) {

      // Gemini devuelve texto JSON
      const cleanJson = result.data
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim()
      const parsed = JSON.parse(cleanJson)
      const nombreProveedorDetectado =
      parsed.empresaEmisora ||
      parsed.empresaProveedor ||
      parsed.empresa ||
      ""
      const proveedorEncontrado = proveedores.find(
      proveedor =>
      proveedor.razon_social
      .toLowerCase()
      .trim() ===
      nombreProveedorDetectado
      .toLowerCase()
      .trim()

      
)
const montoLimpio = String(
  parsed.montoTotal ||
  parsed.importePagado ||
  parsed.montoNeto ||
  parsed.monto ||
  ""
).replace(/,/g, "")

      setExtractedData({

  nombre: file.name,

  tipo:
    parsed.tipoDocumento?.toLowerCase() || "otro",

  empresaProveedor:
    parsed.empresaEmisora ||
    parsed.empresa ||
    parsed.persona ||
    "",

  fecha:
  parsed.fechaEmision ||
  parsed.fechaPago ||
  parsed.fecha ||
  "",

  fechaVencimiento:
  parsed.fechaVencimiento ||
  parsed.fechaLimite ||
  parsed.vencimiento ||
  "",

  
  monto: montoLimpio,

  clienteId: "",
  proyectoId: "",

  proveedorId: proveedorEncontrado
  ? proveedorEncontrado.id.toString()
  : "",

  centroCosto: "",

  tipoMovimiento:
    parsed.tipoDocumento?.toLowerCase() === "factura"
      ? "cobrar"
      : "pagar",

  tipoGasto: "",

  rawData: parsed

})

      setWizardStep("review")

      setIsDialogOpen(true)

    }

  } catch (error) {

    console.error(error)

  }

}

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const resetWizard = () => {
    setWizardStep('upload')
    setSelectedFile(null)
    setExtractedData({
      nombre: '',
      tipo: 'factura',
      empresaProveedor: '',
      fecha: '',
      fechaVencimiento: '',
      monto: '',
      clienteId: '',
      proyectoId: '',
      proveedorId: '',
      centroCosto: '',
      tipoMovimiento: 'cobrar',
      tipoGasto: '',
      rawData: {}
    })
    setIsDialogOpen(false)
  }

  const handleConfirm = async () => {
    // 1. Create the document
    const documento: Documento = {
      id: crypto.randomUUID(),
      nombre: extractedData.nombre,
      tipo: extractedData.tipo,
      archivo: selectedFile?.name || '',
      empresaProveedor: extractedData.empresaProveedor || undefined,
      fecha: extractedData.fecha ? new Date(extractedData.fecha) : undefined,
      monto: extractedData.monto ? parseFloat(extractedData.monto) : undefined,
      clienteId: extractedData.clienteId || undefined,
      proyectoId: extractedData.proyectoId || undefined,
      centroCosto: extractedData.centroCosto || undefined,
      tipoOperacion: extractedData.tipoMovimiento === 'cobrar' ? 'Ingreso' : 'Egreso',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    addDocumento(documento)

    // 2. Generate the financial movement based on type
    if (extractedData.tipoMovimiento === 'cobrar' && extractedData.clienteId && extractedData.proyectoId) {
      const cuentaCobrar: CuentaPorCobrar = {
        id: crypto.randomUUID(),
        clienteId: extractedData.clienteId,
        proyectoId: extractedData.proyectoId,
        documento: extractedData.nombre,
        fechaEmision: extractedData.fecha ? new Date(extractedData.fecha) : new Date(),
        fechaVencimiento: extractedData.fechaVencimiento ? new Date(extractedData.fechaVencimiento) : new Date(),
        monto: parseFloat(extractedData.monto) || 0,
        estadoCobranza: 'pendiente',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      addCuentaPorCobrar(cuentaCobrar)
    } else if (extractedData.tipoMovimiento === 'pagar' && extractedData.proyectoId) {
      const cuentaPagar: CuentaPorPagar = {
        id: crypto.randomUUID(),
        proveedor: extractedData.empresaProveedor || 'Sin especificar',
        proyectoId: extractedData.proyectoId,
        tipoGasto: extractedData.tipoGasto || 'General',
        fechaVencimiento: extractedData.fechaVencimiento ? new Date(extractedData.fechaVencimiento) : new Date(),
        monto: parseFloat(extractedData.monto) || 0,
        estadoPago: 'pendiente',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      addCuentaPorPagar(cuentaPagar)
    }

    const proyectoSeleccionado = proyectos.find(
  (p: any) =>
    p.id.toString() === extractedData.proyectoId
)
const convertirFechaMySQL = (fecha: string) => {

  if (!fecha) return null

  const soloFecha = fecha.split(' ')[0]

  const partes = soloFecha.split('/')

  if (partes.length !== 3) return null

  const [dia, mes, anio] = partes

  return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
}

const fechaEmisionMySQL =
  convertirFechaMySQL(extractedData.fecha)

const fechaVencimientoMySQL =
  convertirFechaMySQL(extractedData.fechaVencimiento)


    await fetch("/api/movimientos", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    tipo:
      extractedData.tipoMovimiento === "cobrar"
        ? "COBRAR"
        : "PAGAR",

    cliente_id:
  (proyectoSeleccionado as any)?.cliente_id || null,

    proveedor_id:
  extractedData.tipoMovimiento === "pagar"
    ? extractedData.proveedorId
    : null,

    proyecto_id: extractedData.proyectoId,

    servicio: extractedData.tipoGasto || null,

    documento_tipo: extractedData.tipo,

    documento_numero: extractedData.nombre,

    monto: parseFloat(extractedData.monto) || 0,

    fecha_emision: fechaEmisionMySQL,

    fecha_vencimiento: fechaVencimientoMySQL,

    estado: "PENDIENTE",
  }),
});

    // Reset and close
    resetWizard()
  }

  const filteredDocumentos = documentos.filter(doc =>
    doc.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.empresaProveedor?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const tipoBadge: Record<string, string> = {
    factura: 'bg-chart-1/20 text-chart-1 border-chart-1/30',
    boleta: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
    recibo: 'bg-warning/20 text-warning border-warning/30',
    contrato: 'bg-accent/20 text-accent border-accent/30',
    otro: 'bg-muted text-muted-foreground border-border'
  }

  const getFileIcon = (nombre: string) => {
    const ext = nombre.split('.').pop()?.toLowerCase()
    if (['pdf'].includes(ext || '')) return FileText
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return ImageIcon
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return FileSpreadsheet
    return File
  }

  const tiposGasto = [
    'Servicios',
    'Materiales',
    'Personal',
    'Operativo',
    'Administrativo',
    'Impuestos',
    'Otros'
  ]

  const formatearMoneda = (valor: any) => {

  if (!valor) return '-'

  const numero = parseFloat(
    String(valor).replace(/[^0-9.-]+/g, '')
  )

  if (isNaN(numero)) return valor

  const texto = String(valor).toLowerCase()

  const esDolar =
    texto.includes('$') ||
    texto.includes('usd') ||
    texto.includes('dolar')

  return `${esDolar ? '$' : 'S/'} ${numero.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`

}

const proyectosDelCliente =

  extractedData.tipoMovimiento === 'pagar'

    ? proyectos

    : proyectos.filter(
        proyecto =>
          (proyecto as any).cliente_id?.toString() === extractedData.clienteId
      )

  return (
    <>
      <Header 
        title="Centro Documental" 
        description="Sube documentos y genera movimientos financieros automáticamente"
      />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Upload Zone */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
                ${isDragging 
                  ? 'border-primary bg-primary/5 scale-[1.01]' 
                  : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'
                }
              `}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileInputChange}
                accept=".pdf,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.csv"
                className="hidden"
              />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    Subir documento financiero
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Facturas, boletas, recibos u otros comprobantes
                  </p>
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation()
                      fileInputRef.current?.click()
                    }}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Seleccionar Archivo
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  PDF, imágenes o archivos Excel (máx. 10MB)
                </p>
              </div>

              {/* AI Ready Badge */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-medium text-accent">IA Ready</span>
              </div>
            </div>

            {/* Flow explanation */}
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/30">
                <Upload className="w-3.5 h-3.5" />
                Subir
              </span>
              <ChevronRight className="w-4 h-4" />
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/30">
                <Sparkles className="w-3.5 h-3.5" />
                Revisar
              </span>
              <ChevronRight className="w-4 h-4" />
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/30">
                <Check className="w-3.5 h-3.5" />
                Confirmar
              </span>
              <ChevronRight className="w-4 h-4" />
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <ArrowRight className="w-3.5 h-3.5" />
                Generar Movimiento
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Wizard Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) resetWizard()
          else setIsDialogOpen(open)
        }}>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {wizardStep === 'review' && 'Revisar Extracción'}
                {wizardStep === 'confirm' && 'Confirmar y Generar Movimiento'}
              </DialogTitle>
              <DialogDescription>
                {wizardStep === 'review' && 'Verifica y edita los datos extraídos del documento'}
                {wizardStep === 'confirm' && 'Revisa la información antes de generar el movimiento financiero'}
              </DialogDescription>
            </DialogHeader>

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 py-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                wizardStep === 'review' ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'
              }`}>
                <Sparkles className="w-3.5 h-3.5" />
                Revisar
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                wizardStep === 'confirm' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground'
              }`}>
                <Check className="w-3.5 h-3.5" />
                Confirmar
              </div>
            </div>
            
            {/* File Info */}
            {selectedFile && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <File className="w-8 h-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={resetWizard}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Step: Review */}
            {wizardStep === 'review' && (
              <div className="space-y-4 py-2">
                
                {/* Datos detectados por IA */}
<div className="p-4 rounded-lg bg-primary/5 border border-primary/20">

  <h4 className="text-sm font-medium mb-3">
    Datos detectados por IA
  </h4>

  <div className="grid grid-cols-2 gap-3">

    {Object.entries(extractedData.rawData || {})
      .filter(([_, value]) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ''
      )
      .map(([key, value]) => {

        const labels: Record<string, string> = {

          igv: 'IGV',
          ruc: 'RUC',
          rucCliente: 'RUC Cliente',
          rucProveedor: 'RUC Proveedor',
          afp: 'AFP'

        }

        return (

          <div
            key={key}
            className="space-y-1"
          >

            <label className="text-xs text-muted-foreground">

              {
                labels[key] ||

                key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase())
              }

            </label>

            <Input
              value={
  [
    'monto',
    'subtotal',
    'igv',
    'detraccion',
    'importePagado',
    'montoTotal',
    'montoNeto'
  ].includes(key)

    ? formatearMoneda(value)

    : typeof value === 'string'
      ? value.charAt(0).toUpperCase() + value.slice(1)
      : String(value)
}

              onChange={(e) =>
                setExtractedData({

                  ...extractedData,

                  rawData: {

                    ...extractedData.rawData,

                    [key]: e.target.value

                  }

                })
              }

              className="h-9 bg-background/50"
            />

          </div>

        )

      })}


                </div>
                </div>
                {/* Movement Type Selection */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Tipo de Movimiento a Generar</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setExtractedData({ ...extractedData, tipoMovimiento: 'cobrar' })}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        extractedData.tipoMovimiento === 'cobrar'
                          ? 'border-chart-1 bg-chart-1/10'
                          : 'border-border/50 hover:border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className={`w-5 h-5 ${extractedData.tipoMovimiento === 'cobrar' ? 'text-chart-1' : 'text-muted-foreground'}`} />
                        <span className={`font-medium ${extractedData.tipoMovimiento === 'cobrar' ? 'text-chart-1' : ''}`}>
                          Cuenta por Cobrar
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ingreso pendiente de un cliente
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExtractedData({ ...extractedData, tipoMovimiento: 'pagar' })}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        extractedData.tipoMovimiento === 'pagar'
                          ? 'border-destructive bg-destructive/10'
                          : 'border-border/50 hover:border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className={`w-5 h-5 ${extractedData.tipoMovimiento === 'pagar' ? 'text-destructive' : 'text-muted-foreground'}`} />
                        <span className={`font-medium ${extractedData.tipoMovimiento === 'pagar' ? 'text-destructive' : ''}`}>
                          Cuenta por Pagar
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Egreso pendiente a un proveedor
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step: Confirm */}
            {wizardStep === 'confirm' && (
              <div className="space-y-4 py-2">
                {/* Association Section */}
<div className="space-y-3">
  <h4 className="text-sm font-medium">
    Asociación (Trazabilidad)
  </h4>

  <div className="grid grid-cols-2 gap-3">

    {/* CLIENTE */}
    {extractedData.tipoMovimiento === 'cobrar' && (
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          Cliente *
        </label>

        <select
          value={extractedData.clienteId}
          onChange={(e) =>
            setExtractedData({
              ...extractedData,
              clienteId: e.target.value,
              proyectoId: ''
            })
          }
          className="w-full h-9 px-3 rounded-md bg-background/50 border border-input text-sm"
        >
          <option value="">
            Seleccionar cliente...
          </option>

          {clientes.map((cliente: any) => (
  <option
    key={cliente.id}
    value={cliente.id}
  >
    {cliente.razon_social}
  </option>
))}
        </select>
      </div>
    )}

    {/* PROVEEDOR */}
    {extractedData.tipoMovimiento === 'pagar' && (
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          Proveedor *
        </label>

        <select
          value={extractedData.proveedorId}
          onChange={(e) =>
            setExtractedData({
              ...extractedData,
              proveedorId: e.target.value
            })
          }
          className="w-full h-9 px-3 rounded-md bg-background/50 border border-input text-sm"
        >
          <option value="">
            Seleccionar proveedor...
          </option>

          {proveedores.map((proveedor) => (
            <option
              key={proveedor.id}
              value={proveedor.id}
            >
              {proveedor.razon_social}
            </option>
          ))}
        </select>
      </div>
    )}

    {/* PROYECTO */}
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">
        Proyecto *
      </label>

      <select
        value={extractedData.proyectoId}
        onChange={(e) =>
          setExtractedData({
            ...extractedData,
            proyectoId: e.target.value
          })
        }
        className="w-full h-9 px-3 rounded-md bg-background/50 border border-input text-sm"
      >
        <option value="">
          Seleccionar proyecto...
        </option>

        {proyectosDelCliente.map((proyecto: any) => (
          <option
            key={proyecto.id}
            value={proyecto.id}
          >
            {proyecto.nombre}
          </option>
        ))}
      </select>
    </div>

    {/* CENTRO DE COSTO */}
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">
        Centro de Costo
      </label>

      <Input
        placeholder="CC-001"
        value={extractedData.centroCosto}
        onChange={(e) =>
          setExtractedData({
            ...extractedData,
            centroCosto: e.target.value
          })
        }
        className="h-9 bg-background/50"
      />
    </div>

    {/* TIPO DE GASTO */}
    {extractedData.tipoMovimiento === 'pagar' && (
      
      
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          Tipo de Gasto
        </label>

        <select
          value={extractedData.tipoGasto}
          onChange={(e) =>
            setExtractedData({
              ...extractedData,
              tipoGasto: e.target.value
            })
          }
          className="w-full h-9 px-3 rounded-md bg-background/50 border border-input text-sm"
        >
          <option value="">
            Seleccionar...
          </option>

          {tiposGasto.map(tipo => (
            <option
              key={tipo}
              value={tipo}
            >
              {tipo}
            </option>
          ))}
        </select>
      </div>
    )}

  </div>
</div>

                {/* Summary */}
                <div className={`p-4 rounded-lg border ${
                  extractedData.tipoMovimiento === 'cobrar' 
                    ? 'bg-chart-1/5 border-chart-1/30' 
                    : 'bg-destructive/5 border-destructive/30'
                }`}>
                  <h4 className="text-sm font-medium mb-3">Resumen del Movimiento</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className={`font-medium ${extractedData.tipoMovimiento === 'cobrar' ? 'text-chart-1' : 'text-destructive'}`}>
                        {extractedData.tipoMovimiento === 'cobrar' ? 'Cuenta por Cobrar' : 'Cuenta por Pagar'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Documento:</span>
                      <span className="font-medium">
                        {
                        extractedData.tipo
                        ? extractedData.tipo.charAt(0).toUpperCase() + extractedData.tipo.slice(1)
                        : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
  <span className="text-muted-foreground">
    {extractedData.tipoMovimiento === 'cobrar'
      ? 'Cliente:'
      : 'Proveedor:'}
  </span>

  <span className="font-medium">
    {extractedData.tipoMovimiento === 'cobrar'
  ? clientes.find(
      (c: any) =>
        c.id.toString() === extractedData.clienteId
    )?.razon_social || '-'
  : extractedData.empresaProveedor || '-'
}
  </span>
</div>

<div className="flex justify-between">
  <span className="text-muted-foreground">
    Proyecto:
  </span>

  <span className="font-medium">
    {
      proyectos.find(
        (p: any) =>
          p.id.toString() === extractedData.proyectoId
      )?.nombre || '-'
    }
  </span>
</div>

{extractedData.tipoMovimiento === 'pagar' && (
  <div className="flex justify-between">
    <span className="text-muted-foreground">
      Servicio:
    </span>

    <span className="font-medium">
      {extractedData.tipoGasto || '-'}
    </span>
  </div>
)}

<div className="flex justify-between">
  <span className="text-muted-foreground">
    Fecha Emisión:
  </span>

  <span className="font-medium">
    {extractedData.fecha || '-'}
  </span>
</div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vencimiento:</span>
                      <span className="font-medium">

  {
    extractedData.rawData?.fechaVencimiento ||

    extractedData.rawData?.fechaLimite ||

    extractedData.rawData?.vencimiento ||

    '-'
  }

</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-border/50">
                      <span className="text-muted-foreground">Monto:</span>
                      <span className="text-xl font-mono font-bold whitespace-nowrap">
  S/ {Number(
  String(extractedData.monto).replace(/,/g, '')
).toLocaleString('es-PE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}
</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              {wizardStep === 'review' && (
                <>
                  <Button variant="outline" onClick={resetWizard}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => setWizardStep('confirm')} 
                    className="bg-primary hover:bg-primary/90"
                    disabled={!extractedData.monto}
                  >
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}
              {wizardStep === 'confirm' && (
                <>
                  <Button variant="outline" onClick={() => setWizardStep('review')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                  </Button>
                
                  {(!extractedData.proyectoId || 
                  (extractedData.tipoMovimiento === 'cobrar' && !extractedData.clienteId)) && (
                  <p className="text-xs text-muted-foreground text-center">
                    Selecciona los campos requeridos para habilitar la generación del movimiento.
                  </p>
                )}
                
                  <Button 
                    onClick={handleConfirm} 
                    className={extractedData.tipoMovimiento === 'cobrar' 
                      ? 'bg-chart-1 hover:bg-chart-1/90' 
                      : 'bg-destructive hover:bg-destructive/90'
                    }
                    disabled={
  !extractedData.proyectoId ||

  (extractedData.tipoMovimiento === 'cobrar' &&
    !extractedData.clienteId) ||

  (extractedData.tipoMovimiento === 'pagar' &&
    !extractedData.proveedorId)
}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Confirmar y Generar
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Documents Table */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Documentos Registrados</CardTitle>
              <CardDescription>
                Archivos procesados con movimientos generados
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>

            {/* Table */}
            {documentos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">Sin documentos</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Sube tu primer documento para generar automáticamente una cuenta por cobrar o pagar.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-semibold">Documento</TableHead>
                      <TableHead className="font-semibold">Tipo</TableHead>
                      <TableHead className="font-semibold">Empresa/Proveedor</TableHead>
                      <TableHead className="font-semibold">Operación</TableHead>
                      <TableHead className="font-semibold">Fecha</TableHead>
                      <TableHead className="font-semibold text-right">Monto</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocumentos.map((doc) => {
                      const FileIcon = getFileIcon(doc.nombre)
                      return (
                        <TableRow key={doc.id} className="hover:bg-muted/20">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <FileIcon className="w-5 h-5 text-muted-foreground" />
                              <span className="font-medium truncate max-w-[200px]">{doc.nombre}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${tipoBadge[doc.tipo]}`}>
                              {doc.tipo.charAt(0).toUpperCase() + doc.tipo.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {doc.empresaProveedor || '-'}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              doc.tipoOperacion === 'Ingreso' 
                                ? 'bg-chart-1/20 text-chart-1' 
                                : 'bg-destructive/20 text-destructive'
                            }`}>
                              {doc.tipoOperacion || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {doc.fecha?.toLocaleDateString('es-PE') || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {doc.monto 
                              ? `S/ ${doc.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
