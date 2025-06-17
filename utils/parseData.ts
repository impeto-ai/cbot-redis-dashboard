import type { CBOTData } from "@/types/cbot"

export function parseMarketData(data: CBOTData) {
  const getValue = (code: string): string => {
    const valueObj = data.arrValues.find((item) => Object.keys(item)[0] === code)
    return valueObj ? Object.values(valueObj)[0] : ""
  }

  return {
    symbol: data.symbolId.symbol,
    lastPrice: getValue("03").replace("S", ""), // Remove 'S' suffix from price
    change: Number.parseFloat(getValue("01") || "0"), // Default to 0 if not found
    volume: Number.parseInt(getValue("19") || "0"), // Default to 0 if not found
    high: getValue("16"),
    low: getValue("17"),
    open: getValue("14"),
    close: getValue("15"),
    lastUpdate: new Date(data.lastUpdate).toLocaleString(),
    expirationDate: getValue("09"),
  }
}

