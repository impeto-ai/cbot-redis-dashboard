"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { parseMarketData, parseCurvaData } from "@/utils/parseMarketData"
import { MarketDataTable } from "@/components/MarketDataTable"
import { useMarketData } from "@/hooks/useMarketData"
import { PTAXChart } from "@/components/PTAXChart"
import { CBOTDataTables } from "@/components/CBOTDataTables"
import { Header } from "@/components/Header"

export default function Dashboard() {
  const { data: marketData, error, isLoading, refresh } = useMarketData()

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="p-4">
          <Card className="w-full">
            <CardContent>
              <div className="flex flex-col items-center justify-center h-40 gap-4">
                <div className="text-red-600">Error: {error.message}</div>
                <Button onClick={refresh} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (isLoading || !marketData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="p-4">
          <Card className="w-full">
            <CardContent>
              <div className="flex items-center justify-center h-40">Loading market data...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const parsedCBOTData = Object.entries(marketData)
    .filter(([key]) => key.includes("Z") || key.includes("S"))
    .map(([_, data]) => parseMarketData(data))

  const parsedCurvaData = Object.entries(marketData)
    .filter(([key]) => key.includes("CURVA DE DOLAR"))
    .map(([_, data]) => parseCurvaData(data))

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4">
        <Card className="w-full bg-background">
          <CardContent>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">Market Dashboard</h1>
              <Button onClick={refresh} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            <div className="space-y-8">
              <CBOTDataTables data={parsedCBOTData} />
              <MarketDataTable data={parsedCurvaData} title={`Dollar Curve Data (${parsedCurvaData.length} items)`} />
            </div>
          </CardContent>
        </Card>
        <div className="mt-8">
          <PTAXChart />
        </div>
      </main>
    </div>
  )
}

