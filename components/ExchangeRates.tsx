"use client"

import React from "react"

interface ExchangeRate {
  symbol: string
  value: string
  variation: string
  lastUpdate: string
}

interface ExchangeRatesProps {
  data: {
    [key: string]: any
  }
}

export const ExchangeRates = React.memo(function ExchangeRates({ data }: ExchangeRatesProps) {
  // Função para encontrar a chave que contém um determinado texto
  const findKeyByText = (text: string): string | undefined => {
    const normalizedText = text.toLowerCase()
    return Object.keys(data).find((key) => {
      const normalizedKey = key.toLowerCase()
      return normalizedKey.includes("cambio") && normalizedKey.includes(normalizedText)
    })
  }

  // Buscar as chaves específicas
  const dollarKey = findKeyByText("dol com")
  const euroKey = findKeyByText("eurocom")

  const parseExchangeData = (rawData: any): ExchangeRate | null => {
    if (!rawData) return null

    // If the data is a string, try to parse it
    if (typeof rawData === "string") {
      try {
        rawData = JSON.parse(rawData)
      } catch (e) {
        return null
      }
    }

    // Handle the nested structure - but only if arrValues is NOT present at the top level
    // Some data comes nested under a key with the symbol name, others come directly
    if (typeof rawData === "object" && !Array.isArray(rawData) && !rawData.arrValues) {
      // Get the first key in the object (should be the symbol name)
      const innerKey = Object.keys(rawData)[0]
      if (innerKey && rawData[innerKey]?.arrValues) {
        rawData = rawData[innerKey]
      }
    }

    // Ensure we have the required data structure
    if (!rawData.arrValues || !Array.isArray(rawData.arrValues)) {
      return null
    }

    const getValue = (code: string): string => {
      const valueObj = rawData.arrValues.find((item: any) => {
        if (!item || typeof item !== "object") return false
        return Object.keys(item)[0] === code
      })

      return valueObj ? (Object.values(valueObj)[0] as string) : ""
    }

    // Get the value and remove the 'S' suffix if present
    const value = getValue("10").replace("S", "")
    const variation = getValue("01")

    return {
      symbol: rawData.symbolId?.symbol || "",
      value,
      variation,
      lastUpdate: rawData.datetime || rawData.lastUpdate || "",
    }
  }

  const dollarData = dollarKey ? parseExchangeData(data[dollarKey]) : null
  const euroData = euroKey ? parseExchangeData(data[euroKey]) : null

  const formatValue = (value: string) => {
    if (!value) return "0.0000"
    const num = Number(value)
    return isNaN(num) ? "0.0000" : num.toFixed(4)
  }

  const formatVariation = (variation: string) => {
    if (!variation) return "+0.00"
    const num = Number(variation)
    return isNaN(num) ? "+0.00" : `${num >= 0 ? "+" : ""}${num.toFixed(2)}`
  }

  const formatLastUpdate = (lastUpdate: string) => {
    if (!lastUpdate) return ""
    try {
      const date = new Date(lastUpdate)
      return date.toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    } catch (error) {
      return ""
    }
  }

  const renderExchangeTable = (title: string, data: ExchangeRate | null) => {
    if (!data) return null

    return (
      <div className="mb-0.5 no-flash">
        <div className={`px-2 py-1 bg-gradient-to-r from-[#9a9a00] via-[#b8b800] to-[#9a9a00] shadow-lg`}>
          <h2 className="text-black font-bold text-xs sm:text-sm md:text-base text-center tracking-wide">{title}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm md:text-base table-glow">
            <thead>
              <tr className="bg-gradient-to-r from-[#1a1f2e] via-[#242938] to-[#1a1f2e] border-b border-[#40c4ff]/30">
                <th className="text-left px-2 py-1 text-[#ffff00] font-semibold whitespace-nowrap tracking-wide">Moeda</th>
                <th className="text-right px-2 py-1 text-[#ffd700] font-semibold whitespace-nowrap tracking-wide">Taxa</th>
                <th className="text-right px-2 py-1 text-[#00ff00] font-semibold whitespace-nowrap tracking-wide">Var</th>
                <th className="text-center px-2 py-1 text-[#20b2aa] font-semibold whitespace-nowrap hidden sm:table-cell tracking-wide">
                  Hora
                </th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-b border-gray-800 hover:bg-[#1a1f2e] no-flash stable-layout">
                <td className="px-2 py-1 text-[#ffff00] whitespace-nowrap data-cell symbol-glow">{data.symbol}</td>
                <td className="px-2 py-1 text-right text-white whitespace-nowrap data-cell price-glow">
                  {formatValue(data.value)}
                </td>
                <td
                  className={`px-2 py-1 text-right ${
                    Number(data.variation) >= 0 ? "text-[#00ff00] glow-positive-subtle" : "text-[#ff4444] glow-negative-subtle"
                  } data-cell whitespace-nowrap value-highlight`}
                >
                  {formatVariation(data.variation)}
                </td>
                <td className="px-2 py-1 text-center text-white whitespace-nowrap hidden sm:table-cell data-cell">
                  {formatLastUpdate(data.lastUpdate)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0.5 mb-4">
      {dollarData && renderExchangeTable("DÓLAR COMERCIAL", dollarData)}
      {euroData && renderExchangeTable("EURO COMERCIAL", euroData)}
    </div>
  )
})

