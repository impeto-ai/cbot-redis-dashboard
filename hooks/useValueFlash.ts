"use client"

import { useState, useEffect, useRef } from "react"

/**
 * Hook para detectar mudança de valor e aplicar flash visual
 * Retorna uma classe CSS que aplica animação quando o valor muda
 */
export function useValueFlash(value: number | null, type: "positive" | "negative" | "price" = "positive") {
  const [isFlashing, setIsFlashing] = useState(false)
  const prevValueRef = useRef<number | null>(value)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Verificar se o valor mudou
    if (value !== null && prevValueRef.current !== null && value !== prevValueRef.current) {
      setIsFlashing(true)

      // Remover flash após a animação (800ms)
      timeoutRef.current = setTimeout(() => {
        setIsFlashing(false)
      }, 800)
    }

    // Atualizar valor anterior
    prevValueRef.current = value

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value])

  if (!isFlashing) return ""

  switch (type) {
    case "positive":
      return "cell-flash-positive"
    case "negative":
      return "cell-flash-negative"
    case "price":
      return "cell-flash-price"
    default:
      return ""
  }
}
