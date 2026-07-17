"use client"

import { createContext, useContext } from "react"

export type UserInfo = {
  id: number
  nombre: string
  usuario: string
  rol: string
  cargo?: string | null
  avatar?: string | null
}

type RoleContextType = {
  rol: string
}

const RoleContext = createContext<RoleContextType>({ rol: "" })
const UserContext = createContext<UserInfo | null>(null)

export function RoleProvider({
  children,
  sesion,
}: {
  children: React.ReactNode
  sesion: UserInfo | null
}) {
  const rol = sesion?.rol || ""
  return (
    <UserContext.Provider value={sesion}>
      <RoleContext.Provider value={{ rol }}>
        {children}
      </RoleContext.Provider>
    </UserContext.Provider>
  )
}

export function useRol() {
  return useContext(RoleContext)
}

export function useUser() {
  return useContext(UserContext)
}
