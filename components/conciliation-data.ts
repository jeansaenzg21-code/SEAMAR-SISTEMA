export type Currency = "PEN" | "USD"

export interface SyncedDocument {
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

export interface MatchSuggestion {
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

export interface BankMovement {
  id: string
  bank: string
  account: string
  currency: Currency
  date: string
  description: string
  opCode: string
  income: number
  expense: number
  status: "sin_conciliar" | "conciliado" | "observado"
}

export interface BankMatch {
  id: string
  movementId: string
  invoiceNumber: string
  type: "CxC" | "CxP"
  party: string
  currency: Currency
  expected: number
  bankAmount: number
  diff: number
  level: number
}

export const syncedDocuments: SyncedDocument[] = [
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
  {
    id: "d6",
    fileName: "F003-110_Backus.pdf",
    docType: "Factura",
    party: "Unión de Cervecerías Backus",
    ruc: "20100113610",
    docNumber: "F003-000110",
    currency: "PEN",
    amount: 8980,
    date: "2025-06-11",
    readStatus: "leido",
    source: "OneDrive",
  },
]

export const matchSuggestions: Record<string, MatchSuggestion[]> = {
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
    {
      id: "m3b",
      docId: "d3",
      type: "CxP",
      party: "Enel Distribución Perú",
      invoiceNumber: "R-554120",
      currency: "PEN",
      amount: 845.2,
      balance: 0,
      status: "Pagado",
      matchPercent: 100,
      amountDiff: 0,
      currencyDiff: false,
      alert: "duplicate",
    },
  ],
  d4: [],
  d5: [],
  d6: [
    {
      id: "m6",
      docId: "d6",
      type: "CxP",
      party: "Unión de Cervecerías Backus",
      invoiceNumber: "F003-000110",
      currency: "PEN",
      amount: 8980,
      balance: 8980,
      status: "Pendiente",
      matchPercent: 100,
      amountDiff: 0,
      currencyDiff: false,
      alert: "exact",
    },
  ],
}

export const bankMovements: BankMovement[] = [
  {
    id: "b1",
    bank: "BCP",
    account: "194-2345678-0-12",
    currency: "PEN",
    date: "2025-06-12",
    description: "ABONO TRANSF TOTTUS",
    opCode: "TR-998211",
    income: 12450.5,
    expense: 0,
    status: "sin_conciliar",
  },
  {
    id: "b2",
    bank: "Interbank",
    account: "200-3001234567",
    currency: "USD",
    date: "2025-06-11",
    description: "WIRE CENCOSUD RETAIL",
    opCode: "WT-44120",
    income: 3420,
    expense: 0,
    status: "sin_conciliar",
  },
  {
    id: "b3",
    bank: "BBVA",
    account: "0011-0123-4567890",
    currency: "PEN",
    date: "2025-06-06",
    description: "PAGO SERVICIOS ENEL",
    opCode: "PS-77821",
    income: 0,
    expense: 845.2,
    status: "sin_conciliar",
  },
  {
    id: "b4",
    bank: "BCP",
    account: "194-2345678-0-12",
    currency: "PEN",
    date: "2025-06-09",
    description: "COMISION MANTENIMIENTO",
    opCode: "CM-001",
    income: 0,
    expense: 32,
    status: "observado",
  },
  {
    id: "b5",
    bank: "Scotiabank",
    account: "000-9988776655",
    currency: "PEN",
    date: "2025-06-03",
    description: "ABONO BACKUS PAGO FAC",
    opCode: "TR-55009",
    income: 8980,
    expense: 0,
    status: "conciliado",
  },
]

export const bankMatches: Record<string, BankMatch[]> = {
  b1: [
    {
      id: "bm1",
      movementId: "b1",
      invoiceNumber: "F001-002345",
      type: "CxC",
      party: "Hipermercados Tottus S.A.",
      currency: "PEN",
      expected: 12450.5,
      bankAmount: 12450.5,
      diff: 0,
      level: 100,
    },
  ],
  b2: [
    {
      id: "bm2",
      movementId: "b2",
      invoiceNumber: "FT-9821",
      type: "CxC",
      party: "Cencosud Retail Perú",
      currency: "USD",
      expected: 3450,
      bankAmount: 3420,
      diff: -30,
      level: 92,
    },
  ],
  b3: [
    {
      id: "bm3",
      movementId: "b3",
      invoiceNumber: "R-554120",
      type: "CxP",
      party: "Enel Distribución Perú",
      currency: "PEN",
      expected: 845.2,
      bankAmount: 845.2,
      diff: 0,
      level: 100,
    },
  ],
  b4: [],
  b5: [
    {
      id: "bm5",
      movementId: "b5",
      invoiceNumber: "F003-000110",
      type: "CxC",
      party: "Unión de Cervecerías Backus",
      currency: "PEN",
      expected: 8980,
      bankAmount: 8980,
      diff: 0,
      level: 100,
    },
  ],
}