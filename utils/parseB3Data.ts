import type { ParsedMarketData } from "@/types/market-data"
import { parse, differenceInDays } from "date-fns"

// Função auxiliar para garantir que temos um objeto
function ensureObject(data: any): any {
  // Se for string, tentar converter para objeto
  if (typeof data === "string") {
    try {
      return JSON.parse(data)
    } catch (e) {
      console.error("Erro ao converter string para objeto:", e)
      return null
    }
  }

  // Se já for objeto, retornar como está
  if (data && typeof data === "object") {
    return data
  }

  // Caso contrário, retornar null
  return null
}

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

    const valueObj = data.arrValues.find((item) => item && typeof item === "object" && Object.keys(item)[0] === code)

    return valueObj ? Object.values(valueObj)[0] : undefined
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
    vencimento: `BM&F - ${mesNome}/${ano}`,
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
  const meses: { [key: string]: string } = {
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
  return meses[mes] || mes
}

