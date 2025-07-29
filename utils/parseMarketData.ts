import { differenceInDays, parse } from "date-fns"
import type { ParsedMarketData, ParsedCurvaData } from "@/types/market-data"
import { calculateMaturityDate } from "@/utils/dateUtils"

// Função auxiliar para garantir que temos um objeto
function ensureObject(data: any): any {
  // Se é uma string, tentar fazer parse
  if (typeof data === "string") {
    try {
      return JSON.parse(data)
    } catch (e) {
      console.error("Erro ao fazer parse do JSON:", e)
      return {}
    }
  }

  // Se já é um objeto, retornar como está
  if (data && typeof data === "object") {
    return data
  }

  // Caso contrário, retornar objeto vazio
  return {}
}

// Modify the parseMarketData function to handle ZM, ZL and ZW symbols
export function parseMarketData(data: any): ParsedMarketData {
  // Primeiro, garantir que temos um objeto
  data = ensureObject(data)

  // Verificar se os dados estão aninhados sob uma chave
  if (data && typeof data === "object") {
    const keys = Object.keys(data)
    // Se temos apenas uma chave e ela parece ser um símbolo
    if (keys.length === 1 && keys[0].match(/^(ZS|ZC|ZW|ZM|ZL)/)) {
      console.log("Extraindo dados aninhados sob a chave:", keys[0])
      data = data[keys[0]]
    }
  }

  if (!data || !data.symbolId || !data.arrValues || !Array.isArray(data.arrValues)) {
    console.error("Invalid data structure:", typeof data === "object" ? JSON.stringify(data) : typeof data)
    throw new Error("Invalid data structure")
  }

  const getValue = (code: string): string | undefined => {
    if (!Array.isArray(data.arrValues)) {
      console.error("arrValues is not an array:", data.arrValues)
      return undefined
    }

    const valueObj = data.arrValues.find((item: any) => item && typeof item === "object" && Object.keys(item)[0] === code)

    return valueObj ? Object.values(valueObj)[0] as string : undefined
  }

  const parseNumber = (value: string | undefined): number | null => {
    if (value === undefined || value === "") return null
    // Remove caracteres não numéricos, exceto ponto decimal e sinal negativo
    const cleanValue = value.replace(/[^\d.-]/g, "")
    const parsed = Number.parseFloat(cleanValue)
    return isNaN(parsed) ? null : parsed
  }

  const mesVencimento = getValue("09") || ""
  const [dia = "01", mes = "01", ano = "2023"] = mesVencimento.split("/")
  const mesNome = getMesNome(mes)

  // Determine product type based on symbol
  let produto = "DESCONHECIDO"
  if (data.symbolId?.symbol.includes("ZS")) {
    produto = "SOJA"
  } else if (data.symbolId?.symbol.includes("ZC")) {
    produto = "MILHO"
  } else if (data.symbolId?.symbol.includes("ZW")) {
    produto = "TRIGO"
  } else if (data.symbolId?.symbol.includes("ZM")) {
    produto = "FARELO"
  } else if (data.symbolId?.symbol.includes("ZL")) {
    produto = "ÓLEO"
  }

  // Calcular a diferença de dias
  const calculateDaysToMaturity = (maturityDate: string) => {
    try {
      const today = new Date()
      const maturity = parse(maturityDate, "dd/MM/yyyy", new Date())
      return differenceInDays(maturity, today)
    } catch (error) {
      console.error("Error calculating days to maturity:", error)
      return 0
    }
  }

  const diasAteVencimento = calculateDaysToMaturity(`${dia}/${mes}/${ano}`)

  return {
    symbol: data.symbolId?.symbol || "Unknown",
    vencimento: `${mesNome}/${ano}`, // Removido o nome do produto, apenas vencimento
    variacao: parseNumber(getValue("01")),
    pct: parseNumber(getValue("1")), // Novo campo PCT
    maximo: parseNumber(getValue("16")),
    minimo: parseNumber(getValue("17")),
    abertura: parseNumber(getValue("18")),
    ultimoPreco: parseNumber(getValue("10")),
    fechamento: parseNumber(getValue("1A")),
    ajuste: parseNumber(getValue("0C")), // Novo campo de ajuste
    diasAteVencimento,
    diff: parseNumber(getValue("26")),
    lastUpdate: data.lastUpdate || new Date().toISOString(), // Usar o lastUpdate do objeto de dados
  }
}

export function parseCurvaData(data: any): ParsedCurvaData {
  // Primeiro, verificamos se os dados estão em formato de string JSON
  if (typeof data === "string") {
    try {
      data = JSON.parse(data)
      console.log("Convertido string JSON para objeto:", Object.keys(data).length, "chaves")
    } catch (e) {
      console.error("Erro ao fazer parse do JSON:", e)
    }
  }

  // Verificamos se os dados estão aninhados sob uma chave
  if (data && typeof data === "object") {
    const keys = Object.keys(data)
    // Se temos apenas uma chave e ela contém "CURVA DE DOLAR"
    if (keys.length === 1 && keys[0].includes("CURVA DE DOLAR")) {
      console.log("Extraindo dados aninhados sob a chave:", keys[0])
      data = data[keys[0]]
    }
  }

  if (!data || !data.symbolId || !data.arrValues || !Array.isArray(data.arrValues)) {
    console.error("Invalid curva data structure:", typeof data === "object" ? JSON.stringify(data) : typeof data)
    throw new Error("Invalid curva data structure")
  }

  const getValue = (code: string): string | undefined => {
    if (!Array.isArray(data.arrValues)) {
      console.error("arrValues is not an array:", data.arrValues)
      return undefined
    }

    const valueObj = data.arrValues.find((item: any) => item && typeof item === "object" && Object.keys(item)[0] === code)

    return valueObj ? Object.values(valueObj)[0] as string : undefined
  }

  // Códigos atualizados para a curva de dólar
  const taxa = getValue("10") || getValue("1A") // Taxa - priorizar chave 10, com fallback para 1A
  const variacao = getValue("29") || getValue("27") // Variação percentual
  const data_ref = getValue("28") // Data de referência
  const hora = getValue("24") || "" // Hora (pode estar vazia)

  // Limpar e converter valores numéricos
  const cleanNumber = (value: string | undefined): number | null => {
    if (!value) return null
    // Remover caracteres não numéricos, exceto ponto decimal e sinal
    const cleaned = value.replace(/[^\d.-]/g, "")
    const parsed = Number(cleaned)
    return isNaN(parsed) ? null : parsed
  }

  return {
    curva: data.symbolId?.symbol || "Unknown",
    taxa: cleanNumber(taxa),
    var: cleanNumber(variacao),
    datetime: `${data_ref}${hora ? " " + hora : ""}`.trim(),
    lastUpdate: data.lastUpdate || new Date().toISOString(), // Usar o lastUpdate do objeto de dados
    dataVencimento: calculateMaturityDate(data.symbolId?.symbol || "Unknown"), // Adicionar data de vencimento
  }
}

// Adicione a função parseB3Data após a função parseCurvaData

export function parseB3Data(data: any): ParsedMarketData {
  // Garantir que temos um objeto
  data = ensureObject(data)

  // Verificar se os dados estão aninhados sob uma chave
  if (data && typeof data === "object") {
    const keys = Object.keys(data)
    // Se temos apenas uma chave e ela parece ser um símbolo da B3
    if (keys.length === 1 && keys[0].includes("CCM")) {
      data = data[keys[0]]
    }
  }

  if (!data || !data.symbolId || !data.arrValues || !Array.isArray(data.arrValues)) {
    console.error("Invalid B3 data structure:", typeof data === "object" ? JSON.stringify(data) : typeof data)
    throw new Error("Invalid B3 data structure")
  }

  const getValue = (code: string): string | undefined => {
    if (!Array.isArray(data.arrValues)) {
      console.error("arrValues is not an array:", data.arrValues)
      return undefined
    }

    const valueObj = data.arrValues.find((item: any) => item && typeof item === "object" && Object.keys(item)[0] === code)

    return valueObj ? Object.values(valueObj)[0] as string : undefined
  }

  const parseNumber = (value: string | undefined): number | null => {
    if (value === undefined || value === "" || value === "-") return null
    // Remove caracteres não numéricos, exceto ponto decimal e sinal negativo
    const cleanValue = value.replace(/[^\d.-]/g, "")
    const parsed = Number.parseFloat(cleanValue)
    return isNaN(parsed) ? null : parsed
  }

  const mesVencimento = getValue("09") || ""
  const [dia = "01", mes = "01", ano = "2023"] = mesVencimento.split("/")
  const mesNome = getMesNome(mes)

  // Calcular a diferença de dias
  const calculateDaysToMaturity = (maturityDate: string) => {
    try {
      const today = new Date()
      const maturity = parse(maturityDate, "dd/MM/yyyy", new Date())
      return differenceInDays(maturity, today)
    } catch (error) {
      console.error("Error calculating days to maturity:", error)
      return 0
    }
  }

  const diasAteVencimento = calculateDaysToMaturity(`${dia}/${mes}/${ano}`)

  return {
    symbol: data.symbolId?.symbol || "Unknown",
    vencimento: `${mesNome}/${ano}`, // Removido "BM&F -", apenas vencimento
    variacao: parseNumber(getValue("01")),
    pct: parseNumber(getValue("01")), // Variação percentual
    maximo: parseNumber(getValue("16")),
    minimo: parseNumber(getValue("17")),
    abertura: parseNumber(getValue("18")),
    ultimoPreco: parseNumber(getValue("10")),
    fechamento: parseNumber(getValue("1A")),
    ajuste: parseNumber(getValue("0C")), // Ajuste
    diasAteVencimento,
    diff: parseNumber(getValue("26")), // Diferença
    lastUpdate: data.lastUpdate || new Date().toISOString(),
  }
}

function getMesNome(mes: string): string {
  const meses: Record<string, string> = {
    "01": "JAN",
    "02": "FEV",
    "03": "MAR",
    "04": "ABR",
    "05": "MAI",
    "06": "JUN",
    "07": "JUL",
    "08": "AGO",
    "09": "SET",
    "10": "OUT",
    "11": "NOV",
    "12": "DEZ",
  }
  return meses[mes] || "UNK"
}

