import type { ParsedCurvaData } from "@/types/market-data"
import { extractDaysFromCurva } from "@/utils/dateUtils"

export type SpotSource = "ptax" | "dolcom"

// Fonte do spot usado como ancora (D+0) na interpolacao.
// "dolcom" = dolar pronto do Redis (cambio:DOL COM). "ptax" = PTAX do Redis (se existir).
export const SPOT_SOURCE: SpotSource = "dolcom"

export interface EndOfMonthRow {
  date: string
  dateKey: string
  daysFromToday: number
  taxa: number
  diff: number
}

export interface CurvePoint {
  days: number
  taxa: number
}

// Buffer maximo (em dias) para extrapolar alem do ultimo ponto da curva.
// Evita projecoes absurdas se a curva tiver poucos pontos ou pontos muito espacados.
const MAX_EXTRAPOLATION_DAYS = 90

function extractNumericField(raw: any, codes: string[]): number | null {
  let data = raw
  if (typeof data === "string") {
    try {
      data = JSON.parse(data)
    } catch {
      return null
    }
  }
  if (data && typeof data === "object" && !data.symbolId) {
    const keys = Object.keys(data)
    if (keys.length === 1) {
      data = data[keys[0]]
    }
  }
  if (!data?.arrValues || !Array.isArray(data.arrValues)) return null

  for (const code of codes) {
    const obj = data.arrValues.find(
      (item: any) => item && typeof item === "object" && Object.keys(item)[0] === code,
    )
    if (!obj) continue
    const value = Object.values(obj)[0]
    if (typeof value !== "string" || value === "" || value === "-") continue
    const cleaned = value.replace(/[^\d.-]/g, "")
    const parsed = Number.parseFloat(cleaned)
    if (!Number.isNaN(parsed)) return parsed
  }
  return null
}

export interface SpotInfo {
  value: number | null
  source: SpotSource | null
}

function readPtax(marketData: Record<string, any>): number | null {
  const key = Object.keys(marketData).find((k) => k.includes("PTAX"))
  if (!key) return null
  return extractNumericField(marketData[key], ["10", "1A", "03"])
}

function readDolCom(marketData: Record<string, any>): number | null {
  const key = Object.keys(marketData).find((k) => k.includes("cambio:DOL COM"))
  if (!key) return null
  return extractNumericField(marketData[key], ["10", "03", "1A"])
}

// Retorna o spot e a fonte efetivamente usada.
// Se a preferida nao estiver disponivel, cai para a outra (PTAX nem sempre e publicada em Redis).
export function extractSpot(
  marketData: Record<string, any> | null | undefined,
  preferred: SpotSource = SPOT_SOURCE,
): SpotInfo {
  if (!marketData) return { value: null, source: null }

  if (preferred === "ptax") {
    const ptax = readPtax(marketData)
    if (ptax !== null) return { value: ptax, source: "ptax" }
    const dol = readDolCom(marketData)
    if (dol !== null) return { value: dol, source: "dolcom" }
    return { value: null, source: null }
  }

  const dol = readDolCom(marketData)
  if (dol !== null) return { value: dol, source: "dolcom" }
  const ptax = readPtax(marketData)
  if (ptax !== null) return { value: ptax, source: "ptax" }
  return { value: null, source: null }
}

// Wrapper retrocompativel caso algum outro consumidor venha a importar.
export function extractSpotRate(
  marketData: Record<string, any> | null | undefined,
  source: SpotSource = SPOT_SOURCE,
): number | null {
  return extractSpot(marketData, source).value
}

function normalizeCurvePoints(curva: ParsedCurvaData[]): CurvePoint[] {
  return curva
    .map((c) => ({
      days: extractDaysFromCurva(c.curva),
      taxa: c.taxa,
    }))
    .filter((p): p is CurvePoint => p.days > 0 && p.taxa !== null && !Number.isNaN(p.taxa))
    .sort((a, b) => a.days - b.days)
}

function interpolateRate(points: CurvePoint[], spot: number, targetDays: number): number {
  const first = points[0]
  const last = points[points.length - 1]

  // Extrapolacao abaixo do primeiro ponto: slope entre spot (D+0) e primeiro ponto.
  if (targetDays <= first.days) {
    const slope = (first.taxa - spot) / first.days
    return spot + slope * targetDays
  }

  // Extrapolacao acima do ultimo ponto: slope entre os dois ultimos pontos (ou spot se so houver um).
  if (targetDays >= last.days) {
    const prev = points.length >= 2 ? points[points.length - 2] : { days: 0, taxa: spot }
    const slope = (last.taxa - prev.taxa) / (last.days - prev.days)
    return last.taxa + slope * (targetDays - last.days)
  }

  // Interpolacao linear entre dois pontos adjacentes.
  for (let i = 0; i < points.length - 1; i++) {
    const lo = points[i]
    const hi = points[i + 1]
    if (targetDays >= lo.days && targetDays <= hi.days) {
      const t = (targetDays - lo.days) / (hi.days - lo.days)
      return lo.taxa + (hi.taxa - lo.taxa) * t
    }
  }

  return spot
}

function formatDateBR(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

function lastCalendarDayOfMonth(year: number, monthZeroIndexed: number): Date {
  // Dia 0 do mes seguinte = ultimo dia do mes atual.
  return new Date(year, monthZeroIndexed + 1, 0)
}

function diffInDays(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((b.getTime() - a.getTime()) / msPerDay)
}

export function buildEndOfMonthCurve(
  curva: ParsedCurvaData[] | null | undefined,
  spot: number | null,
  today: Date = new Date(),
): EndOfMonthRow[] {
  if (!curva || curva.length === 0 || spot === null || Number.isNaN(spot)) return []

  const points = normalizeCurvePoints(curva)
  if (points.length === 0) return []

  const maxDays = points[points.length - 1].days + MAX_EXTRAPOLATION_DAYS
  const rows: EndOfMonthRow[] = []

  let cursorYear = today.getFullYear()
  let cursorMonth = today.getMonth()

  while (true) {
    const eom = lastCalendarDayOfMonth(cursorYear, cursorMonth)
    const days = diffInDays(today, eom)

    if (days > maxDays) break

    if (days >= 1) {
      const taxa = interpolateRate(points, spot, days)
      rows.push({
        date: formatDateBR(eom),
        dateKey: eom.toISOString().slice(0, 10),
        daysFromToday: days,
        taxa,
        diff: taxa - spot,
      })
    }

    cursorMonth += 1
    if (cursorMonth > 11) {
      cursorMonth = 0
      cursorYear += 1
    }
  }

  return rows
}
