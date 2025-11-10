"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { ParsedMarketData, ParsedCurvaData, MarketResponse } from "@/types/market-data"

interface ParsedData {
  soybeanData: ParsedMarketData[]
  cornData: ParsedMarketData[]
  wheatData: ParsedMarketData[]
  mealData: ParsedMarketData[]
  oilData: ParsedMarketData[]
  b3Data: ParsedMarketData[]
  curvaData: ParsedCurvaData[]
}

export function useMarketDataParser(marketData: MarketResponse | null) {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const workerRef = useRef<Worker | null>(null)
  const dataHashRef = useRef<string>("")

  // Criar hash simples e rápido dos dados
  const createHash = useCallback((data: MarketResponse | null): string => {
    if (!data) return ""

    // Em vez de JSON.stringify, criar hash baseado em chaves e timestamps
    const keys = Object.keys(data).sort().join("|")
    const timestamps = Object.values(data)
      .map((item: any) => item?.lastUpdate || "")
      .join("|")

    return `${keys}-${timestamps}`
  }, [])

  // Inicializar worker
  useEffect(() => {
    // Criar worker apenas no cliente
    if (typeof window !== "undefined" && !workerRef.current) {
      try {
        workerRef.current = new Worker(
          new URL("../workers/marketDataParser.worker.ts", import.meta.url),
          { type: "module" }
        )

        workerRef.current.onmessage = (e) => {
          if (e.data.type === "parsed") {
            setParsedData(e.data.result)
            setIsParsing(false)
          } else if (e.data.type === "error") {
            console.error("Worker error:", e.data.error)
            setIsParsing(false)
          }
        }

        workerRef.current.onerror = (error) => {
          console.error("Worker error:", error)
          setIsParsing(false)
        }
      } catch (error) {
        console.error("Failed to create worker:", error)
      }
    }

    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  // Processar dados quando mudam
  useEffect(() => {
    if (!marketData || !workerRef.current) return

    const currentHash = createHash(marketData)

    // Só processar se os dados realmente mudaram
    if (currentHash !== dataHashRef.current) {
      dataHashRef.current = currentHash
      setIsParsing(true)

      workerRef.current.postMessage({
        type: "parse",
        data: marketData,
      })
    }
  }, [marketData, createHash])

  return {
    parsedData,
    isParsing,
  }
}
