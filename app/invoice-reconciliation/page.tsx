"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";

import InvoiceReconciliationContent, {
  ReconciliationRecord,
  KPISummary,
} from "@/components/invoice-reconciliation-content";


export default function InvoiceReconciliationPage() {

  const [records, setRecords] =
    useState<ReconciliationRecord[]>([]);

  const [kpi, setKpi] =
    useState<KPISummary>({
      totalExcel: 0,
      matches: 0,
      observations: 0,
      amountDifferences: 0,
    });

  async function handleProcess(
    archivo: File
  ) {

    const formData =
      new FormData();

    formData.append(
      "archivo",
      archivo
    );

    const response =
      await fetch(
        "/api/conciliacion-facturas",
        {
          method: "POST",
          body: formData,
        }
      );

    const data =
      await response.json();
      

    console.log(data);

    const coincidencias =
  (data.coincidenciasDetalle || [])
  .map((item: any, index: number) => ({

    id: `c-${index}`,

    invoiceNumber:
      item.factura,

    status:
      "COINCIDE",

    amountExcel:
      item.montoExcel,

    amountSystem:
      item.montoSistema,

    supplier:
      item.proveedor || "",

    ruc:
      item.ruc || "",

    date:
      item.fecha || "",

    observation:
      null,

  }));

    const noEncontradas =
  (data.noEncontradasDetalle || [])
  .map((item: any, index: number) => ({
    id: `n-${index}`,
    invoiceNumber: item.factura,
    status: "NO_ENCONTRADA",

    amountExcel:
  item.montoExcel,

    amountSystem: null,

    supplier:
      item.proveedor || "",

    ruc:
      item.ruc || "",

    date:
      item.fecha || "",

    observation:
      "No existe en cuentas_por_pagar"
  }));

    const diferencias =
  (data.diferenciasMontoDetalle || [])
  .map((item: any, index: number) => ({
    id: `d-${index}`,
    invoiceNumber: item.factura,
    status: "DIFERENCIA_MONTO",

    amountExcel: item.montoExcel,

    amountSystem: item.montoSistema,

    supplier:
      item.proveedor || "",

    ruc:
      item.ruc || "",

    date:
      item.fecha || "",

    observation:
      "Monto distinto entre Excel y sistema",
  }));

    setRecords([
      ...coincidencias,
      ...noEncontradas,
      ...diferencias,
    ]);

    setKpi({
      totalExcel:
        data.totalExcel || 0,

      matches:
        data.coincidencias || 0,

      observations:
        data.noEncontradas || 0,

      amountDifferences:
        data.diferenciasMonto || 0,
    });

 
  }

  return (
    <AppShell>
      <InvoiceReconciliationContent
        records={records}
        kpi={kpi}
        onProcess={handleProcess}
      />
    </AppShell>
  );
}
