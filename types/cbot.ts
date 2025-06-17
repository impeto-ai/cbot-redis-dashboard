export interface SymbolId {
  sourceId: string
  symbol: string
}

export interface CBOTValue {
  [key: string]: string
}

export interface CBOTData {
  symbolId: SymbolId
  datetime: string
  arrValues: CBOTValue[]
  lastUpdate: string
}

export interface CBOTResponse {
  [symbol: string]: CBOTData
}

