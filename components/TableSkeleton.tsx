import React from "react"

interface TableSkeletonProps {
  rows?: number
  title?: string
  type?: "cbot" | "curva"
}

export const TableSkeleton = React.memo(function TableSkeleton({
  rows = 8,
  title = "Carregando...",
  type = "cbot",
}: TableSkeletonProps) {
  if (type === "cbot") {
    return <CBOTTableSkeleton rows={rows} title={title} />
  }

  return <CurvaTableSkeleton rows={rows} title={title} />
})

// Skeleton para tabelas CBOT (Soja, Milho, etc)
const CBOTTableSkeleton = ({ rows, title }: { rows: number; title: string }) => {
  return (
    <div className="mb-4 overflow-x-auto">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] px-2 py-1.5 rounded-t-lg">
        <h2 className="text-white font-bold text-xs sm:text-sm md:text-base text-center tracking-wide">
          {title}
        </h2>
      </div>
      <table className="w-full border-collapse text-xs sm:text-sm md:text-base">
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
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="skeleton-row border-b border-gray-800">
              {/* Ativo */}
              <td className="px-2 py-2 text-left">
                <div className="skeleton-text w-16" />
              </td>
              {/* Descrição */}
              <td className="px-2 py-2 text-center">
                <div className="skeleton-text w-20 mx-auto" />
              </td>
              {/* Último */}
              <td className="px-2 py-2 text-right">
                <div className="skeleton-value ml-auto" />
              </td>
              {/* PCT */}
              <td className="px-2 py-2 text-right">
                <div className="skeleton-value ml-auto" />
              </td>
              {/* DIF */}
              <td className="px-2 py-2 text-right">
                <div className="skeleton-value ml-auto" />
              </td>
              {/* MAX - hidden on mobile */}
              <td className="px-2 py-2 text-right hidden sm:table-cell">
                <div className="skeleton-value ml-auto" />
              </td>
              {/* MIN - hidden on mobile */}
              <td className="px-2 py-2 text-right hidden sm:table-cell">
                <div className="skeleton-value ml-auto" />
              </td>
              {/* ABER - hidden on mobile */}
              <td className="px-2 py-2 text-right hidden sm:table-cell">
                <div className="skeleton-value ml-auto" />
              </td>
              {/* FECH - hidden on mobile */}
              <td className="px-2 py-2 text-right hidden sm:table-cell">
                <div className="skeleton-value ml-auto" />
              </td>
              {/* AJU - hidden on mobile */}
              <td className="px-2 py-2 text-right hidden sm:table-cell">
                <div className="skeleton-value ml-auto" />
              </td>
              {/* DIAS */}
              <td className="px-2 py-2 text-right">
                <div className="skeleton-text w-8 ml-auto" />
              </td>
              {/* ATUALIZ */}
              <td className="px-2 py-2 text-center">
                <div className="skeleton-text w-16 mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Skeleton para tabela da Curva do Dólar
const CurvaTableSkeleton = ({ rows, title }: { rows: number; title: string }) => {
  return (
    <div className="mb-0.5">
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
            {Array.from({ length: rows }).map((_, index) => (
              <tr key={index} className="skeleton-row border-b border-gray-800">
                {/* Curva */}
                <td className="px-2 py-2 text-left">
                  <div className="skeleton-text w-12" />
                </td>
                {/* Taxa */}
                <td className="px-2 py-2 text-right">
                  <div className="skeleton-value ml-auto" />
                </td>
                {/* Var */}
                <td className="px-2 py-2 text-right">
                  <div className="skeleton-value ml-auto" />
                </td>
                {/* Vencimento */}
                <td className="px-2 py-2 text-center">
                  <div className="skeleton-text w-20 mx-auto" />
                </td>
                {/* Hora - hidden on mobile */}
                <td className="px-2 py-2 text-center hidden md:table-cell">
                  <div className="skeleton-text w-16 mx-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
