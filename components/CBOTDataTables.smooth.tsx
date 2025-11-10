import type { ParsedMarketData } from "@/types/market-data"
import React from "react"
import { useSmoothValue, useValueChangeEffect } from "@/hooks/useSmoothTransition"
import { NoSSR } from "@/components/NoSSR"
import { TableSkeleton } from "@/components/TableSkeleton"

interface CBOTDataTablesProps {
  data: ParsedMarketData[]
  title?: string
  isLoading?: boolean
}

// Componente para célula de valor com transição suave E FLASH DE COR
const SmoothValueCell = React.memo(
  ({
    value,
    className,
    formatter,
    flashType = "none",
    aliveType = "none",
  }: {
    value: number | null
    className: string
    formatter: (v: number | null) => string
    flashType?: "positive" | "negative" | "price" | "none"
    aliveType?: "positive" | "negative" | "price" | "neutral" | "none"
  }) => {
    const smoothValue = useSmoothValue(value, { duration: 600 })
    const isChanging = useValueChangeEffect(value)

    // Determinar classe de flash baseado no tipo e se está mudando
    const flashClass = isChanging && flashType !== "none" ? `flash-${flashType}` : ""

    // Classe alive para pulse constante
    const aliveClass = aliveType !== "none" ? `alive-${aliveType}` : ""

    return (
      <td className={className}>
        <span
          className={`${isChanging ? "value-changing" : ""} ${flashClass} ${aliveClass}`}
          style={{
            display: 'inline-block',
            animation: aliveType !== 'none' ? `${
              aliveType === 'positive' ? 'pulseGreenAlive' :
              aliveType === 'negative' ? 'pulseRedAlive' :
              'pulseYellowAlive'
            } 1.5s ease-in-out infinite` : 'none'
          }}
        >
          {formatter(smoothValue)}
        </span>
      </td>
    )
  }
)

SmoothValueCell.displayName = "SmoothValueCell"

// Row com transições suaves
const SmoothTableRow = React.memo(
  ({
    item,
    formatNumber,
    formatPercentage,
    formatLastUpdate,
    getMaturityClass,
    getVariationClass,
  }: {
    item: ParsedMarketData
    formatNumber: (value: number | null | undefined, decimals?: number) => string
    formatPercentage: (value: number | null | undefined) => string
    formatLastUpdate: (lastUpdate: string | undefined) => string
    getMaturityClass: (days: number) => string
    getVariationClass: (variation: number | null | undefined) => string
  }) => {
    const isPctPositive = (item.variacao || 0) >= 0
    const isDiffPositive = (item.diff || 0) >= 0
    const pctColor = isPctPositive ? "text-[#00ff00] value-highlight" : "text-[#ff4444] value-highlight"
    const diffColor = isDiffPositive ? "text-[#00ff00] value-highlight" : "text-[#ff4444] value-highlight"
    const variationGlowClass = getVariationClass(item.variacao)

    // Detectar mudanças para aplicar animação
    const isChanging = useValueChangeEffect(
      `${item.ultimoPreco}-${item.variacao}-${item.diff}`,
      1200
    )

    return (
      <tr
        key={item.symbol}
        className={`border-b border-gray-800 table-row stable-layout ${isChanging ? "data-updated" : ""}`}
      >
        <td className="px-2 py-1 text-left text-[#40c4ff] whitespace-nowrap data-cell symbol-glow">
          {item.symbol}
        </td>
        <td className="px-2 py-1 text-center text-white whitespace-nowrap data-cell">{item.vencimento}</td>

        {/* Último preço com interpolação suave + FLASH AMARELO + PULSE CONSTANTE */}
        <SmoothValueCell
          value={item.ultimoPreco}
          className="px-2 py-1 text-right text-yellow-400 whitespace-nowrap font-bold data-cell price-glow"
          formatter={formatNumber}
          flashType="price"
          aliveType="price"
        />

        {/* Variação com interpolação suave + FLASH VERDE/VERMELHO + PULSE CONSTANTE */}
        <SmoothValueCell
          value={item.variacao}
          className={`px-2 py-1 text-right ${pctColor} ${variationGlowClass} data-cell whitespace-nowrap`}
          formatter={formatPercentage}
          flashType={isPctPositive ? "positive" : "negative"}
          aliveType={isPctPositive ? "positive" : "negative"}
        />

        {/* Diff com interpolação suave + FLASH VERDE/VERMELHO + PULSE CONSTANTE */}
        <SmoothValueCell
          value={item.diff}
          className={`px-2 py-1 text-right ${diffColor} data-cell whitespace-nowrap`}
          formatter={formatNumber}
          flashType={isDiffPositive ? "positive" : "negative"}
          aliveType={isDiffPositive ? "positive" : "negative"}
        />

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
  }
)

SmoothTableRow.displayName = "SmoothTableRow"

export const CBOTDataTablesSmooth = React.memo(function CBOTDataTablesSmooth({
  data,
  title,
  isLoading = false,
}: CBOTDataTablesProps) {
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
    if (days <= 60) return "bg-gradient-to-r from-[#1a2327] to-[#1e2c30] maturity-warning"
    if (days <= 90) return "bg-gradient-to-r from-[#1a2327] to-[#1e2c30] maturity-attention"
    return "bg-gradient-to-r from-[#1a2327] to-[#1e2c30] maturity-moderate"
  }

  const getVariationClass = (variation: number | null | undefined): string => {
    if (!variation) return ""
    const abs = Math.abs(variation)
    if (abs >= 5) return "variation-high"
    if (abs >= 3) return "variation-medium"
    if (abs >= 1.5) return "variation-low"
    return ""
  }

  const tableTitle = title || "CBOT Data"

  // Mostrar skeleton enquanto carrega ou sem dados
  if (isLoading || !data || data.length === 0) {
    return <TableSkeleton rows={8} title={tableTitle} type="cbot" />
  }

  return (
    <NoSSR>
      <div className="mb-4 overflow-x-auto data-fade-in">
        <div
          className={`${
            tableTitle === "MILHO BM&F"
              ? "bg-gradient-to-r from-[#9a9a00] to-[#9a9a00]"
              : "bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f]"
          } px-2 py-1.5 rounded-t-lg`}
        >
          <h2
            className={`${tableTitle === "MILHO BM&F" ? "text-black" : "text-white"} font-bold text-xs sm:text-sm md:text-base text-center tracking-wide`}
          >
            {tableTitle}
          </h2>
        </div>
        <table className="w-full border-collapse text-xs sm:text-sm md:text-base table-glow">
          <colgroup>
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[15%]" />
          </colgroup>
          <thead>
            <tr className="bg-gradient-to-r from-[#1a1f2e] via-[#242938] to-[#1a1f2e] border-b border-[#40c4ff]/30">
              <th className="text-left px-2 py-1 text-[#40c4ff] font-semibold whitespace-nowrap tracking-wide">
                ATIVO
              </th>
              <th className="text-center px-2 py-1 text-white font-semibold whitespace-nowrap tracking-wide">
                DESCR
              </th>
              <th className="text-right px-2 py-1 text-[#ffd700] font-semibold whitespace-nowrap tracking-wide">
                ULT
              </th>
              <th className="text-right px-2 py-1 text-[#00ff00] font-semibold whitespace-nowrap tracking-wide">
                PCT
              </th>
              <th className="text-right px-2 py-1 text-[#ff6b6b] font-semibold whitespace-nowrap tracking-wide">
                DIF
              </th>
              <th className="text-right px-2 py-1 text-white/80 font-semibold whitespace-nowrap hidden sm:table-cell tracking-wide">
                MAX
              </th>
              <th className="text-right px-2 py-1 text-white/80 font-semibold whitespace-nowrap hidden sm:table-cell tracking-wide">
                MIN
              </th>
              <th className="text-right px-2 py-1 text-white/80 font-semibold whitespace-nowrap hidden sm:table-cell tracking-wide">
                ABER
              </th>
              <th className="text-right px-2 py-1 text-white/80 font-semibold whitespace-nowrap hidden sm:table-cell tracking-wide">
                FECH
              </th>
              <th className="text-right px-2 py-1 text-white/80 font-semibold whitespace-nowrap hidden sm:table-cell tracking-wide">
                AJU
              </th>
              <th className="text-right px-2 py-1 text-white/80 font-semibold whitespace-nowrap tracking-wide">
                DIAS
              </th>
              <th className="text-center px-2 py-1 text-white/80 font-semibold whitespace-nowrap tracking-wide">
                ATUALIZ
              </th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {data.map((item) => (
              <SmoothTableRow
                key={item.symbol}
                item={item}
                formatNumber={formatNumber}
                formatPercentage={formatPercentage}
                formatLastUpdate={formatLastUpdate}
                getMaturityClass={getMaturityClass}
                getVariationClass={getVariationClass}
              />
            ))}
          </tbody>
        </table>
      </div>
    </NoSSR>
  )
})
