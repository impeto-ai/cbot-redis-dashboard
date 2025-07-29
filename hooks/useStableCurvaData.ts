"use client"

import { useMemo, useRef } from "react"
import type { ParsedCurvaData } from "@/types/market-data"

// Hook para manter dados da curva estáveis e evitar re-renders desnecessários
export function useStableCurvaData(curvaData: ParsedCurvaData[]) {
  const stableDataRef = useRef<ParsedCurvaData[]>([])
  const lastUpdateTimeRef = useRef<number>(0)
  
  return useMemo(() => {
    // Se não há dados novos, retorna os dados estáveis existentes
    if (!curvaData || curvaData.length === 0) {
      return stableDataRef.current
    }

    const now = Date.now()
    
    // Só permite atualizações a cada 2 segundos para reduzir blinks
    if (now - lastUpdateTimeRef.current < 2000 && stableDataRef.current.length > 0) {
      return stableDataRef.current
    }

    // Cria map para comparação mais eficiente
    const currentDataMap = new Map(stableDataRef.current.map(item => [item.curva, item]))
    
    // Verifica se houve mudanças significativas
    let hasSignificantChange = stableDataRef.current.length !== curvaData.length
    
    if (!hasSignificantChange) {
      for (const newItem of curvaData) {
        const existingItem = currentDataMap.get(newItem.curva)
        
        if (!existingItem || 
            Math.abs((existingItem.taxa || 0) - (newItem.taxa || 0)) > 0.0005 || // Tolerância maior
            Math.abs((existingItem.var || 0) - (newItem.var || 0)) > 0.01) {
          hasSignificantChange = true
          break
        }
      }
    }

    // Só atualiza se houve mudança significativa
    if (hasSignificantChange) {
      stableDataRef.current = [...curvaData]
      lastUpdateTimeRef.current = now
    }

    return stableDataRef.current
  }, [curvaData])
}