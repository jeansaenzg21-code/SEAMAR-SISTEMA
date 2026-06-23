'use client'

import { useState, useRef, useCallback } from 'react'

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

export type ReconciliationStatus = 'COINCIDE' | 'NO_ENCONTRADA' | 'DIFERENCIA_MONTO'
export type SessionStatus = 'COMPLETADA' | 'PENDIENTE' | 'CON_DIFERENCIAS'

export interface ReconciliationRecord {
  id: string
  invoiceNumber: string
  status: ReconciliationStatus
  amountExcel: number
  amountSystem: number | null
  supplier: string
  ruc: string
  date: string
  observation: string | null
}

export interface ReconciliationSession {
  id: string
  date: string
  fileName: string
  matches: number
  observations: number
  status: SessionStatus
}

export interface KPISummary {
  totalExcel: number
  matches: number
  observations: number
  amountDifferences: number
}

export interface InvoiceReconciliationProps {
  /** Registros del resultado de conciliación — proviene de tu API tras procesar el Excel */
  records?: ReconciliationRecord[]
  /** Historial de sesiones anteriores */
  sessions?: ReconciliationSession[]
  /** KPIs calculados por el backend */
  kpi?: KPISummary
  /** Última sincronización (ISO string) */
  lastSync?: string | null
  /** Callback al presionar "Procesar Conciliación" — recibe el File seleccionado */
  onProcess?: (file: File) => Promise<void>
  /** Callback al guardar una observación */
  onSaveObservation?: (recordId: string, text: string) => Promise<void>
  /** Callback al aprobar la conciliación */
  onApprove?: (recordId: string) => Promise<void>
  /** Callback al exportar */
  onExport?: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: 'PEN' | 'USD' = 'PEN'): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getStatusConfig(status: ReconciliationStatus) {
  const configs = {
    COINCIDE: {
      label: 'Coincide',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
    },
    NO_ENCONTRADA: {
      label: 'No encontrada',
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      dot: 'bg-red-500',
    },
    DIFERENCIA_MONTO: {
      label: 'Dif. monto',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    },
  }
  return configs[status]
}

function getSessionStatusConfig(status: SessionStatus) {
  const configs = {
    COMPLETADA: { label: 'Completada', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    PENDIENTE: { label: 'Pendiente', bg: 'bg-slate-100', text: 'text-slate-600' },
    CON_DIFERENCIAS: { label: 'Con diferencias', bg: 'bg-amber-50', text: 'text-amber-700' },
  }
  return configs[status]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ReconciliationStatus }) {
  const cfg = getStatusConfig(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function KPICard({
  label,
  value,
  sublabel,
  icon,
  accent,
}: {
  label: string
  value: number | string
  sublabel: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${accent}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ActiveTab = 'historial' | 'resultados' | 'detalle'

export default function InvoiceReconciliationContent({
  records: initialRecords = [],
  sessions = [],
  kpi = { totalExcel: 0, matches: 0, observations: 0, amountDifferences: 0 },
  lastSync = null,
  onProcess,
  onSaveObservation,
  onApprove,
  onExport,
}: InvoiceReconciliationProps) {
  const [selectedRecord, setSelectedRecord] = useState<ReconciliationRecord | null>(null)
  const [selectedSession, setSelectedSession] = useState<ReconciliationSession | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [filterStatus, setFilterStatus] = useState<ReconciliationStatus | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [observationText, setObservationText] = useState('')
  const [editingObservation, setEditingObservation] = useState(false)
  const [records, setRecords] = useState<ReconciliationRecord[]>(initialRecords)
  const [kpiData, setKpiData] =
  useState(kpi)

const [sessionsData, setSessionsData] =
  useState(sessions)
  const [activeTab, setActiveTab] = useState<ActiveTab>('historial')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const matchRate =
    kpi.totalExcel > 0 ? Math.round((kpi.matches / kpi.totalExcel) * 100) : 0

  const filteredRecords = records.filter((r) => {
    const matchStatus = filterStatus === 'ALL' || r.status === filterStatus
    const q = searchQuery.toLowerCase()
    const matchSearch =
      !q ||
      r.invoiceNumber.toLowerCase().includes(q) ||
      r.supplier.toLowerCase().includes(q) ||
      r.ruc.includes(q)
    return matchStatus && matchSearch
  })

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!['.xlsx', '.xls'].includes(ext)) {
      alert('Solo se permiten archivos .xlsx o .xls')
      return
    }
    setUploadedFile(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!['.xlsx', '.xls'].includes(ext)) return
    setUploadedFile(file)
  }, [])

  const handleProcess = async () => {

  if (!uploadedFile) return

  setIsProcessing(true)

  try {

    const formData =
      new FormData()

    formData.append(
      "archivo",
      uploadedFile
    )

    const response =
      await fetch(
        "/api/conciliacion-facturas",
        {
          method: "POST",
          body: formData
        }
      )

    const data =
      await response.json()

    const nuevosRegistros = [

      ...(data.coincidenciasDetalle || [])
        .map((r: any, index: number) => ({
          id: `C-${index}`,
          invoiceNumber: r.factura,
          status: "COINCIDE",
          amountExcel: r.montoExcel,
          amountSystem: r.montoSistema,
          supplier: "-",
          ruc: "-",
          date: new Date()
            .toISOString()
            .split("T")[0],
          observation: null
        })),

      ...(data.noEncontradasDetalle || [])
  .map((r: any, index: number) => ({
    id: `N-${index}`,
    invoiceNumber: r.factura,
    status: "NO_ENCONTRADA",

    amountExcel: r.montoExcel,

    amountSystem: null,

    supplier: r.proveedor || "-",

    ruc: r.ruc || "-",

    date: r.fecha ||
      new Date()
        .toISOString()
        .split("T")[0],

    observation:
      "No existe en cuentas_por_pagar"
  })),

      ...(data.diferenciasMontoDetalle || [])
        .map((r: any, index: number) => ({
          id: `D-${index}`,
          invoiceNumber: r.factura,
          status: "DIFERENCIA_MONTO",
          amountExcel: r.montoExcel,
          amountSystem: r.montoSistema,
          supplier: "-",
          ruc: "-",
          date: new Date()
            .toISOString()
            .split("T")[0],
          observation: null
        }))

    ]

    setRecords(
      nuevosRegistros
    )

    setKpiData({
      totalExcel:
        data.totalExcel,

      matches:
        data.coincidencias,

      observations:
        data.noEncontradas,

      amountDifferences:
        data.diferenciasMonto
    })

    setActiveTab(
      "resultados"
    )

  } catch (error) {

    console.error(error)

  } finally {

    setIsProcessing(false)

  }

}

  const handleSaveObservation = async () => {
    if (!selectedRecord) return
    await onSaveObservation?.(selectedRecord.id, observationText)
    setRecords((prev) =>
      prev.map((r) =>
        r.id === selectedRecord.id ? { ...r, observation: observationText } : r
      )
    )
    setSelectedRecord((prev) => (prev ? { ...prev, observation: observationText } : prev))
    setEditingObservation(false)
  }

  const handleApprove = async () => {
    if (!selectedRecord) return
    await onApprove?.(selectedRecord.id)
  }

  // Seleccionar sesión → ir a Resultados
  const handleSelectSession = (session: ReconciliationSession) => {
    setSelectedSession(session)
    setSelectedRecord(null)
    setObservationText('')
    setEditingObservation(false)
    setActiveTab('resultados')
  }

  // Seleccionar factura → ir a Detalle
  const handleSelectRecord = (record: ReconciliationRecord) => {
    setSelectedRecord(record)
    setObservationText(record.observation ?? '')
    setEditingObservation(false)
    setActiveTab('detalle')
  }

  const fileSizeLabel = uploadedFile
    ? uploadedFile.size > 1024 * 1024
      ? `${(uploadedFile.size / 1024 / 1024).toFixed(1)} MB`
      : `${(uploadedFile.size / 1024).toFixed(0)} KB`
    : ''

  const lastSyncLabel = lastSync
    ? new Date(lastSync).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : '—'

  // Tab labels con contadores contextuales
  const TAB_CONFIG: { id: ActiveTab; label: string; count?: number }[] = [
    { id: 'historial', label: 'Historial', count: sessions.length || undefined },
    { id: 'resultados', label: 'Resultados', count: records.length || undefined },
    { id: 'detalle', label: 'Detalle' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── Page Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>SEAMAR</span>
            <span>/</span>
            <span>Tesorería</span>
            <span>/</span>
            <span className="text-slate-600 font-medium">Conciliación de Facturas</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                Conciliación de Facturas
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Comparación automática entre Excel del cliente y documentos registrados en SEAMAR
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              {lastSync ? `Última sincronización: hoy ${lastSyncLabel}` : 'Sin sincronización reciente'}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-5 space-y-5">
        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard
            label="Facturas Excel"
            value={kpiData.totalExcel}
            sublabel="Total cargado"
            accent="bg-blue-50"
            icon={
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
            }
          />
          <KPICard
            label="Coincidencias"
            value={kpiData.matches}
            sublabel={kpiData.totalExcel > 0 ? `${matchRate}% de coincidencia` : 'Sin datos procesados'}
            accent="bg-emerald-50"
            icon={
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            }
          />
          <KPICard
            label="Observaciones"
            value={kpiData.observations}
            sublabel={kpiData.observations > 0 ? 'Requieren revisión' : 'Sin observaciones'}
            accent="bg-amber-50"
            icon={
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            }
          />
          <KPICard
            label="Diferencias de Monto"
            value={kpi.amountDifferences}
            sublabel={kpi.amountDifferences > 0 ? 'Montos no coinciden' : 'Sin diferencias'}
            accent="bg-red-50"
            icon={
              <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            }
          />
        </div>

        {/* ── Upload Panel ── */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <h2 className="text-sm font-semibold text-slate-700">Seleccionar archivo Excel</h2>
          </div>

          <div className="flex flex-col xl:flex-row gap-4">
            {/* Drop zone — div, no button, para evitar nesting de interactivos */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Seleccionar archivo Excel"
              className={`flex-1 border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
                uploadedFile
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
              {uploadedFile ? (
                <>
                  <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-medium text-emerald-700">{uploadedFile.name}</p>
                    <p className="text-xs text-emerald-500 mt-0.5">{fileSizeLabel}</p>
                  </div>
                </>
              ) : (
                <>
                  <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm text-slate-500">Arrastra tu archivo aquí</p>
                    <p className="text-xs text-slate-400 mt-0.5">o haz clic para explorar — .xlsx, .xls</p>
                  </div>
                </>
              )}
            </div>

            {/* File meta + actions */}
            <div className="flex flex-col gap-3 xl:w-64">
              {uploadedFile && (
                <div className="bg-slate-50 rounded-md border border-slate-200 p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Archivo</span>
                    <span className="text-slate-700 font-medium truncate max-w-[140px]">{uploadedFile.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Tamaño</span>
                    <span className="text-slate-700">{fileSizeLabel}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Cargado</span>
                    <span className="text-slate-700">{new Date().toLocaleDateString('es-PE')}</span>
                  </div>
                </div>
              )}
              <button
                disabled={!uploadedFile || isProcessing}
                onClick={handleProcess}
                className="w-full py-2 px-4 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Procesando…
                  </>
                ) : (
                  'Procesar Conciliación'
                )}
              </button>
              {uploadedFile && (
                <button
                  onClick={() => {
                    setUploadedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="w-full py-2 px-4 border border-slate-200 text-slate-600 text-sm rounded-md hover:bg-slate-50 transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Tab Navigation — siempre visible ── */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-slate-200">
            {TAB_CONFIG.map((tab, idx) => {
              const isActive = activeTab === tab.id
              // Indicar flujo con flecha entre tabs
              const showArrow = idx < TAB_CONFIG.length - 1
              return (
                <div key={tab.id} className="flex items-center flex-1">
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors relative ${
                      isActive
                        ? 'text-blue-700 bg-blue-50'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                    )}
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                  {showArrow && (
                    <span className="text-slate-300 text-xs shrink-0">›</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Panel: Historial ── */}
          {activeTab === 'historial' && (
            <div>
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-slate-400">
                  <svg className="w-10 h-10 mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <p className="text-sm font-medium text-slate-500">Sin historial</p>
                  <p className="text-xs mt-1">Las conciliaciones procesadas aparecerán aquí</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sessions.map((session) => {
                    const cfg = getSessionStatusConfig(session.status)
                    const isActive = selectedSession?.id === session.id
                    return (
                      // Un único div clicable — sin botón anidado
                      <div
                        key={session.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectSession(session)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSelectSession(session) }}
                        className={`flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                          isActive ? 'bg-blue-50 border-l-2 border-blue-600' : ''
                        }`}
                      >
                        {/* Icono */}
                        <div className="shrink-0 w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{session.fileName}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-slate-400">{formatDate(session.date)}</span>
                            <span className="text-xs text-emerald-600">{session.matches} coincidencias</span>
                            {session.observations > 0 && (
                              <span className="text-xs text-amber-600">{session.observations} obs.</span>
                            )}
                          </div>
                        </div>

                        {/* Estado + flecha */}
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                          <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Panel: Resultados ── */}
          {activeTab === 'resultados' && (
            <div className="flex flex-col">
              {/* Toolbar */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {selectedSession && (
                    <>
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="font-medium text-slate-700 truncate max-w-[200px]">{selectedSession.fileName}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Buscar factura, proveedor, RUC…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 w-52"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as ReconciliationStatus | 'ALL')}
                    className="text-xs border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-600"
                  >
                    <option value="ALL">Todos los estados</option>
                    <option value="COINCIDE">Coincide</option>
                    <option value="NO_ENCONTRADA">No encontrada</option>
                    <option value="DIFERENCIA_MONTO">Diferencia de monto</option>
                  </select>
                </div>
              </div>

              {/* Table or empty states */}
              {records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 px-6 text-center">
                  <svg className="w-12 h-12 mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <p className="text-sm font-medium text-slate-500">Sin resultados aún</p>
                  <p className="text-xs mt-1 max-w-xs">
                    Carga un archivo Excel y presiona{' '}
                    <span className="font-medium text-slate-600">Procesar Conciliación</span>{' '}
                    para ver los resultados aquí
                  </p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <svg className="w-10 h-10 mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <p className="text-sm font-medium text-slate-500">Sin resultados</p>
                  <p className="text-xs mt-1">Ajusta los filtros o el término de búsqueda</p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {['Factura', 'Estado', 'Monto Excel', 'Monto Sistema', 'Proveedor', 'Fecha'].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide text-[10px] whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredRecords.map((record) => {
                        const isSelected = selectedRecord?.id === record.id
                        return (
                          <tr
                            key={record.id}
                            onClick={() => handleSelectRecord(record)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-50 ring-1 ring-inset ring-blue-200'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-4 py-2.5 font-mono font-medium text-slate-700 whitespace-nowrap">
                              {record.invoiceNumber}
                            </td>
                            <td className="px-4 py-2.5">
                              <StatusBadge status={record.status} />
                            </td>
                            <td className="px-4 py-2.5 tabular-nums text-slate-700 whitespace-nowrap">
                              {formatCurrency(record.amountExcel)}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums whitespace-nowrap">
                              {record.amountSystem !== null ? (
                                <span className={record.amountSystem !== record.amountExcel ? 'text-amber-700 font-medium' : 'text-slate-700'}>
                                  {formatCurrency(record.amountSystem)}
                                </span>
                              ) : (
                                <span className="text-slate-300 italic">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 max-w-[160px] truncate">
                              {record.supplier}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                              {formatDate(record.date)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {records.length === 0
                    ? 'Sin registros'
                    : `${filteredRecords.length} de ${records.length} registros`}
                </span>
                {records.length > 0 && (
                  <button
                    onClick={onExport}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Exportar Excel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Panel: Detalle ── */}
          {activeTab === 'detalle' && (
            <div>
              {!selectedRecord ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 px-6 text-center">
                  <svg className="w-10 h-10 mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                  <p className="text-sm font-medium text-slate-500">Sin selección</p>
                  <p className="text-xs mt-1">Selecciona una factura desde Resultados para ver el detalle</p>
                  <button
                    onClick={() => setActiveTab('resultados')}
                    className="mt-4 text-xs text-blue-600 hover:underline font-medium"
                  >
                    ← Ir a Resultados
                  </button>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto">
                  {/* Breadcrumb de contexto */}
                  <div className="flex items-center gap-2 px-6 pt-4 pb-2 text-xs text-slate-400">
                    <button
                      onClick={() => setActiveTab('historial')}
                      className="hover:text-blue-600 transition-colors"
                    >
                      Historial
                    </button>
                    <span>›</span>
                    <button
                      onClick={() => setActiveTab('resultados')}
                      className="hover:text-blue-600 transition-colors"
                    >
                      Resultados
                    </button>
                    <span>›</span>
                    <span className="text-slate-600 font-medium">{selectedRecord.invoiceNumber}</span>
                  </div>

                  {/* Status banner */}
                  <div className={`mx-6 rounded-lg border flex items-center gap-3 px-4 py-3 mb-5 ${getStatusConfig(selectedRecord.status).bg} ${getStatusConfig(selectedRecord.status).border}`}>
                    <StatusBadge status={selectedRecord.status} />
                    <span className="text-xs text-slate-500 ml-auto">{formatDate(selectedRecord.date)}</span>
                  </div>

                  <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Datos de factura */}
                    <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Factura</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Número</span>
                          <span className="font-mono font-semibold text-slate-800">{selectedRecord.invoiceNumber}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Fecha</span>
                          <span className="text-slate-700">{formatDate(selectedRecord.date)}</span>
                        </div>
                      </div>
                    </section>

                    {/* Datos de proveedor */}
                    <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Proveedor</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs gap-2">
                          <span className="text-slate-500 shrink-0">Razón social</span>
                          <span className="text-slate-700 text-right">{selectedRecord.supplier}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">RUC</span>
                          <span className="font-mono text-slate-700">{selectedRecord.ruc}</span>
                        </div>
                      </div>
                    </section>

                    {/* Comparación de montos — ancho completo */}
                    <section className="md:col-span-2 bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Comparación de Montos</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-md p-3 text-center border border-slate-100">
                          <p className="text-[10px] text-slate-400 mb-1">Excel</p>
                          <p className="text-base font-semibold text-slate-800 tabular-nums">
                            {formatCurrency(selectedRecord.amountExcel)}
                          </p>
                        </div>
                        <div
                          className={`rounded-md p-3 text-center border ${
                            selectedRecord.amountSystem === null
                              ? 'bg-red-50 border-red-100'
                              : selectedRecord.amountSystem !== selectedRecord.amountExcel
                              ? 'bg-amber-50 border-amber-100'
                              : 'bg-emerald-50 border-emerald-100'
                          }`}
                        >
                          <p className="text-[10px] text-slate-400 mb-1">Sistema</p>
                          <p
                            className={`text-base font-semibold tabular-nums ${
                              selectedRecord.amountSystem === null
                                ? 'text-red-500 italic text-xs'
                                : selectedRecord.amountSystem !== selectedRecord.amountExcel
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {selectedRecord.amountSystem !== null
                              ? formatCurrency(selectedRecord.amountSystem)
                              : 'No registrado'}
                          </p>
                        </div>
                      </div>
                      {selectedRecord.amountSystem !== null &&
                        selectedRecord.amountSystem !== selectedRecord.amountExcel && (
                          <div className="flex justify-between text-xs bg-amber-50 rounded px-3 py-2 border border-amber-100">
                            <span className="text-amber-700">Diferencia</span>
                            <span className="font-semibold text-amber-800">
                              {formatCurrency(Math.abs(selectedRecord.amountExcel - selectedRecord.amountSystem))}
                            </span>
                          </div>
                        )}
                    </section>

                    {/* Observación — ancho completo */}
                    <section className="md:col-span-2 bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Observación</p>
                        {!editingObservation && (
                          <button
                            onClick={() => setEditingObservation(true)}
                            className="text-[10px] text-blue-600 hover:underline"
                          >
                            {selectedRecord.observation ? 'Editar' : 'Agregar'}
                          </button>
                        )}
                      </div>
                      {editingObservation ? (
                        <div className="space-y-2">
                          <textarea
                            value={observationText}
                            onChange={(e) => setObservationText(e.target.value)}
                            rows={3}
                            className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                            placeholder="Escribe la observación…"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveObservation}
                              className="flex-1 py-1.5 bg-blue-700 text-white text-xs rounded-md hover:bg-blue-800 transition-colors"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditingObservation(false)}
                              className="flex-1 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-md hover:bg-slate-50 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : selectedRecord.observation ? (
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-md px-2.5 py-2 border border-slate-100">
                          {selectedRecord.observation}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Sin observaciones</p>
                      )}
                    </section>
                  </div>

                  {/* Action buttons */}
                  <div className="px-6 pb-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                    <button
                      onClick={() => setEditingObservation(true)}
                      className="flex items-center gap-1.5 py-2 px-4 text-xs font-medium border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Crear Observación
                    </button>
                    <button
                      onClick={onExport}
                      className="flex items-center gap-1.5 py-2 px-4 text-xs font-medium border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Exportar Excel
                    </button>
                    <button
                      onClick={handleApprove}
                      className="flex items-center gap-1.5 py-2 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors ml-auto"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Aprobar Conciliación
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}