export interface ParsedMarketData {
  symbol: string
  vencimento: string
  diasAteVencimento: number
  variacao: number | null
  ultimoPreco: number | null
  maximo: number | null
  minimo: number | null
  abertura: number | null
  fechamento: number | null
  lastUpdate: string
  pct: number | null
  ajuste: number | null
  diff: number | null
  expirationDate?: string
  close?: string
  change?: string
}

