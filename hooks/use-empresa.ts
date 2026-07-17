"use client"

import { useState, useEffect } from "react"

export interface EmpresaData {
  id: number | null
  razonSocial: string
  nombreComercial: string
  ruc: string
  direccion: string
  telefono: string
  correo: string
  logo: string | null
}

function rowToEmpresa(row: any): EmpresaData {
  return {
    id: row?.id ?? null,
    razonSocial: row?.razon_social ?? "",
    nombreComercial: row?.nombre_comercial ?? "",
    ruc: row?.ruc ?? "",
    direccion: row?.direccion ?? "",
    telefono: row?.telefono ?? "",
    correo: row?.correo ?? "",
    logo: row?.logo ?? null,
  }
}

export function useEmpresa() {
  const [data, setData] = useState<EmpresaData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function cargar() {
      try {
        const res = await fetch("/api/configuracion/empresa")
        if (res.ok) {
          const json = await res.json()
          if (!cancelled) {
            setData(json ? rowToEmpresa(json) : rowToEmpresa(null))
          }
        }
      } catch (error) {
        console.error(error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    cargar()

    return () => { cancelled = true }
  }, [])

  return { data, loading }
}
