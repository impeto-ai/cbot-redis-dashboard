"use client"

import React, { useEffect, useRef, useState } from "react"
import { Info } from "lucide-react"
import type { EndOfMonthRow } from "@/utils/buildEndOfMonthCurve"
import { useSmoothValue } from "@/hooks/useSmoothTransition"
import { TableSkeleton } from "@/components/TableSkeleton"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type FlashType = "positive" | "negative" | "price"

// Inline porque o hook useValueFlash compartilhado nao esta no repo ainda.
function useFlashClass(value: number | null, type: FlashType = "price") {
  const [flashing, setFlashing] = useState(false)
  const prev = useRef<number | null>(value)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (value !== null && prev.current !== null && value !== prev.current) {
      setFlashing(true)
      timer.current = setTimeout(() => setFlashing(false), 800)
    }
    prev.current = value
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [value])

  if (!flashing) return ""
  if (type === "positive") return "cell-flash-positive"
  if (type === "negative") return "cell-flash-negative"
  return "cell-flash-price"
}

interface EndOfMonthCurveTableProps {
  data: EndOfMonthRow[]
  spot: number | null
  spotLabel?: string
  title?: string
  isLoading?: boolean
}

const SmoothNumberCell = React.memo(
  ({
    value,
    className,
    flashType,
    decimals = 4,
  }: {
    value: number | null
    className: string
    flashType?: "positive" | "negative" | "price"
    decimals?: number
  }) => {
    const smoothValue = useSmoothValue(value, { duration: 600 })
    const flashClass = useFlashClass(value, flashType)

    const formatted =
      smoothValue === null || smoothValue === undefined ? "-" : smoothValue.toFixed(decimals)

    return (
      <td className={className}>
        <span className={flashClass}>{formatted}</span>
      </td>
    )
  },
)
SmoothNumberCell.displayName = "SmoothNumberCell"

const EomRow = React.memo(({ row }: { row: EndOfMonthRow }) => {
  const diffColor = row.diff >= 0 ? "text-[#00ff00]" : "text-[#ff4444]"
  const diffPrefix = row.diff >= 0 ? "+" : ""

  return (
    <tr className="border-b border-gray-800 hover:bg-[#1a1f2e] table-row stable-layout">
      <td className="px-2 py-1 text-[#ffff00] whitespace-nowrap data-cell">{row.date}</td>
      <SmoothNumberCell
        value={row.taxa}
        className="px-2 py-1 text-right text-white whitespace-nowrap data-cell"
        flashType="price"
      />
      <td
        className={`px-2 py-1 text-right ${diffColor} whitespace-nowrap data-cell font-mono`}
      >
        {diffPrefix}
        {row.diff.toFixed(4)}
      </td>
    </tr>
  )
})
EomRow.displayName = "EomRow"

export const EndOfMonthCurveTable = React.memo(function EndOfMonthCurveTable({
  data,
  spot,
  spotLabel = "PTAX",
  title = "CURVA FIM DE MÊS",
  isLoading = false,
}: EndOfMonthCurveTableProps) {
  if (isLoading || spot === null || !data || data.length === 0) {
    return <TableSkeleton rows={15} title={title} type="curva" />
  }

  return (
    <div className="mb-0.5 no-flash data-fade-in">
      <div className="bg-gradient-to-r from-[#9a9a00] to-[#9a9a00] px-2 py-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-black font-bold text-xs sm:text-sm md:text-base">{title}</h2>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Como o calculo e feito"
                className="text-black/80 hover:text-black transition-colors clickable"
              >
                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="start"
              className="w-[320px] sm:w-[380px] bg-[#1a1f2e] border-gray-700 text-white text-xs sm:text-sm"
            >
              <div className="space-y-2">
                <h3 className="font-bold text-[#ffff00]">Como e calculado</h3>
                <p className="text-gray-200">
                  Cada linha projeta o dolar para o <strong>ultimo dia calendario</strong> de cada mes,
                  combinando:
                </p>
                <ul className="list-disc pl-4 text-gray-300 space-y-1">
                  <li>
                    <strong>Spot ({spotLabel})</strong> como ancora D+0 — dolar pronto em tempo real
                    do Redis (<code>cambio:DOL COM</code>).
                  </li>
                  <li>
                    <strong>Curva do dolar BM&amp;F</strong> em pontos fixos (7D, 30D, 60D, ..., 600D).
                  </li>
                </ul>
                <p className="text-gray-200 pt-1">
                  <strong className="text-[#ffff00]">Interpolacao linear</strong> entre os dois pontos
                  vizinhos da curva que cercam o N-esimo dia da linha. Abaixo do 1o ponto usa o slope
                  entre spot e 7D; acima do ultimo, extrapola com o slope dos dois ultimos pontos
                  (limite de 90 dias).
                </p>
                <p className="text-gray-400 text-[10px] sm:text-xs pt-1 border-t border-gray-700">
                  <strong>Dif. vs Spot</strong> = taxa projetada − spot. Positivo = premio futuro
                  sobre o pronto.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <span className="text-black text-[10px] sm:text-xs md:text-sm font-mono">
          Spot ({spotLabel}): <strong>{spot.toFixed(4)}</strong>
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs sm:text-sm md:text-base min-w-[320px]">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[35%]" />
            <col className="w-[35%]" />
          </colgroup>
          <thead>
            <tr className="bg-[#1a1f2e]">
              <th className="text-left px-2 py-1 text-gray-300 font-normal whitespace-nowrap">Data</th>
              <th className="text-right px-2 py-1 text-gray-300 font-normal whitespace-nowrap">Taxa</th>
              <th className="text-right px-2 py-1 text-gray-300 font-normal whitespace-nowrap">
                Dif. vs Spot
              </th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {data.map((row) => (
              <EomRow key={row.dateKey} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
})
