export type MonedaNormalizada = "SOLES" | "DOLARES"

const RE_DOLARES = /US\$|\b(USD|US D|D[ÓO]LAR(ES)?|D[ÓO]LAR(ES)? AMERICANO(S)?)\b|\$/
const RE_SOLES = /\b(PEN|NUEVOS SOLES|SOLES?)\b|S\/\.?/

/**
 * Normaliza cualquier representación de moneda a un valor estándar:
 * "SOLES" | "DOLARES". Reconoce S/, SOLES, PEN, SOL, SOLES PERUANOS
 * y US$, USD, US D, $, DOLAR, DÓLARES, DOLAR AMERICANO, etc.
 * Devuelve null si no encuentra ninguna evidencia.
 */
export function normalizarMoneda(valor: unknown): MonedaNormalizada | null {
  if (valor === null || valor === undefined) return null
  const texto = String(valor).toUpperCase().replace(/\s+/g, " ").trim()
  if (!texto) return null
  if (RE_DOLARES.test(texto)) return "DOLARES"
  if (RE_SOLES.test(texto)) return "SOLES"
  return null
}

/**
 * Igual que normalizarMoneda pero con un valor por defecto
 * ("SOLES" por omisión) para no romper llamadas existentes.
 */
export function monedaO(
  valor: unknown,
  defecto: MonedaNormalizada = "SOLES"
): MonedaNormalizada {
  return normalizarMoneda(valor) ?? defecto
}