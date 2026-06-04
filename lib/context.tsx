'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import type {
  Cliente,
  Proyecto,
  Proveedor,
  CuentaPorCobrar,
  CuentaPorPagar,
  Documento
} from './types'

interface FinancialContextType {
  // Clientes
  clientes: Cliente[]
  setClientes: React.Dispatch<React.SetStateAction<Cliente[]>>
  addCliente: (cliente: Cliente) => void
  
  // Proyectos
  proyectos: Proyecto[]
  setProyectos: React.Dispatch<React.SetStateAction<Proyecto[]>>
  addProyecto: (proyecto: Proyecto) => void

  // Proveedores
  proveedores: Proveedor[]
  setProveedores: React.Dispatch<React.SetStateAction<Proveedor[]>>
  
  // Cuentas por Cobrar
  cuentasPorCobrar: CuentaPorCobrar[]
  setCuentasPorCobrar: React.Dispatch<React.SetStateAction<CuentaPorCobrar[]>>
  addCuentaPorCobrar: (cuenta: CuentaPorCobrar) => void
  
  // Cuentas por Pagar
  cuentasPorPagar: CuentaPorPagar[]
  setCuentasPorPagar: React.Dispatch<React.SetStateAction<CuentaPorPagar[]>>
  addCuentaPorPagar: (cuenta: CuentaPorPagar) => void
  
  // Documentos
  documentos: Documento[]
  setDocumentos: React.Dispatch<React.SetStateAction<Documento[]>>
  addDocumento: (documento: Documento) => void
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined)

export function FinancialProvider({ children }: { children: ReactNode }) {

  const [clientes, setClientes] = useState<Cliente[]>([])
  
  const [proyectos, setProyectos] = useState<Proyecto[]>([])

  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState<CuentaPorCobrar[]>([])
  
  const [cuentasPorPagar, setCuentasPorPagar] = useState<CuentaPorPagar[]>([])
  
  const [documentos, setDocumentos] = useState<Documento[]>([])

  // =========================
  // CARGAR CLIENTES Y PROYECTOS
  // =========================

  useEffect(() => {

    const cargarDatos = async () => {

      try {

        // CLIENTES
        const resClientes = await fetch('/api/clientes');
        const dataClientes = await resClientes.json();

        setClientes(dataClientes);

        // PROYECTOS
        const resProyectos = await fetch('/api/proyectos');
        const dataProyectos = await resProyectos.json();

        setProyectos(dataProyectos);

        // PROVEEDORES
        const resProveedores = await fetch('/api/proveedores');
        const dataProveedores = await resProveedores.json();

        setProveedores(dataProveedores);

      } catch (error) {

        console.error(error)

      }

    }

    cargarDatos()

  }, [])

  // =========================
  // FUNCIONES
  // =========================

  const addCliente = (cliente: Cliente) => {
    setClientes(prev => [...prev, cliente])
  }

  const addProyecto = (proyecto: Proyecto) => {
    setProyectos(prev => [...prev, proyecto])
  }

  const addCuentaPorCobrar = (cuenta: CuentaPorCobrar) => {
    setCuentasPorCobrar(prev => [...prev, cuenta])
  }

  const addCuentaPorPagar = (cuenta: CuentaPorPagar) => {
    setCuentasPorPagar(prev => [...prev, cuenta])
  }

  const addDocumento = (documento: Documento) => {
    setDocumentos(prev => [...prev, documento])
  }

  return (
    <FinancialContext.Provider
      value={{
        clientes,
        setClientes,
        addCliente,

        proyectos,
        setProyectos,
        addProyecto,

        cuentasPorCobrar,
        setCuentasPorCobrar,
        addCuentaPorCobrar,

        cuentasPorPagar,
        setCuentasPorPagar,
        addCuentaPorPagar,

        documentos,
        setDocumentos,
        addDocumento,

        proveedores,
        setProveedores,
      }}
    >
      {children}
    </FinancialContext.Provider>
  )
}

export function useFinancial() {

  const context = useContext(FinancialContext)

  if (context === undefined) {
    throw new Error('useFinancial must be used within a FinancialProvider')
  }

  return context

}