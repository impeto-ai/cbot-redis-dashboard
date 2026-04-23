"use client"

import useSWR from "swr"
import { fetchPTAXData, calcularPTAXMedia } from "@/utils/ptaxUtils"

// Busca a PTAX mais recente do Banco Central para usar como spot (D+0) na interpolacao
// da curva de dolar. Revalida a cada 10 minutos — PTAX so muda algumas vezes ao dia.
export function usePTAXSpot() {
  const { data, error, isLoading } = useSWR(
    "ptax-spot",
    async () => {
      const dados = await fetchPTAXData()
      const media = calcularPTAXMedia(dados)
      return media > 0 ? media : null
    },
    {
      refreshInterval: 10 * 60 * 1000,
      revalidateOnFocus: false,
      dedupingInterval: 60 * 1000,
    },
  )

  return {
    ptaxValue: data ?? null,
    isLoading,
    error,
  }
}
