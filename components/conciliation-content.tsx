"use client"

import { useState, type ReactNode } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Coins,
  Copy,
  Eye,
  FileCheck2,
  FileText,
  Landmark,
  ReceiptText,
  Search,
  XCircle,
} from "lucide-react"
import {
  bankMatches,
  bankMovements,
  matchSuggestions,
  syncedDocuments,
  type BankMovement,
  type Currency,
  type MatchSuggestion,
  type SyncedDocument,
} from "@/components/conciliation-data"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Currency = "PEN" | "USD"

interface SyncedDocument {
  id: string
  fileName: string
  docType: "Factura" | "Recibo" | "Comprobante" | "Nota de crédito"
  party: string
  ruc: string
  docNumber: string
  currency: Currency
  amount: number
  date: string
  readStatus: "leido" | "pendiente" | "error"
  source: "OneDrive"
}

interface MatchSuggestion {
  id: string
  docId: string
  type: "CxC" | "CxP"
  party: string
  invoiceNumber: string
  currency: Currency
  amount: number
  balance: number
  status: "Pendiente" | "Parcial" | "Pagado"
  matchPercent: number
  amountDiff: number
  currencyDiff: boolean
  alert:
    | "exact"
    | "amount_diff"
    | "currency_diff"
    | "duplicate"
    | "none"
}

const syncedDocuments: SyncedDocument[] = [
  {
    id: "d1",
    fileName: "F001-002345_Tottus.pdf",
    docType: "Factura",
    party: "Hipermercados Tottus S.A.",
    ruc: "20508565934",
    docNumber: "F001-002345",
    currency: "PEN",
    amount: 12450.5,
    date: "2025-06-12",
    readStatus: "leido",
    source: "OneDrive",
  },
  {
    id: "d2",
    fileName: "FT-9821_Cencosud.pdf",
    docType: "Factura",
    party: "Cencosud Retail Perú",
    ruc: "20536557858",
    docNumber: "FT-9821",
    currency: "USD",
    amount: 3420,
    date: "2025-06-10",
    readStatus: "leido",
    source: "OneDrive",
  },
  {
    id: "d3",
    fileName: "recibo_luz_mayo.pdf",
    docType: "Recibo",
    party: "Enel Distribución Perú",
    ruc: "20269985900",
    docNumber: "R-554120",
    currency: "PEN",
    amount: 845.2,
    date: "2025-06-05",
    readStatus: "leido",
    source: "OneDrive",
  },
  {
    id: "d4",
    fileName: "NC-0034_DevolucionTai.pdf",
    docType: "Nota de crédito",
    party: "TAI Loyalty Perú",
    ruc: "20601334451",
    docNumber: "NC-0034",
    currency: "PEN",
    amount: 1200,
    date: "2025-06-08",
    readStatus: "pendiente",
    source: "OneDrive",
  },
  {
    id: "d5",
    fileName: "scan_factura_borrosa.jpg",
    docType: "Factura",
    party: "—",
    ruc: "—",
    docNumber: "—",
    currency: "PEN",
    amount: 0,
    date: "2025-06-14",
    readStatus: "error",
    source: "OneDrive",
  },
]

const matchSuggestions: Record<string, MatchSuggestion[]> = {
  d1: [
    {
      id: "m1",
      docId: "d1",
      type: "CxC",
      party: "Hipermercados Tottus S.A.",
      invoiceNumber: "F001-002345",
      currency: "PEN",
      amount: 12450.5,
      balance: 12450.5,
      status: "Pendiente",
      matchPercent: 100,
      amountDiff: 0,
      currencyDiff: false,
      alert: "exact",
    },
  ],
  d2: [
    {
      id: "m2",
      docId: "d2",
      type: "CxC",
      party: "Cencosud Retail Perú",
      invoiceNumber: "FT-9821",
      currency: "USD",
      amount: 3450,
      balance: 3450,
      status: "Pendiente",
      matchPercent: 92,
      amountDiff: -30,
      currencyDiff: false,
      alert: "amount_diff",
    },
    {
      id: "m2b",
      docId: "d2",
      type: "CxC",
      party: "Cencosud Retail Perú",
      invoiceNumber: "FT-9821",
      currency: "PEN",
      amount: 12800,
      balance: 12800,
      status: "Pendiente",
      matchPercent: 64,
      amountDiff: 0,
      currencyDiff: true,
      alert: "currency_diff",
    },
  ],
  d3: [
    {
      id: "m3",
      docId: "d3",
      type: "CxP",
      party: "Enel Distribución Perú",
      invoiceNumber: "R-554120",
      currency: "PEN",
      amount: 845.2,
      balance: 845.2,
      status: "Pendiente",
      matchPercent: 100,
      amountDiff: 0,
      currencyDiff: false,
      alert: "exact",
    },
  ],
  d4: [],
  d5: [],
}

const readTone: Record<
  SyncedDocument["readStatus"],
  "success" | "warning" | "destructive"
> = {
  leido: "success",
  pendiente: "warning",
  error: "destructive",
}

const readLabel: Record<SyncedDocument["readStatus"], string> = {
  leido: "Leído",
  pendiente: "Pendiente",
  error: "Con error",
}

function CurrencyBadge({
  currency,
}: {
  currency: Currency
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold",
        currency === "PEN"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-sky-500/30 bg-sky-500/10 text-sky-400"
      )}
    >
      {currency === "PEN" ? "S/ PEN" : "$ USD"}
    </span>
  )
}

function Money({
  amount,
  currency,
  className,
}: {
  amount: number
  currency: Currency
  className?: string
}) {
  const symbol = currency === "PEN" ? "S/" : "$"

  return (
    <span className={cn("font-medium tabular-nums", className)}>
      {symbol}{" "}
      {amount.toLocaleString("es-PE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </span>
  )
}

function StatusPill({
  tone = "neutral",
  children,
}: {
  tone?: "success" | "warning" | "destructive" | "info" | "neutral"
  children: ReactNode
}) {
  const map = {
    success:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    warning:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
    destructive:
      "border-red-500/30 bg-red-500/10 text-red-400",
    info:
      "border-sky-500/30 bg-sky-500/10 text-sky-400",
    neutral:
      "border-border bg-muted text-muted-foreground",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        map[tone]
      )}
    >
      {children}
    </span>
  )
}

function SectionCard({
  title,
  description,
  right,
  children,
}: {
  title: string
  description?: string
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {right}
      </div>

      <div className="p-4">{children}</div>
    </div>
  )
}

function AlertChip({
  alert,
}: {
  alert: MatchSuggestion["alert"]
}) {
  const map = {
    exact: {
      tone: "success" as const,
      icon: CheckCircle2,
      label: "Coincidencia exacta",
    },
    amount_diff: {
      tone: "warning" as const,
      icon: AlertTriangle,
      label: "Diferencia de monto",
    },
    currency_diff: {
      tone: "warning" as const,
      icon: Coins,
      label: "Moneda diferente",
    },
    duplicate: {
      tone: "destructive" as const,
      icon: Copy,
      label: "Documento duplicado",
    },
    none: {
      tone: "neutral" as const,
      icon: XCircle,
      label: "Sin información",
    },
  }

  const cfg = map[alert]
  const Icon = cfg.icon

  return (
    <StatusPill tone={cfg.tone}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </StatusPill>
  )
}

function InvoiceReconciliation() {
  const [selectedId, setSelectedId] = useState<string>(
    syncedDocuments[0].id
  )
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  const filtered = syncedDocuments.filter((d) => {
    const matchesQuery =
      !query ||
      d.fileName.toLowerCase().includes(query.toLowerCase()) ||
      d.party.toLowerCase().includes(query.toLowerCase()) ||
      d.docNumber.toLowerCase().includes(query.toLowerCase())

    const matchesType =
      typeFilter === "all" || d.docType === typeFilter

    return matchesQuery && matchesType
  })

  const selected = syncedDocuments.find((d) => d.id === selectedId)
  const matches = selected
    ? matchSuggestions[selected.id] ?? []
    : []

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <SectionCard
          title="Documentos sincronizados"
          description="Fuente: OneDrive · Lectura automática de facturas, recibos y comprobantes"
          right={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar archivo, cliente o documento..."
                  className="h-8 w-56 pl-7 text-xs"
                />
              </div>

              <Select
                value={typeFilter}
                onValueChange={setTypeFilter}
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    Todos los tipos
                  </SelectItem>
                  <SelectItem value="Factura">
                    Factura
                  </SelectItem>
                  <SelectItem value="Recibo">
                    Recibo
                  </SelectItem>
                  <SelectItem value="Comprobante">
                    Comprobante
                  </SelectItem>
                  <SelectItem value="Nota de crédito">
                    Nota de crédito
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        >
          <div className="-mx-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">
                    Archivo
                  </TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>
                    Cliente / Proveedor
                  </TableHead>
                  <TableHead>N° Doc.</TableHead>
                  <TableHead className="text-right">
                    Monto
                  </TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="pr-4 text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((d) => {
                  const isSelected = d.id === selectedId

                  return (
                    <TableRow
                      key={d.id}
                      onClick={() => setSelectedId(d.id)}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected &&
                          "bg-accent/60 hover:bg-accent/60"
                      )}
                    >
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />

                          <div>
                            <div className="text-sm font-medium">
                              {d.fileName}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              OneDrive · {d.source}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        {d.docType}
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          {d.party}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          RUC {d.ruc}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        {d.docNumber}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <CurrencyBadge
                            currency={d.currency}
                          />
                          <Money
                            amount={d.amount}
                            currency={d.currency}
                            className="text-sm"
                          />
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {d.date}
                      </TableCell>

                      <TableCell>
                        <StatusPill tone={readTone[d.readStatus]}>
                          {readLabel[d.readStatus]}
                        </StatusPill>
                      </TableCell>

                      <TableCell className="pr-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedId(d.id)
                            }}
                          >
                            <Search className="mr-1 h-3 w-3" />
                            Buscar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      </div>

      <div className="lg:col-span-2">
        <SectionCard
          title="Coincidencias sugeridas"
          description={
            selected
              ? `Para ${selected.docNumber} · ${selected.party}`
              : "Selecciona un documento"
          }
        >
          {!selected ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Selecciona un documento para buscar coincidencias.
            </div>
          ) : matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 p-8 text-center">
              <AlertTriangle className="h-6 w-6 text-yellow-400" />

              <div className="text-sm font-medium">
                Sin coincidencias encontradas
              </div>

              <p className="text-xs text-muted-foreground">
                No se hallaron registros de CxC o CxP que
                coincidan con este documento.
              </p>

              <Button
                size="sm"
                variant="outline"
                className="mt-1 text-xs"
              >
                Marcar como observado
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusPill
                          tone={
                            m.type === "CxC"
                              ? "info"
                              : "warning"
                          }
                        >
                          {m.type}
                        </StatusPill>

                        <CurrencyBadge currency={m.currency} />
                      </div>

                      <div className="mt-1.5 text-sm font-semibold">
                        {m.party}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Factura {m.invoiceNumber}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Coincidencia
                      </div>

                      <div
                        className={cn(
                          "text-lg font-bold tabular-nums",
                          m.matchPercent >= 95
                            ? "text-emerald-400"
                            : m.matchPercent >= 75
                              ? "text-yellow-400"
                              : "text-red-400"
                        )}
                      >
                        {m.matchPercent}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="text-[10px] uppercase text-muted-foreground">
                        Monto reg.
                      </div>
                      <Money
                        amount={m.amount}
                        currency={m.currency}
                        className="text-xs"
                      />
                    </div>

                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="text-[10px] uppercase text-muted-foreground">
                        Saldo
                      </div>
                      <Money
                        amount={m.balance}
                        currency={m.currency}
                        className="text-xs"
                      />
                    </div>

                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="text-[10px] uppercase text-muted-foreground">
                        Diferencia
                      </div>
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          m.amountDiff === 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        )}
                      >
                        {m.amountDiff === 0
                          ? "—"
                          : `${m.amountDiff > 0 ? "+" : ""}${m.amountDiff.toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <AlertChip alert={m.alert} />

                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                      >
                        Observar
                      </Button>

                      <Button
                        size="sm"
                        className="h-7 text-xs"
                      >
                        Conciliar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

function BankReconciliation() {
  return (
    <SectionCard
      title="Conciliación bancaria"
      description="Movimientos bancarios sincronizados"
    >
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          BankReconciliation migrándose...
        </p>
      </div>
    </SectionCard>
  )
}

export default function ConciliationContent() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileCheck2 className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-lg font-semibold leading-tight text-foreground">
                Conciliación
              </h1>
              <p className="text-xs text-muted-foreground">
                Cruce de documentos sincronizados con CxC, CxP y bancos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs">
            <Cloud className="h-3.5 w-3.5 text-sky-400" />
            <span className="font-medium text-foreground">
              OneDrive
            </span>
            <span className="text-muted-foreground">
              conectado · última sincronización 14 jun, 09:32
            </span>
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <Tabs defaultValue="invoices" className="space-y-5">
          <TabsList className="grid w-full grid-cols-2 gap-1 bg-muted/60 p-1 sm:w-auto sm:inline-grid">
            <TabsTrigger
              value="invoices"
              className="gap-1.5 text-xs sm:text-sm"
            >
              <ReceiptText className="h-3.5 w-3.5" />
              Conciliación de facturas
            </TabsTrigger>

            <TabsTrigger
              value="bank"
              className="gap-1.5 text-xs sm:text-sm"
            >
              <Landmark className="h-3.5 w-3.5" />
              Conciliación bancaria
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-4">
            <InvoiceReconciliation />
          </TabsContent>

          <TabsContent value="bank" className="space-y-4">
            <BankReconciliation />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}