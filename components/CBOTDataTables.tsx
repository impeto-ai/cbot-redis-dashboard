import type { ParsedMarketData } from "@/types/market-data"
import React from "react"
import { useDataFlash } from "@/hooks/useDataFlash"
import { NoSSR } from "@/components/NoSSR"
import { StableTable, createDataHash } from "@/components/StableTable"

interface CBOTDataTablesProps {
  data: ParsedMarketData[]
  title?: string
}

// Componente memoizado com efeitos visuais aprimorados
const MemoizedTableRow = React.memo(({ item, formatNumber, formatPercentage, formatLastUpdate, getMaturityClass, getVariationClass, flashClass }) => {
  const isPctPositive = (item.variacao || 0) >= 0
  const isDiffPositive = (item.diff || 0) >= 0
  const pctColor = isPctPositive ? "text-[#00ff00] value-highlight" : "text-[#ff4444] value-highlight"
  const diffColor = isDiffPositive ? "text-[#00ff00] value-highlight" : "text-[#ff4444] value-highlight"
  const variationGlowClass = getVariationClass(item.variacao)

  return (
    <tr key={item.symbol} className={`border-b border-gray-800 table-row no-flash stable-layout ${flashClass}`}>
      <td className="px-2 py-1 text-left text-[#40c4ff] whitespace-nowrap data-cell symbol-glow">{item.symbol}</td>
      <td className="px-2 py-1 text-right text-yellow-400 whitespace-nowrap font-bold data-cell price-glow">
        {formatNumber(item.ultimoPreco)}
      </td>
      <td className={`px-2 py-1 text-right ${pctColor} ${variationGlowClass} data-cell whitespace-nowrap`}>
        {formatPercentage(item.variacao)}
      </td>
      <td className={`px-2 py-1 text-right ${diffColor} data-cell whitespace-nowrap`}>{formatNumber(item.diff)}</td>
      <td className="px-2 py-1 text-right text-white whitespace-nowrap hidden sm:table-cell data-cell">
        {formatNumber(item.maximo)}
      </td>
      <td className="px-2 py-1 text-right text-white whitespace-nowrap hidden sm:table-cell data-cell">
        {formatNumber(item.minimo)}
      </td>
      <td className="px-2 py-1 text-right text-white whitespace-nowrap hidden sm:table-cell data-cell">
        {formatNumber(item.abertura)}
      </td>
      <td className="px-2 py-1 text-right text-[#40c4ff] whitespace-nowrap hidden sm:table-cell data-cell">
        {formatNumber(item.fechamento)}
      </td>
      <td className="px-2 py-1 text-right text-[#40c4ff] whitespace-nowrap hidden sm:table-cell data-cell">
        {formatNumber(item.ajuste)}
      </td>
      <td className="px-2 py-1 text-center text-white whitespace-nowrap data-cell">{item.vencimento}</td>
      <td
        className={`px-2 py-1 text-right whitespace-nowrap text-gray-300 ${getMaturityClass(item.diasAteVencimento)} data-cell`}
      >
        {item.diasAteVencimento}
      </td>
      <td className="px-2 py-1 text-center text-gray-300 whitespace-nowrap data-cell">
        {formatLastUpdate(item.lastUpdate)}
      </td>
    </tr>
  )
})

MemoizedTableRow.displayName = "MemoizedTableRow"

// Modificar o componente CBOTDataTables para usar React.memo
export const CBOTDataTables = React.memo(function CBOTDataTables({ data, title }: CBOTDataTablesProps) {
  const { getFlashClass } = useDataFlash(data)
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

  const getMaturityClass = (days: number): string => {
    if (days <= 30) return "bg-gradient-to-r from-[#1a2327] to-[#1e2c30] maturity-urgent"
    if (days <= 60) return "bg-gradient-to-r from-[#1e2c30] to-[#223338] maturity-warning"
    if (days <= 90) return "bg-gradient-to-r from-[#223338] to-[#263a40] maturity-attention"
    if (days <= 120) return "bg-gradient-to-r from-[#263a40] to-[#2a4148] maturity-moderate"
    return "bg-gradient-to-r from-[#2a4148] to-[#2e4850]"
  }

  const getVariationClass = (variation: number | null | undefined): string => {
    if (variation === null || variation === undefined) return ""
    // Manter apenas o efeito de brilho sutil para PCT, sem background muito chamativo
    if (variation > 0) return "glow-positive-subtle"
    if (variation < 0) return "glow-negative-subtle"
    return ""
  }

  // Criar hash estável dos dados para evitar re-renderizações desnecessárias
  const dataHash = createDataHash(data)

  // Modificar a função renderTable para usar o componente memoizado
  const renderTable = (tableData: ParsedMarketData[], tableTitle: string) => (
    <StableTable dataHash={dataHash}>
      <div className="mb-0.5 overflow-x-auto no-flash stable-layout">
      <div
        className={`px-2 py-1 ${
          tableTitle === "MILHO BM&F"
            ? "bg-gradient-to-r from-[#9a9a00] via-[#b8b800] to-[#9a9a00] shadow-lg"
            : "bg-gradient-to-r from-[#004d40] via-[#00796b] to-[#00695c] shadow-lg"
        }`}
      >
        <h2
          className={`${tableTitle === "MILHO BM&F" ? "text-black" : "text-white"} font-bold text-xs sm:text-sm md:text-base text-center tracking-wide`}
          style={{
            textShadow: tableTitle === "MILHO BM&F" ? "0 0 10px rgba(0,0,0,0.5)" : "0 0 10px rgba(255,255,255,0.3)"
          }}
        >
          {tableTitle}
        </h2>
      </div>
      <table className="w-full border-collapse text-xs sm:text-sm md:text-base table-glow">
        <colgroup>
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[6%]" />
          <col className="w-[6%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[18%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
        </colgroup>
        <thead>
          <tr className="bg-gradient-to-r from-[#1a1f2e] via-[#242938] to-[#1a1f2e] border-b border-[#40c4ff]/30">
            <th className="text-left px-2 py-1 text-[#40c4ff] font-semibold whitespace-nowrap tracking-wide">ATIVO</th>
            <th className="text-right px-2 py-1 text-[#ffd700] font-semibold whitespace-nowrap tracking-wide">ULT</th>
            <th className="text-right px-2 py-1 text-[#00ff00] font-semibold whitespace-nowrap tracking-wide">PCT</th>
            <th className="text-right px-2 py-1 text-[#ff6b6b] font-semibold whitespace-nowrap tracking-wide">DIF</th>
            <th className="text-right px-2 py-1 text-white/80 font-semibold whitespace-nowrap hidden sm:table-cell tracking-wide">
              MAX
            </th>
            <th className="text-right px-2 py-1 text-white/80 font-semibold whitespace-nowrap hidden sm:table-cell tracking-wide">
              MIN
            </th>
            <th className="text-right px-2 py-1 text-white/80 font-semibold whitespace-nowrap hidden sm:table-cell tracking-wide">
              ABE
            </th>
            <th className="text-right px-2 py-1 text-white/80 font-semibold whitespace-nowrap hidden sm:table-cell tracking-wide">
              FEC
            </th>
            <th className="text-right px-2 py-1 text-white/80 font-semibold whitespace-nowrap hidden sm:table-cell tracking-wide">
              AJU
            </th>
            <th className="text-center px-2 py-1 text-white font-semibold whitespace-nowrap tracking-wide">DESCR</th>
            <th className="text-right px-2 py-1 text-[#ff4500] font-semibold whitespace-nowrap tracking-wide">PRAZO</th>
            <th className="text-center px-2 py-1 text-[#20b2aa] font-semibold whitespace-nowrap tracking-wide">ATUALIZADO</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {tableData.map((item) => (
            <NoSSR key={item.symbol}>
              <MemoizedTableRow
                item={item}
                formatNumber={formatNumber}
                formatPercentage={formatPercentage}
                formatLastUpdate={formatLastUpdate}
                getMaturityClass={getMaturityClass}
                getVariationClass={getVariationClass}
                flashClass={getFlashClass(item.symbol)}
              />
            </NoSSR>
          ))}
        </tbody>
      </table>
      </div>
    </StableTable>
  )

  const soybeanData = data
    .filter((item) => item.symbol.includes("ZS"))
    .sort((a, b) => a.diasAteVencimento - b.diasAteVencimento)

  const cornData = data
    .filter((item) => item.symbol.includes("ZC"))
    .sort((a, b) => a.diasAteVencimento - b.diasAteVencimento)

  return (
    <div className="space-y-0.5">
      {title ? (
        renderTable(
          data.sort((a, b) => a.diasAteVencimento - b.diasAteVencimento),
          title,
        )
      ) : (
        <>
          {soybeanData.length > 0 && renderTable(soybeanData, "SOJA CBOT")}
          {cornData.length > 0 && renderTable(cornData, "MILHO CBOT")}
        </>
      )}
    </div>
  )
})

