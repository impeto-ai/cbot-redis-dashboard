"use client"

import { useState, useEffect, useRef } from "react"

export type FlashType = "positive" | "negative" | "neutral"

interface FlashState {
  [key: string]: {
    isFlashing: boolean
    flashType: FlashType
    timestamp: number
  }
}

export function useDataFlash<T extends { symbol: string; ultimoPreco?: number | null }>(
  data: T[],
  flashDuration = 1000
) {
  const [flashState, setFlashState] = useState<FlashState>({})
  const prevDataRef = useRef<Record<string, T>>({})
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({})
  const [isClient, setIsClient] = useState(false)

  // Ensure this only runs on client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !data || data.length === 0) return

    const currentData: Record<string, T> = {}
    data.forEach(item => {
      currentData[item.symbol] = item
    })

    // Comparar com dados anteriores
    Object.keys(currentData).forEach(symbol => {
      const current = currentData[symbol]
      const previous = prevDataRef.current[symbol]

      if (previous && current) {
        const currentPrice = current.ultimoPreco
        const previousPrice = previous.ultimoPreco

        // Verificar se o preço mudou
        if (currentPrice !== null && previousPrice !== null && currentPrice !== previousPrice && typeof currentPrice === 'number' && typeof previousPrice === 'number') {
          const flashType: FlashType = currentPrice > previousPrice ? "positive" : 
                                      currentPrice < previousPrice ? "negative" : "neutral"

          // Limpar timeout anterior se existir
          if (timeoutRefs.current[symbol]) {
            clearTimeout(timeoutRefs.current[symbol])
          }

          // Definir flash
          setFlashState(prev => ({
            ...prev,
            [symbol]: {
              isFlashing: true,
              flashType,
              timestamp: Date.now()
            }
          }))

          // Remover flash após duração
          timeoutRefs.current[symbol] = setTimeout(() => {
            setFlashState(prev => ({
              ...prev,
              [symbol]: {
                ...prev[symbol],
                isFlashing: false
              }
            }))
          }, flashDuration)
        }
      }
    })

    // Atualizar referência dos dados anteriores
    prevDataRef.current = { ...currentData }

    // Cleanup timeouts quando componente desmonta
    return () => {
      Object.values(timeoutRefs.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout)
      })
    }
  }, [data, flashDuration, isClient])

  const getFlashClass = (symbol: string): string => {
    if (!isClient) return ""
    
    const flash = flashState[symbol]
    if (!flash || !flash.isFlashing) return ""

    switch (flash.flashType) {
      case "positive":
        return "bg-green-500/10 transition-all duration-500"
      case "negative":
        return "bg-red-500/10 transition-all duration-500"
      default:
        return "bg-blue-500/10 transition-all duration-500"
    }
  }

  const isFlashing = (symbol: string): boolean => {
    return flashState[symbol]?.isFlashing || false
  }

  const getFlashType = (symbol: string): FlashType => {
    return flashState[symbol]?.flashType || "neutral"
  }

  return {
    getFlashClass,
    isFlashing,
    getFlashType,
    flashState
  }
}