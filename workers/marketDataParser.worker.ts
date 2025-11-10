/* eslint-disable no-restricted-globals */
import type { ParsedMarketData, ParsedCurvaData, MarketResponse } from "@/types/market-data"

// Tipos para mensagens do worker
interface ParseRequest {
  type: "parse"
  data: MarketResponse
}

interface ParseResponse {
  type: "parsed"
  result: {
    soybeanData: ParsedMarketData[]
    cornData: ParsedMarketData[]
    wheatData: ParsedMarketData[]
    mealData: ParsedMarketData[]
    oilData: ParsedMarketData[]
    b3Data: ParsedMarketData[]
    curvaData: ParsedCurvaData[]
  }
}

// Funções de parsing (copiadas de utils/parseMarketData.ts)
function parseMarketData(data: any): ParsedMarketData {
  const arrValues = data?.arrValues || []
  const symbolId = data?.symbolId || {}
  const lastUpdate = data?.lastUpdate || new Date().toISOString()

  const getValue = (code: string): string | null => {
    const item = arrValues.find((item: any) => item[code] !== undefined)
    return item ? item[code] : null
  }

  const vencimentoStr = getValue("09") || getValue("9")
  let vencimento = vencimentoStr || "-"
  let diasAteVencimento = -1

  if (vencimentoStr && vencimentoStr !== "-") {
    try {
      const [day, month, year] = vencimentoStr.split("/")
      const vencimentoDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      diasAteVencimento = Math.floor((vencimentoDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    } catch (e) {
      console.error("Erro ao calcular dias até vencimento:", e)
    }
  }

  const parseNumber = (str: string | null): number | null => {
    if (!str || str === "-") return null
    const num = Number.parseFloat(str.replace(",", "."))
    return Number.isNaN(num) ? null : num
  }

  const variacao = parseNumber(getValue("01") || getValue("1"))
  const ultimoPreco = parseNumber(getValue("10"))
  const maximo = parseNumber(getValue("16"))
  const minimo = parseNumber(getValue("17"))
  const abertura = parseNumber(getValue("18"))
  const fechamento = parseNumber(getValue("1A"))
  const ajuste = parseNumber(getValue("0C"))
  const pct = variacao
  const diff = parseNumber(getValue("26"))

  return {
    symbol: symbolId.symbol || "N/A",
    vencimento,
    diasAteVencimento,
    variacao,
    ultimoPreco,
    maximo,
    minimo,
    abertura,
    fechamento,
    lastUpdate,
    pct,
    ajuste,
    diff,
  }
}

function parseCurvaData(data: any): ParsedCurvaData {
  const arrValues = data?.arrValues || []
  const symbolId = data?.symbolId || {}
  const lastUpdate = data?.lastUpdate || new Date().toISOString()

  const getValue = (code: string): string | null => {
    const item = arrValues.find((item: any) => item[code] !== undefined)
    return item ? item[code] : null
  }

  const parseNumber = (str: string | null): number | null => {
    if (!str || str === "-") return null
    const num = Number.parseFloat(str.replace(",", "."))
    return Number.isNaN(num) ? null : num
  }

  const taxa = parseNumber(getValue("10"))
  const varValue = getValue("01") || getValue("1")
  const var_ = parseNumber(varValue)
  const datetime = getValue("04") || new Date().toISOString()

  const dataVencimento = getValue("09") || getValue("9") || undefined

  return {
    curva: symbolId.symbol || "N/A",
    taxa,
    var: var_,
    datetime,
    lastUpdate,
    dataVencimento,
  }
}

function parseB3Data(data: any): ParsedMarketData {
  return parseMarketData(data)
}

// Single-pass parsing - processa todos os dados de uma vez
function parseAllMarketData(marketData: MarketResponse) {
  const result = {
    soybeanData: [] as ParsedMarketData[],
    cornData: [] as ParsedMarketData[],
    wheatData: [] as ParsedMarketData[],
    mealData: [] as ParsedMarketData[],
    oilData: [] as ParsedMarketData[],
    b3Data: [] as ParsedMarketData[],
    curvaData: [] as ParsedCurvaData[],
  }

  // Single pass através de todas as chaves
  for (const key in marketData) {
    try {
      if (key.includes("ZS")) {
        result.soybeanData.push(parseMarketData(marketData[key]))
      } else if (key.includes("ZC")) {
        result.cornData.push(parseMarketData(marketData[key]))
      } else if (key.includes("ZW")) {
        result.wheatData.push(parseMarketData(marketData[key]))
      } else if (key.includes("ZM")) {
        result.mealData.push(parseMarketData(marketData[key]))
      } else if (key.includes("ZL")) {
        result.oilData.push(parseMarketData(marketData[key]))
      } else if (key.includes("b3:")) {
        result.b3Data.push(parseB3Data(marketData[key]))
      } else if (key.includes("CURVA DE DOLAR")) {
        result.curvaData.push(parseCurvaData(marketData[key]))
      }
    } catch (error) {
      console.error(`Error parsing key ${key}:`, error)
    }
  }

  // Ordenar e filtrar uma única vez
  const sortAndFilter = (data: ParsedMarketData[]) =>
    data.filter((item) => item.diasAteVencimento >= 0).sort((a, b) => a.diasAteVencimento - b.diasAteVencimento)

  result.soybeanData = sortAndFilter(result.soybeanData)
  result.cornData = sortAndFilter(result.cornData)
  result.wheatData = sortAndFilter(result.wheatData)
  result.mealData = sortAndFilter(result.mealData)
  result.oilData = sortAndFilter(result.oilData)
  result.b3Data = sortAndFilter(result.b3Data)

  return result
}

// Handler de mensagens do worker
self.onmessage = (e: MessageEvent<ParseRequest>) => {
  if (e.data.type === "parse") {
    try {
      const result = parseAllMarketData(e.data.data)
      const response: ParseResponse = {
        type: "parsed",
        result,
      }
      self.postMessage(response)
    } catch (error) {
      console.error("Worker error:", error)
      self.postMessage({ type: "error", error: String(error) })
    }
  }
}

export {}
