"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts"
import {
  fetchPTAXData,
  prepararDadosGrafico,
  calcularPTAXMedia,
  calcularMediaCompra,
  calcularMediaVenda,
  calcularMaxMin,
  calcularVariacaoPTAX,
} from "@/utils/ptaxUtils"

const isPTAXHours = () => {
  const now = new Date()
  const day = now.getDay()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const currentTime = hours * 60 + minutes

  return day >= 1 && day <= 5 && currentTime >= 13 * 60
}

export function PTAXChart() {
  const [chartData, setChartData] = useState<any[]>([])
  const [ptaxMedia, setPtaxMedia] = useState<number | null>(null)
  const [mediaCompra, setMediaCompra] = useState<number | null>(null)
  const [mediaVenda, setMediaVenda] = useState<number | null>(null)
  const [maxPtax, setMaxPtax] = useState<number | null>(null)
  const [minPtax, setMinPtax] = useState<number | null>(null)
  const [variacao, setVariacao] = useState<number | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [ptaxReceived, setPtaxReceived] = useState<boolean>(false)

  const fetchData = useCallback(async () => {
    if (ptaxReceived) return

    try {
      const data = await fetchPTAXData()
      if (!data || data.length === 0) {
        throw new Error("Nenhum dado PTAX encontrado")
      }

      const processedData = prepararDadosGrafico(data)
      setChartData(processedData)
      setPtaxMedia(calcularPTAXMedia(data))
      setMediaCompra(calcularMediaCompra(data))
      setMediaVenda(calcularMediaVenda(data))
      setVariacao(calcularVariacaoPTAX(data))
      const { max, min } = calcularMaxMin(processedData)
      setMaxPtax(max)
      setMinPtax(min)

      const lastPtaxDate = new Date(data[data.length - 1].dataHoraCotacao)
      setLastUpdate(lastPtaxDate.toLocaleDateString("pt-BR"))

      if (isPTAXHours() && lastPtaxDate.toDateString() === new Date().toDateString()) {
        setPtaxReceived(true)
      }

      setError(null)
    } catch (err) {
      console.error("Erro ao buscar dados PTAX:", err)
      setError("Falha ao carregar dados PTAX. Por favor, tente novamente mais tarde.")
    }
  }, [ptaxReceived])

  useEffect(() => {
    fetchData() // Fetch data immediately
    const interval = setInterval(() => {
      if (isPTAXHours()) {
        fetchData()
      }
    }, 600000) // Check every 10 minutes
    return () => clearInterval(interval)
  }, [fetchData])

  if (error) {
    return (
      <Card className="w-full bg-[#1A1A1A] border-0">
        <div className="bg-gradient-to-r from-[#004d40] to-[#00695c] px-2 py-1">
          <h2 className="text-[#00ff00] text-xs font-bold">PTAX - Evolução últimos 30 dias</h2>
        </div>
        <CardContent>
          <div className="text-red-500 text-center p-4">{error}</div>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Tentar novamente
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full bg-[#1A1A1A] border-0">
      <div className="bg-gradient-to-r from-[#004d40] to-[#00695c] px-2 py-1">
        <div className="flex justify-between items-center">
          <h2 className="text-[#00ff00] text-xs sm:text-sm md:text-base font-bold">PTAX - Evolução últimos 30 dias</h2>
          <span className="text-[#00ff00] text-xs sm:text-sm md:text-base">BACEN - Banco Central do Brasil</span>
        </div>
      </div>
      <CardContent className="p-2 sm:p-4">
        <div className="space-y-4">
          <div className="h-[200px] sm:h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                <XAxis
                  dataKey="date"
                  stroke="#666666"
                  tick={{ fill: "#666666", fontSize: 10 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                  }}
                />
                <YAxis
                  stroke="#666666"
                  tick={{ fill: "#666666", fontSize: 10 }}
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => value.toFixed(2)}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #333" }}
                  labelStyle={{ color: "#00ff00" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value: number) => [value.toFixed(4), "PTAX"]}
                  labelFormatter={(label: string) => `Data: ${new Date(label).toLocaleDateString("pt-BR")}`}
                />
                {maxPtax && (
                  <ReferenceLine
                    y={maxPtax}
                    stroke="#ff9800"
                    strokeDasharray="3 3"
                    label={{
                      value: `Máx: ${maxPtax.toFixed(4)}`,
                      position: "insideTopLeft",
                      fill: "#ff9800",
                      fontSize: 10,
                    }}
                  />
                )}
                {minPtax && (
                  <ReferenceLine
                    y={minPtax}
                    stroke="#ffeb3b"
                    strokeDasharray="3 3"
                    label={{
                      value: `Mín: ${minPtax.toFixed(4)}`,
                      position: "insideBottomLeft",
                      fill: "#ffeb3b",
                      fontSize: 10,
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="average"
                  stroke="#00ff00"
                  dot={{ fill: "#00ff00", r: 2 }}
                  strokeWidth={1}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center space-y-2 text-xs sm:text-sm md:text-base">
            <div className="text-[#00ff00]">
              PTAX Média: {ptaxMedia?.toFixed(4) ?? "-"}
              <span
                className={`ml-2 ${variacao && variacao >= 0 ? "text-[#00ff00]" : "text-[#ff4444]"} animate-[blink_2s_ease-in-out_infinite]`}
              >
                {variacao !== null ? (variacao >= 0 ? "+" : "") + variacao.toFixed(4) : "-"}
              </span>
            </div>
            <div className="text-gray-400">
              Compra: {mediaCompra?.toFixed(4) ?? "-"} | Venda: {mediaVenda?.toFixed(4) ?? "-"}
            </div>
            <div className="text-gray-500">Última data PTAX: {lastUpdate}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

