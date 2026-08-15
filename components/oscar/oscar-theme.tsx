"use client"

import { useLayoutEffect } from "react"

export function OscarTheme({ fontClass }: { fontClass: string }) {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.add("oscar-module")
    fontClass
      .split(" ")
      .filter(Boolean)
      .forEach((c) => root.classList.add(c))
    return () => {
      root.classList.remove("oscar-module")
      fontClass
        .split(" ")
        .filter(Boolean)
        .forEach((c) => root.classList.remove(c))
    }
  }, [fontClass])

  return null
}
