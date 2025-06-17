"use client"

import { useEffect, useState } from "react"
import { useMarketData } from "@/hooks/useMarketData"

interface MarketHighlight {
  text: string
  color: string
  isBlinking?: boolean
}

export function Marquee() {
  const { data: marketData } = useMarketData()
  const [topRow, setTopRow] = useState<MarketHighlight[]>([])
  const [bottomRow, setBottomRow] = useState<MarketHighlight[]>([])

  useEffect(() => {
    if (!marketData) return

    try {
      const newTopRow: MarketHighlight[] = []
      const newBottomRow: MarketHighlight[] = []

      // Função auxiliar para extrair valores
      const safeGetValue = (item: any, code: string): string | null => {
        if (!item?.arrValues || !Array.isArray(item.arrValues)) return null
        const valueObj = item.arrValues.find(
          (val: any) => val && typeof val === "object" && Object.keys(val)[0] === code,
        )
        return valueObj ? Object.values(valueObj)[0] as string : null
      }

      // Função para extrair dados do objeto aninhado
      const extractData = (data: any, keyPattern: string) => {
        if (!data) return null

        // Se os dados estão diretamente no objeto
        if (data.symbolId?.symbol?.includes(keyPattern)) {
          return data
        }

        // Se os dados estão aninhados sob uma chave
        const innerKey = Object.keys(data)[0]
        if (innerKey && data[innerKey]?.symbolId?.symbol?.includes(keyPattern)) {
          return data[innerKey]
        }

        return null
      }

      // Processar dados da curva de dólar
      const curvaEntries: Array<{key: string, data: any}> = []
      Object.entries(marketData).forEach(([key, value]) => {
        if (key.includes("CURVA DE DOLAR")) {
          const curvaData = value
          if (curvaData) {
            curvaEntries.push({ key, data: curvaData })
          }
        }
      })

      // Ordenar as entradas da curva de dólar
      curvaEntries.sort((a, b) => {
        const getNumber = (str: string): number => {
          const match = str.match(/(\d+)D/)
          return match ? Number.parseInt(match[1], 10) : 0
        }
        return getNumber(a.key) - getNumber(b.key)
      })

      // Adicionar dados da curva de dólar ao letreiro
      curvaEntries.forEach(({ key, data }) => {
        const curvaSymbol = key.includes("CURVA DE DOLAR") ? key.split("CURVA DE DOLAR")[1].trim() : key

        // Extrair taxa e variação
        let taxa = null
        let variacao = null

        if (typeof data === "object") {
          const innerKey = Object.keys(data)[0]
          if (innerKey && data[innerKey]) {
            const innerData = data[innerKey]
            taxa = safeGetValue(innerData, "10") || safeGetValue(innerData, "1A")
            variacao = safeGetValue(innerData, "01") || safeGetValue(innerData, "29") || safeGetValue(innerData, "27")
          }
        }

        if (taxa) {
          newTopRow.push({
            text: `DÓLAR ${curvaSymbol}: ${Number(taxa).toFixed(4)}`,
            color: "text-[#ffff00]",
          })

          if (variacao) {
            const varNum = Number(variacao)
            newTopRow.push({
              text: `VAR: ${varNum >= 0 ? "+" : ""}${varNum.toFixed(4)}%`,
              color: varNum >= 0 ? "text-[#00ff00]" : "text-[#ff4444]",
              isBlinking: true,
            })
          }
        }
      })

      // Processar dados da soja
      Object.entries(marketData).forEach(([key, value]) => {
        if (key.includes("ZS")) {
          const soybeanData = extractData(value, "ZS")
          if (soybeanData) {
            const price = safeGetValue(soybeanData, "10")?.replace("S", "")
            const diff = safeGetValue(soybeanData, "26")
            const descr = safeGetValue(soybeanData, "09")

            if (price && descr) {
              const description = "SOJA - " + descr.split("/").slice(1).join("/")
              newBottomRow.push({
                text: `${description}: ${price}`,
                color: "text-[#ffff00]",
              })

              if (diff) {
                const diffNum = Number(diff)
                newBottomRow.push({
                  text: `${diffNum >= 0 ? "+" : ""}${diffNum.toFixed(2)}`,
                  color: diffNum >= 0 ? "text-[#00ff00]" : "text-[#ff4444]",
                  isBlinking: true,
                })
              }
            }
          }
        }
      })

      // Processar dados do milho
      Object.entries(marketData).forEach(([key, value]) => {
        if (key.includes("ZC")) {
          const cornData = extractData(value, "ZC")
          if (cornData) {
            const price = safeGetValue(cornData, "10")?.replace("S", "")
            const diff = safeGetValue(cornData, "26")
            const descr = safeGetValue(cornData, "09")

            if (price && descr) {
              const description = "MILHO - " + descr.split("/").slice(1).join("/")
              newBottomRow.push({
                text: `${description}: ${price}`,
                color: "text-[#ffff00]",
              })

              if (diff) {
                const diffNum = Number(diff)
                newBottomRow.push({
                  text: `${diffNum >= 0 ? "+" : ""}${diffNum.toFixed(2)}`,
                  color: diffNum >= 0 ? "text-[#00ff00]" : "text-[#ff4444]",
                  isBlinking: true,
                })
              }
            }
          }
        }
      })

      // Atualizar o estado apenas se temos dados válidos
      if (newTopRow.length > 0) setTopRow(newTopRow)
      if (newBottomRow.length > 0) setBottomRow(newBottomRow)
    } catch (error) {
      console.error("Error processing market data for Marquee:", error)
    }
  }, [marketData])

  // Se não temos dados ainda, não mostrar nada
  if (topRow.length === 0 && bottomRow.length === 0) {
    return null
  }

  return (
    <div className="bg-[#1A1A1A] border-y border-gray-800 font-mono">
      {/* Top Row */}
      <div className="overflow-hidden py-1 border-b border-gray-800">
        <div className="animate-marquee whitespace-nowrap">
          {[...topRow, ...topRow].map((item, index) => (
            <span
              key={index}
              className={`mx-6 text-sm font-bold ${item.color} ${
                item.isBlinking ? "animate-[blink_2s_ease-in-out_infinite]" : ""
              }`}
            >
              {item.text}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="overflow-hidden py-1">
        <div className="animate-marquee whitespace-nowrap" style={{ animationDirection: "reverse" }}>
          {[...bottomRow, ...bottomRow].map((item, index) => (
            <span
              key={index}
              className={`mx-6 text-sm font-bold ${item.color} ${
                item.isBlinking ? "animate-[blink_2s_ease-in-out_infinite]" : ""
              }`}
            >
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

