"use client"

import useSWR from "swr"
import { useState, useCallback, useEffect, useRef } from "react"
import type { MarketResponse } from "@/types/market-data"

// Modificar a função useMarketData para reduzir a frequência de atualizações e implementar debounce

// Manter intervalo de 60s para dados atualizados, mas sem causar blinks visuais
const FETCH_INTERVAL = 60000 // 60 segundos - dados sempre atualizados

// Adicionar um debounce para as atualizações de estado
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Reduzir o intervalo de atualização para 15 segundos
// const FETCH_INTERVAL = 15000 // 15 segundos

// Modificar o fetcher para implementar retry com backoff exponencial
const fetcher = async (url: string) => {
  const maxRetries = 3
  let retryCount = 0
  let lastError: Error | null = null

  while (retryCount < maxRetries) {
    try {
      console.log(`🔄 Tentativa ${retryCount + 1}/${maxRetries} para ${url}`)

      // Adicionar um timestamp único para evitar cache
      const urlWithTimestamp = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`
      console.log(`🌐 URL completa:`, urlWithTimestamp)

      const res = await fetch(urlWithTimestamp, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        signal: AbortSignal.timeout(15000), // 15 second timeout para permitir requests mais lentos
      })

      console.log(`📡 Response status: ${res.status} ${res.statusText}`)

      if (!res.ok) {
        let errorData
        try {
          const text = await res.text()
          console.log(`📜 Response text:`, text)
          errorData = text ? JSON.parse(text) : { error: `HTTP ${res.status}: ${res.statusText}` }
        } catch (e) {
          console.log(`❌ Erro ao fazer parse da resposta:`, e)
          errorData = { error: `HTTP ${res.status}: ${res.statusText}` }
        }
        
        const errorMessage = errorData?.error || errorData?.details || `HTTP ${res.status}: ${res.statusText}`
        const error = new Error(errorMessage)
        ;(error as any).status = res.status
        ;(error as any).info = errorData
        ;(error as any).url = url
        
        console.log(`🚨 Erro criado:`, {
          message: error.message,
          status: (error as any).status,
          info: (error as any).info
        })
        
        throw error
      }

      const data = await res.json()
      console.log(`✅ Dados recebidos com sucesso:`, Object.keys(data?.data || {}).length, "chaves")
      return data
    } catch (error) {
      console.log(`🔍 Erro capturado (tipo: ${typeof error}):`, error)
      lastError = error as Error
      retryCount++
      
      console.error(`❌ Erro na tentativa ${retryCount}:`, {
        message: lastError?.message || 'Mensagem não disponível',
        name: lastError?.name || 'Nome não disponível',
        status: (lastError as any)?.status || 'Status não disponível',
        stack: lastError?.stack || 'Stack não disponível',
        retryCount,
        maxRetries,
        errorType: typeof lastError,
        errorObj: lastError
      })

      // Se não for o último retry, aguardar antes de tentar novamente
      if (retryCount < maxRetries) {
        const delay = 1000 * Math.pow(2, retryCount) // Backoff exponencial: 2s, 4s, 8s...
        console.log(`⏳ Retry ${retryCount}/${maxRetries} após ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  console.error("🚫 Falha após todas as tentativas:", lastError)
  throw lastError
}

const isDSTInEffect = () => {
  const today = new Date()
  const year = today.getFullYear()
  const dstStart = new Date(year, 2, 14) // March 14
  const dstEnd = new Date(year, 10, 7) // November 7

  // Ajuste para o segundo domingo de março e primeiro domingo de novembro
  dstStart.setDate(14 - dstStart.getDay())
  dstEnd.setDate(7 - dstEnd.getDay())

  return today >= dstStart && today < dstEnd
}

const getNextMarketChange = () => {
  const now = new Date()
  const day = now.getDay()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const currentTime = hours * 60 + minutes

  const isDST = isDSTInEffect()

  // Sessão Noturna
  const nightSessionStart = isDST ? 21 * 60 : 22 * 60
  const nightSessionEnd = isDST ? 9 * 60 + 45 : 10 * 60 + 45

  // Sessão Diurna
  const daySessionStart = isDST ? 10 * 60 + 30 : 11 * 60 + 30
  const daySessionEnd = isDST ? 15 * 60 + 20 : 16 * 60 + 20

  let nextChangeTime
  let isOpeningNext = false

  if (day >= 1 && day <= 5) {
    if (currentTime < nightSessionEnd) {
      nextChangeTime = nightSessionEnd
    } else if (currentTime < daySessionStart) {
      nextChangeTime = daySessionStart
      isOpeningNext = true
    } else if (currentTime < daySessionEnd) {
      nextChangeTime = daySessionEnd
    } else if (currentTime < nightSessionStart) {
      nextChangeTime = nightSessionStart
      isOpeningNext = true
    } else {
      nextChangeTime = nightSessionEnd + 24 * 60 // Next day's night session end
    }
  } else if (day === 0 && currentTime >= nightSessionStart) {
    nextChangeTime = nightSessionEnd + 24 * 60 // Monday's night session end
  } else {
    // Weekend
    const daysUntilMonday = (8 - day) % 7
    nextChangeTime = nightSessionStart + daysUntilMonday * 24 * 60
    isOpeningNext = true
  }

  const minutesUntilChange = nextChangeTime - currentTime
  const hoursUntilChange = Math.floor(minutesUntilChange / 60)
  const remainingMinutes = minutesUntilChange % 60

  return {
    hoursUntilChange,
    minutesUntilChange: remainingMinutes,
    isOpeningNext,
  }
}

const isMarketHours = (): { isOpen: boolean; session: "noturna" | "diurna" | "fechado" } => {
  const now = new Date()
  const day = now.getDay()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const currentTime = hours * 60 + minutes

  const isDST = isDSTInEffect()

  // Sessão Noturna
  const nightSessionStart = isDST ? 21 * 60 : 22 * 60
  const nightSessionEnd = isDST ? 9 * 60 + 45 : 10 * 60 + 45

  // Sessão Diurna
  const daySessionStart = isDST ? 10 * 60 + 30 : 11 * 60 + 30
  const daySessionEnd = isDST ? 15 * 60 + 20 : 16 * 60 + 20

  // Verifica se é dia útil (segunda a sexta)
  if (day >= 1 && day <= 5) {
    // Verifica se está dentro da sessão noturna
    if (currentTime >= nightSessionStart || currentTime < nightSessionEnd) {
      return { isOpen: true, session: "noturna" }
    }
    // Verifica se está dentro da sessão diurna
    if (currentTime >= daySessionStart && currentTime <= daySessionEnd) {
      return { isOpen: true, session: "diurna" }
    }
  }

  // Verifica se é domingo à noite (início da sessão noturna de segunda-feira)
  if (day === 0 && currentTime >= nightSessionStart) {
    return { isOpen: true, session: "noturna" }
  }

  return { isOpen: false, session: "fechado" }
}

export function useMarketData() {
  const [lastSuccessfulData, setLastSuccessfulData] = useState<MarketResponse | null>(null)
  const [pendingData, setPendingData] = useState<MarketResponse | null>(null)
  const debouncedPendingData = useDebounce(pendingData, 1500) // Aumentar debounce para reduzir blinks visuais
  const updateInProgressRef = useRef(false)
  const [marketStatus, setMarketStatus] = useState<{
    status: "open" | "closed" | "weekend"
    session: "noturna" | "diurna" | "fechado"
    nextChange: {
      hoursUntilChange: number
      minutesUntilChange: number
      isOpeningNext: boolean
    }
  }>({
    status: "closed",
    session: "fechado",
    nextChange: { hoursUntilChange: 0, minutesUntilChange: 0, isOpeningNext: false },
  })
  const [initialDataFetched, setInitialDataFetched] = useState(false)
  const [isPageVisible, setIsPageVisible] = useState(true)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  const [forceUpdate, setForceUpdate] = useState(0)

  const updateMarketStatus = useCallback(() => {
    const now = new Date()
    const day = now.getDay()
    const marketHours = isMarketHours()
    const nextChange = getNextMarketChange()

    if (marketHours.isOpen) {
      setMarketStatus({
        status: "open",
        session: marketHours.session,
        nextChange,
      })
    } else if (day === 0 || day === 6) {
      setMarketStatus({
        status: "weekend",
        session: "fechado",
        nextChange,
      })
    } else {
      setMarketStatus({
        status: "closed",
        session: "fechado",
        nextChange,
      })
    }
  }, [])

  useEffect(() => {
    updateMarketStatus()
    const interval = setInterval(updateMarketStatus, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [updateMarketStatus])

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden
      setIsPageVisible(isVisible)

      // Forçar atualização quando a página ficar visível
      if (isVisible) {
        setForceUpdate((prev) => prev + 1)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  // Manter força de atualização a cada 2 minutos para garantir dados frescos
  useEffect(() => {
    const interval = setInterval(() => {
      setForceUpdate((prev) => prev + 1)
    }, 120000) // Forçar atualização a cada 2 minutos

    return () => clearInterval(interval)
  }, [])

  const { data, error, isLoading, mutate } = useSWR<{ data: MarketResponse }>(
    // Sempre buscar dados, independente do estado do mercado
    isPageVisible ? `/api/redis?t=${forceUpdate}` : null,
    fetcher,
    {
      refreshInterval: FETCH_INTERVAL, // Usar intervalo fixo para evitar problemas
      dedupingInterval: 5000, // 5 segundos
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      // Modificar a função onSuccess para fazer uma transição suave dos dados
      onSuccess: (newData) => {
        if (newData && newData.data) {
          // Em vez de atualizar diretamente, definir como dados pendentes
          setPendingData(newData.data)
          setConsecutiveErrors(0) // Resetar contador de erros
        }
      },
      onError: (err) => {
        console.error("Erro detalhado ao buscar dados:", {
          message: err.message,
          status: err.status,
          info: err.info,
          timestamp: new Date().toISOString()
        })
        setConsecutiveErrors((prev) => prev + 1) // Incrementar contador de erros
      },
    },
  )

  // Processar dados pendentes com proteção contra scroll jumps
  useEffect(() => {
    if (debouncedPendingData && !updateInProgressRef.current) {
      updateInProgressRef.current = true
      
      // Use requestIdleCallback if available, otherwise fallback to setTimeout
      const scheduleUpdate = (callback: () => void) => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(callback, { timeout: 100 })
        } else {
          setTimeout(callback, 0)
        }
      }

      scheduleUpdate(() => {
        // Only update if data has actually changed
        const hasDataChanged = JSON.stringify(lastSuccessfulData) !== JSON.stringify(debouncedPendingData)
        
        if (hasDataChanged) {
          setLastSuccessfulData(debouncedPendingData)
          setInitialDataFetched(true)
        }
        
        updateInProgressRef.current = false
      })
    }
  }, [debouncedPendingData, lastSuccessfulData])

  const refresh = useCallback(() => {
    console.log("Forçando atualização dos dados...")
    setForceUpdate((prev) => prev + 1)
    return mutate()
  }, [mutate])

  return {
    data: data?.data || lastSuccessfulData,
    error,
    isLoading,
    refresh,
    marketStatus,
    initialDataFetched,
    isPageVisible,
  }
}

