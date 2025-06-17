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
}

export interface ParsedCurvaData {
  curva: string
  taxa: number | null
  var: number | null
  datetime: string
  lastUpdate?: string
}

export interface MarketResponse {
  [key: string]: any
}

export interface MarketData {
  symbolId?: {
    symbol: string
  }
  arrValues?: { [key: string]: string }[]
}

