/**
 * Utilidades para manipulação de datas da curva de dólar
 */

/**
 * Extrai o número de dias de uma string de curva (ex: "7D" -> 7)
 */
export function extractDaysFromCurva(curva: string): number {
  const match = curva.match(/(\d+)D/i)
  return match ? Number.parseInt(match[1], 10) : 0
}

/**
 * Calcula a data de vencimento baseada nos dias da curva
 * @param curva - String da curva (ex: "7D", "30D", "360D")
 * @param baseDate - Data base (padrão: hoje)
 * @returns Data de vencimento formatada em dd/mm/yyyy
 */
export function calculateMaturityDate(curva: string, baseDate: Date = new Date()): string {
  const days = extractDaysFromCurva(curva)
  
  if (days === 0) {
    return "-"
  }

  const maturityDate = new Date(baseDate)
  maturityDate.setDate(maturityDate.getDate() + days)

  return maturityDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Formata uma data para o padrão brasileiro
 */
export function formatDateToBrazilian(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit", 
    year: "numeric",
  })
}

/**
 * Calcula data de vencimento a partir de dias específicos
 */
export function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
} 