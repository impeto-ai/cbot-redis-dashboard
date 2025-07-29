import type { ParsedCurvaData } from "@/types/market-data"
import React from "react"
import { useDataFlash } from "@/hooks/useDataFlash"

// Adicionar uma função para formatar o lastUpdate no início do arquivo, após as importações
const formatLastUpdate = (lastUpdate: string | undefined): string => {
  if (!lastUpdate) return "-"

  try {
    // Converter de UTC para GMT-3 (Brasil)
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

// Modificar a interface ParsedCurvaData para incluir lastUpdate
// Adicionar após a importação do tipo ParsedCurvaData
interface ParsedCurvaDataWithUpdate extends ParsedCurvaData {
  lastUpdate?: string
}

// Modificar a interface MarketDataTableProps
interface MarketDataTableProps {
  data: ParsedCurvaDataWithUpdate[]
  title?: string
}

// Adicionar esta função no início do arquivo
interface MemoizedTableRowProps {
  item: ParsedCurvaDataWithUpdate
  formatNumber: (value: number | null | undefined, decimals?: number) => string
  formatHora: (datetime: string) => string
}

const MemoizedTableRow = React.memo(({ item, formatNumber, formatHora }: MemoizedTableRowProps) => {
  // Função para limpar o texto da curva removendo "CURVA DE DOLAR"
  const cleanCurvaText = (curva: string): string => {
    return curva.replace(/CURVA\s*DE\s*DOLAR\s*/i, '').trim()
  }

  return (
    <tr key={item.curva} className="border-b border-gray-800 hover:bg-[#1a1f2e] no-flash">
      <td className="px-2 py-1 text-[#ffff00] whitespace-nowrap data-cell">{cleanCurvaText(item.curva)}</td>
      <td className="px-2 py-1 text-right text-white whitespace-nowrap data-cell">{formatNumber(item.taxa)}</td>
      <td
        className={`px-2 py-1 text-right ${item.var && item.var >= 0 ? "text-[#00ff00]" : "text-[#ff4444]"} data-cell whitespace-nowrap`}
      >
        {formatNumber(item.var)}
      </td>
      <td className="px-2 py-1 text-center text-[#40c4ff] whitespace-nowrap data-cell">
        {item.dataVencimento || "-"}
      </td>
      <td className="px-2 py-1 text-center text-white whitespace-nowrap hidden md:table-cell data-cell">
        {formatHora(item.datetime)}
      </td>
    </tr>
  )
})

MemoizedTableRow.displayName = "MemoizedTableRow"

// Modificar o componente MarketDataTable para usar React.memo
export const MarketDataTable = React.memo(function MarketDataTable({
  data,
  title = "Curva do Dólar",
}: MarketDataTableProps) {
  const formatNumber = (value: number | null | undefined, decimals = 4): string => {
    if (value === null || value === undefined) return "-"
    return value.toFixed(decimals)
  }

  const extractDays = (curva: string): number => {
    const match = curva.match(/(\d+)D/i)
    return match ? Number.parseInt(match[1]) : 0
  }

  const sortedData = [...data].sort((a, b) => {
    return extractDays(a.curva) - extractDays(b.curva)
  })

  const formatHora = (datetime: string): string => {
    if (!datetime) return "-"

    // Verificar se a string já contém a hora
    const parts = datetime.split(" ")
    if (parts.length > 1) {
      return parts[1] // Retornar a parte da hora
    }

    return "-" // Se não houver hora, retornar traço
  }

  return (
    <div className="mb-0.5 no-flash">
      <div className="bg-gradient-to-r from-[#9a9a00] to-[#9a9a00] px-2 py-1">
        <h2 className="text-black font-bold text-xs sm:text-sm md:text-base">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs sm:text-sm md:text-base min-w-[400px]">
          <thead>
            <tr className="bg-[#1a1f2e]">
              <th className="text-left px-2 py-1 text-gray-300 font-normal whitespace-nowrap">Curva</th>
              <th className="text-right px-2 py-1 text-gray-300 font-normal whitespace-nowrap">Taxa</th>
              <th className="text-right px-2 py-1 text-gray-300 font-normal whitespace-nowrap">Var</th>
              <th className="text-center px-2 py-1 text-gray-300 font-normal whitespace-nowrap">
                Vencimento
              </th>
              <th className="text-center px-2 py-1 text-gray-300 font-normal whitespace-nowrap hidden md:table-cell">
                Hora
              </th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {sortedData.map((item) => (
              <MemoizedTableRow key={item.curva} item={item} formatNumber={formatNumber} formatHora={formatHora} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
})

