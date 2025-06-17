"use client"

// Adicionar estas configurações para garantir que a página seja dinâmica
export const dynamic = "force-dynamic"
export const revalidate = 0

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useMarketData } from "@/hooks/useMarketData"
import { parseMarketData } from "@/utils/parseMarketData"
import { LoadingScreen } from "@/components/LoadingScreen"

export default function CommoditiesAnalysis() {
  const { data: marketData, error, isLoading, initialDataFetched } = useMarketData()
  const [mealData, setMealData] = useState([])
  const [oilData, setOilData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (marketData) {
      try {
        // Process Soybean Meal data (ZM)
        const mealEntries = []
        for (const key in marketData) {
          if (key.includes("ZM")) {
            try {
              const parsed = parseMarketData(marketData[key])
              mealEntries.push(parsed)
            } catch (error) {
              console.error(`Error parsing Meal data for key ${key}:`, error)
            }
          }
        }
        setMealData(mealEntries.filter(item => item.diasAteVencimento >= 0).sort((a, b) => a.diasAteVencimento - b.diasAteVencimento))

        // Process Soybean Oil data (ZL)
        const oilEntries = []
        for (const key in marketData) {
          if (key.includes("ZL")) {
            try {
              const parsed = parseMarketData(marketData[key])
              oilEntries.push(parsed)
            } catch (error) {
              console.error(`Error parsing Oil data for key ${key}:`, error)
            }
          }
        }
        setOilData(oilEntries.filter(item => item.diasAteVencimento >= 0).sort((a, b) => a.diasAteVencimento - b.diasAteVencimento))

        setLoading(false)
      } catch (error) {
        console.error("Error processing commodities data:", error)
        setLoading(false)
      }
    }
  }, [marketData])

  // Mostrar loading apenas na primeira carga, não nas atualizações subsequentes
  if (!initialDataFetched && !marketData) {
    return <LoadingScreen />
  }

  const formatNumber = (value: number | null | undefined, decimals = 2): string => {
    if (value === null || value === undefined) return "-"
    return value.toFixed(decimals)
  }

  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "-"
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
  }

  const formatLastUpdate = (lastUpdate: string | undefined): string => {
    if (!lastUpdate) return "-"
    try {
      const date = new Date(lastUpdate)
      return date.toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    } catch (error) {
      console.error("Erro ao formatar lastUpdate:", error)
      return "-"
    }
  }

  const renderTable = (tableData, title) => (
    <div className="mb-4">
      <div className="bg-gradient-to-r from-[#004d40] to-[#00695c] px-2 py-1">
        <h2 className="text-[#00ff00] font-bold text-xs">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#1a1f2e]">
              <th className="text-left px-2 py-1 text-gray-300 font-normal whitespace-nowrap">ATIVO</th>
              <th className="text-right px-2 py-1 text-gray-300 font-normal whitespace-nowrap">ULT</th>
              <th className="text-right px-2 py-1 text-gray-300 font-normal whitespace-nowrap">PCT</th>
              <th className="text-right px-2 py-1 text-gray-300 font-normal whitespace-nowrap">DIF</th>
              <th className="text-right px-2 py-1 text-gray-300 font-normal whitespace-nowrap">MAX</th>
              <th className="text-right px-2 py-1 text-gray-300 font-normal whitespace-nowrap">MIN</th>
              <th className="text-right px-2 py-1 text-gray-300 font-normal whitespace-nowrap">ABE</th>
              <th className="text-right px-2 py-1 text-gray-300 font-normal whitespace-nowrap">FEC</th>
              <th className="text-right px-2 py-1 text-gray-300 font-normal whitespace-nowrap">AJU</th>
              <th className="text-center px-2 py-1 text-gray-300 font-normal whitespace-nowrap">DESCR</th>
              <th className="text-right px-2 py-1 text-gray-300 font-normal whitespace-nowrap">PRAZO</th>
              <th className="text-center px-2 py-1 text-gray-300 font-normal whitespace-nowrap">ATUALIZADO</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {tableData.length > 0 ? (
              tableData.map((item) => {
                const isPctPositive = (item.variacao || 0) >= 0
                const isDiffPositive = (item.diff || 0) >= 0
                const pctColor = isPctPositive ? "text-[#00ff00]" : "text-[#ff4444]"
                const diffColor = isDiffPositive ? "text-[#00ff00]" : "text-[#ff4444]"

                return (
                  <tr key={item.symbol} className="border-b border-gray-800 hover:bg-[#1a1f2e]">
                    <td className="px-2 py-1 text-left text-[#40c4ff] whitespace-nowrap">{item.symbol}</td>
                    <td className="px-2 py-1 text-right text-yellow-400 whitespace-nowrap font-bold">
                      {formatNumber(item.ultimoPreco)}
                    </td>
                    <td
                      className={`px-2 py-1 text-right ${pctColor} animate-[blink_2s_ease-in-out_infinite] whitespace-nowrap`}
                    >
                      {formatPercentage(item.variacao)}
                    </td>
                    <td
                      className={`px-2 py-1 text-right ${diffColor} animate-[blink_2s_ease-in-out_infinite] whitespace-nowrap`}
                    >
                      {formatNumber(item.diff)}
                    </td>
                    <td className="px-2 py-1 text-right text-white whitespace-nowrap">{formatNumber(item.maximo)}</td>
                    <td className="px-2 py-1 text-right text-white whitespace-nowrap">{formatNumber(item.minimo)}</td>
                    <td className="px-2 py-1 text-right text-white whitespace-nowrap">{formatNumber(item.abertura)}</td>
                    <td className="px-2 py-1 text-right text-[#40c4ff] whitespace-nowrap">
                      {formatNumber(item.fechamento)}
                    </td>
                    <td className="px-2 py-1 text-right text-[#40c4ff] whitespace-nowrap">
                      {formatNumber(item.ajuste)}
                    </td>
                    <td className="px-2 py-1 text-center text-white whitespace-nowrap">{item.vencimento}</td>
                    <td className="px-2 py-1 text-right whitespace-nowrap text-gray-300">{item.diasAteVencimento}</td>
                    <td className="px-2 py-1 text-center text-gray-300 whitespace-nowrap">
                      {formatLastUpdate(item.lastUpdate)}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={12} className="px-2 py-4 text-center text-gray-400">
                  Nenhum dado disponível
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mb-4">
        <Link href="/" className="flex items-center text-blue-500 hover:text-blue-700">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-white">Análise de Farelo e Óleo de Soja</h1>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {error && <div className="bg-red-900 text-white p-3 rounded-md mb-4">{error.message}</div>}

      <Card className="bg-[#1A1A1A] border-gray-800 mb-6">
        <CardHeader>
          <CardTitle className="text-white">Farelo de Soja (ZM)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Carregando dados...</div>
          ) : (
            renderTable(mealData, "FARELO DE SOJA CBOT")
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Óleo de Soja (ZL)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Carregando dados...</div>
          ) : (
            renderTable(oilData, "ÓLEO DE SOJA CBOT")
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Dados Brutos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-white font-bold mb-2">Farelo de Soja (ZM) - Chaves Redis</h3>
                <pre className="bg-[#0D0D0D] p-4 rounded-md overflow-x-auto text-gray-300 max-h-[300px] overflow-y-auto">
                  {Object.keys(marketData || {})
                    .filter((key) => key.includes("ZM"))
                    .join("\n")}
                </pre>
              </div>
              <div>
                <h3 className="text-white font-bold mb-2">Óleo de Soja (ZL) - Chaves Redis</h3>
                <pre className="bg-[#0D0D0D] p-4 rounded-md overflow-x-auto text-gray-300 max-h-[300px] overflow-y-auto">
                  {Object.keys(marketData || {})
                    .filter((key) => key.includes("ZL"))
                    .join("\n")}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

