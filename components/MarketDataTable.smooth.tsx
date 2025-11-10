import type { ParsedCurvaData } from "@/types/market-data"
import React from "react"
import { useSmoothValue, useValueChangeEffect } from "@/hooks/useSmoothTransition"
import { TableSkeleton } from "@/components/TableSkeleton"

interface ParsedCurvaDataWithUpdate extends ParsedCurvaData {
  lastUpdate?: string
}

interface MarketDataTableProps {
  data: ParsedCurvaDataWithUpdate[]
  title?: string
  modalControls?: any
  isLoading?: boolean
}

// Componente para célula de taxa com transição suave E FLASH
const SmoothTaxaCell = React.memo(
  ({
    value,
    className,
    flashType = "none",
    aliveType = "none"
  }: {
    value: number | null;
    className: string;
    flashType?: "positive" | "negative" | "none"
    aliveType?: "positive" | "negative" | "none"
  }) => {
    const smoothValue = useSmoothValue(value, { duration: 600 })
    const isChanging = useValueChangeEffect(value)

    const formatNumber = (val: number | null): string => {
      if (val === null) return "-"
      return val.toFixed(4)
    }

    // Determinar classe de flash
    const flashClass = isChanging && flashType !== "none" ? `flash-${flashType}` : ""
    const aliveClass = aliveType !== "none" ? `alive-${aliveType}` : ""

    return (
      <td className={className}>
        <span
          className={`${isChanging ? "value-changing" : ""} ${flashClass} ${aliveClass}`}
          style={{
            display: 'inline-block',
            animation: aliveType !== 'none' ? `${
              aliveType === 'positive' ? 'pulseGreenAlive' : 'pulseRedAlive'
            } 1.5s ease-in-out infinite` : 'none'
          }}
        >
          {formatNumber(smoothValue)}
        </span>
      </td>
    )
  }
)

SmoothTaxaCell.displayName = "SmoothTaxaCell"

const SmoothTableRow = React.memo(
  ({
    item,
    formatNumber,
    formatHora,
  }: {
    item: ParsedCurvaDataWithUpdate
    formatNumber: (value: number | null | undefined, decimals?: number) => string
    formatHora: (datetime: string) => string
  }) => {
    const cleanCurvaText = (curva: string): string => {
      return curva.replace(/CURVA\s*DE\s*DOLAR\s*/i, "").trim()
    }

    const isChanging = useValueChangeEffect(`${item.taxa}-${item.var}`, 1200)

    return (
      <tr
        key={item.curva}
        className={`border-b border-gray-800 hover:bg-[#1a1f2e] table-row stable-layout ${isChanging ? "data-updated" : ""}`}
      >
        <td className="px-2 py-1 text-[#ffff00] whitespace-nowrap data-cell">
          {cleanCurvaText(item.curva)}
        </td>

        {/* Taxa com interpolação suave - SEM flash */}
        <SmoothTaxaCell
          value={item.taxa}
          className="px-2 py-1 text-right text-white whitespace-nowrap data-cell"
          flashType="none"
          aliveType="none"
        />

        {/* Var com interpolação suave + FLASH VERDE/VERMELHO + PULSE CONSTANTE */}
        <SmoothTaxaCell
          value={item.var}
          className={`px-2 py-1 text-right ${item.var && item.var >= 0 ? "text-[#00ff00]" : "text-[#ff4444]"} data-cell whitespace-nowrap`}
          flashType={item.var && item.var >= 0 ? "positive" : "negative"}
          aliveType={item.var && item.var >= 0 ? "positive" : "negative"}
        />

        <td className="px-2 py-1 text-center text-[#40c4ff] whitespace-nowrap data-cell">
          {item.dataVencimento || "-"}
        </td>
        <td className="px-2 py-1 text-center text-white whitespace-nowrap hidden md:table-cell data-cell">
          {formatHora(item.datetime)}
        </td>
      </tr>
    )
  }
)

SmoothTableRow.displayName = "SmoothTableRow"

export const MarketDataTableSmooth = React.memo(function MarketDataTableSmooth({
  data,
  title = "Curva do Dólar",
  modalControls,
  isLoading = false,
}: MarketDataTableProps) {
  const formatNumber = (value: number | null | undefined, decimals = 4): string => {
    if (value === null || value === undefined) return "-"
    return value.toFixed(decimals)
  }

  const extractDays = (curva: string): number => {
    const match = curva.match(/(\d+)D/i)
    return match ? Number.parseInt(match[1]) : 0
  }

  const formatHora = (datetime: string): string => {
    if (!datetime) return "-"
    const parts = datetime.split(" ")
    if (parts.length > 1) {
      return parts[1]
    }
    return "-"
  }

  // Mostrar skeleton enquanto carrega ou sem dados
  if (isLoading || !data || data.length === 0) {
    return <TableSkeleton rows={15} title={title} type="curva" />
  }

  const sortedData = [...data].sort((a, b) => {
    return extractDays(a.curva) - extractDays(b.curva)
  })

  return (
    <div className="mb-0.5 no-flash data-fade-in">
      <div className="bg-gradient-to-r from-[#9a9a00] to-[#9a9a00] px-2 py-1">
        <h2 className="text-black font-bold text-xs sm:text-sm md:text-base">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs sm:text-sm md:text-base min-w-[400px]">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[25%]" />
            <col className="w-[25%]" />
            <col className="w-[25%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr className="bg-[#1a1f2e]">
              <th className="text-left px-2 py-1 text-gray-300 font-normal whitespace-nowrap">Curva</th>
              <th className="text-right px-2 py-1 text-gray-300 font-normal whitespace-nowrap">Taxa</th>
              <th className="text-right px-2 py-1 text-gray-300 font-normal whitespace-nowrap">Var</th>
              <th className="text-center px-2 py-1 text-gray-300 font-normal whitespace-nowrap">Vencimento</th>
              <th className="text-center px-2 py-1 text-gray-300 font-normal whitespace-nowrap hidden md:table-cell">
                Hora
              </th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {sortedData.map((item) => (
              <SmoothTableRow key={item.curva} item={item} formatNumber={formatNumber} formatHora={formatHora} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
})
