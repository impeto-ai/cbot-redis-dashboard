"use client"

import useSWR from "swr"
import { useState, useCallback, useEffect, useRef } from "react"
import type { MarketResponse } from "@/types/market-data"

// Intervalo otimizado para atualizações suaves
const FETCH_INTERVAL = 60000 // 60 segundos

// Reduzir o intervalo de atualização para 15 segundos
// const FETCH_INTERVAL = 15000 // 15 segundos

// Modificar o fetcher para implementar retry com backoff exponencial
const fetcher = async (url: string) => {
  const maxRetries = 3
  let retryCount = 0
  let lastError: Error | null = null

  while (retryCount < maxRetries) {
    try {
      // Adicionar um timestamp único para evitar cache
      const urlWithTimestamp = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`

      const res = await fetch(urlWithTimestamp, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        signal: AbortSignal.timeout(15000), // 15 second timeout para permitir requests mais lentos
      })

      if (!res.ok) {
        let errorData
        try {
          const text = await res.text()
          errorData = text ? JSON.parse(text) : { error: `HTTP ${res.status}: ${res.statusText}` }
        } catch (e) {
          errorData = { error: `HTTP ${res.status}: ${res.statusText}` }
        }

        const errorMessage = errorData?.error || errorData?.details || `HTTP ${res.status}: ${res.statusText}`
        const error = new Error(errorMessage)
        ;(error as any).status = res.status
        ;(error as any).info = errorData
        ;(error as any).url = url

        throw error
      }

      const data = await res.json()
      return data
    } catch (error) {
      lastError = error as Error
      retryCount++

      // Só logar erro na última tentativa
      if (retryCount >= maxRetries) {
        console.error("Erro ao buscar dados:", {
          message: lastError?.message,
          status: (lastError as any)?.status,
        })
      }

      // Se não for o último retry, aguardar antes de tentar novamente
      if (retryCount < maxRetries) {
        const delay = 1000 * Math.pow(2, retryCount) // Backoff exponencial: 2s, 4s, 8s...
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

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

      // Não forçar atualização imediata - deixar SWR gerenciar
      // if (isVisible) {
      //   setForceUpdate((prev) => prev + 1)
      // }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  // Manter força de atualização a cada 5 minutos (menos agressivo)
  useEffect(() => {
    const interval = setInterval(() => {
      setForceUpdate((prev) => prev + 1)
    }, 300000) // Forçar atualização a cada 5 minutos (reduzido de 2min)

    return () => clearInterval(interval)
  }, [])

  const { data, error, isLoading, mutate } = useSWR<{ data: MarketResponse }>(
    // Sempre buscar dados, independente do estado do mercado
    isPageVisible ? `/api/redis?t=${forceUpdate}` : null,
    fetcher,
    {
      refreshInterval: FETCH_INTERVAL, // Usar intervalo fixo para evitar problemas
      dedupingInterval: 5000, // 5 segundos
      revalidateOnFocus: false, // Desabilitar para evitar loading chato ao trocar de aba
      revalidateOnReconnect: true,
      revalidateIfStale: false, // Reduzir agressividade das atualizações
      onSuccess: (newData) => {
        if (newData && newData.data) {
          setLastSuccessfulData(newData.data)
          setInitialDataFetched(true)
          setConsecutiveErrors(0)
        }
      },
      onError: (err) => {
        console.error("Erro ao buscar dados:", err.message)
        setConsecutiveErrors((prev) => prev + 1)
      },
    },
  )

  // Dados já são atualizados diretamente no onSuccess - sem debounce necessário

  const refresh = useCallback(() => {
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

