"use client"

import { Card, CardContent } from "@/components/ui/card"
import { parseMarketData, parseCurvaData } from "@/utils/parseMarketData"
import { useMarketData } from "@/hooks/useMarketData"
import { PTAXChart } from "@/components/PTAXChart"
import { LoadingScreen } from "@/components/LoadingScreen"
import { LoadingIndicator } from "@/components/LoadingIndicator"
import { ProgressIndicator } from "@/components/ProgressIndicator"
import { ConnectionStatus } from "@/components/ConnectionStatus"
import { useEffect, useState, useRef, useMemo, useDeferredValue, useCallback } from "react"
import { useScrollPreservation } from "@/hooks/useScrollPreservation"
import { ExchangeRates } from "@/components/ExchangeRates"
import { TableFilter } from "@/components/TableFilter"
import { DraggableTables } from "@/components/DraggableTables"
import React from "react"
import { MarketDataTable } from "@/components/MarketDataTable"
import { parseB3Data } from "@/utils/parseB3Data"
import { CBOTDataTables } from "@/components/CBOTDataTables"

export default function Dashboard() {
  const { data: marketData, error, isLoading, initialDataFetched, marketStatus, isPageVisible } = useMarketData()
  const { preserveScroll, isUserScrolling } = useScrollPreservation()

  const [parsedSoybeanData, setParsedSoybeanData] = useState([])
  const [parsedCornData, setParsedCornData] = useState([])
  const [parsedCurvaData, setParsedCurvaData] = useState([])
  const [parsedMealData, setParsedMealData] = useState([])
  const [parsedOilData, setParsedOilData] = useState([])
  const [parsedWheatData, setParsedWheatData] = useState([])
  // Adicione o estado para os dados da B3
  const [parsedB3Data, setParsedB3Data] = useState([])
  // Adicione "bmf" na lista de tabelas visíveis por padrão
  const [visibleTables, setVisibleTables] = useState<string[]>(["soybean", "corn", "meal", "oil", "bmf", "dollar"])
  const [tableLayout, setTableLayout] = useState<"horizontal" | "vertical">("vertical")

  // Usar refs para manter referência aos dados anteriores
  const prevMarketDataRef = useRef(null)
  const processingDataRef = useRef(false)

  // Modificar o componente Dashboard para reduzir re-renderizações

  // Adicionar useMemo para os dados processados
  const processedData = useMemo(() => {
    if (!marketData)
      return {
        soybeanData: [],
        cornData: [],
        wheatData: [],
        mealData: [],
        oilData: [],
        b3Data: [],
        curvaData: [],
      }

    // Processar os dados apenas quando marketData mudar
    const soybeanData = []
    const cornData = []
    const wheatData = []
    const mealData = []
    const oilData = []
    const b3Data = []
    const curvaData = []

    try {
      // Process Soybean data
      for (const key in marketData) {
        if (key.includes("ZS")) {
          try {
            const parsed = parseMarketData(marketData[key])
            soybeanData.push(parsed)
          } catch (error) {
            console.error(`Error parsing Soybean data for key ${key}:`, error)
          }
        }
      }

      // Process Corn data
      for (const key in marketData) {
        if (key.includes("ZC")) {
          try {
            const parsed = parseMarketData(marketData[key])
            cornData.push(parsed)
          } catch (error) {
            console.error(`Error parsing Corn data for key ${key}:`, error)
          }
        }
      }

      // Process Wheat data
      for (const key in marketData) {
        if (key.includes("ZW")) {
          try {
            const parsed = parseMarketData(marketData[key])
            wheatData.push(parsed)
          } catch (error) {
            console.error(`Error parsing Wheat data for key ${key}:`, error)
          }
        }
      }

      // Process Soybean Meal data (ZM)
      for (const key in marketData) {
        if (key.includes("ZM")) {
          try {
            const parsed = parseMarketData(marketData[key])
            mealData.push(parsed)
          } catch (error) {
            console.error(`Error parsing Meal data for key ${key}:`, error)
          }
        }
      }

      // Process Soybean Oil data (ZL)
      for (const key in marketData) {
        if (key.includes("ZL")) {
          try {
            const parsed = parseMarketData(marketData[key])
            oilData.push(parsed)
          } catch (error) {
            console.error(`Error parsing Oil data for key ${key}:`, error)
          }
        }
      }

      // Process B3 data
      for (const key in marketData) {
        if (key.includes("b3:")) {
          try {
            const parsed = parseB3Data(marketData[key])
            b3Data.push(parsed)
          } catch (error) {
            console.error(`Error parsing B3 data for key ${key}:`, error)
          }
        }
      }

      // Process Curva data
      for (const key in marketData) {
        if (key.includes("CURVA DE DOLAR")) {
          try {
            const parsed = parseCurvaData(marketData[key])
            curvaData.push(parsed)
          } catch (error) {
            console.error(`Error parsing Curva data for key ${key}:`, error)
          }
        }
      }
    } catch (error) {
      console.error("Error processing market data:", error)
    }

    return {
      soybeanData: soybeanData.filter(item => item.diasAteVencimento >= 0).sort((a, b) => a.diasAteVencimento - b.diasAteVencimento),
      cornData: cornData.filter(item => item.diasAteVencimento >= 0).sort((a, b) => a.diasAteVencimento - b.diasAteVencimento),
      wheatData: wheatData.filter(item => item.diasAteVencimento >= 0).sort((a, b) => a.diasAteVencimento - b.diasAteVencimento),
      mealData: mealData.filter(item => item.diasAteVencimento >= 0).sort((a, b) => a.diasAteVencimento - b.diasAteVencimento),
      oilData: oilData.filter(item => item.diasAteVencimento >= 0).sort((a, b) => a.diasAteVencimento - b.diasAteVencimento),
      b3Data: b3Data.filter(item => item.diasAteVencimento >= 0).sort((a, b) => a.diasAteVencimento - b.diasAteVencimento),
      curvaData,
    }
  }, [marketData])

  // Substituir o useEffect de processamento de dados pelo useMemo acima
  // Remover o useEffect que começa com:
  // useEffect(() => {
  //   if (marketData && !processingDataRef.current) {
  //     ...
  //   }
  // }, [marketData]);

  // Atualizar os estados com os dados processados de forma mais estável
  const updateDataWithScrollPreservation = useCallback(() => {
    if (processedData && !isUserScrolling()) {
      // Só preservar scroll se mudanças forem significativas
      const hasSignificantChanges = (
        JSON.stringify(processedData.soybeanData) !== JSON.stringify(parsedSoybeanData) ||
        JSON.stringify(processedData.cornData) !== JSON.stringify(parsedCornData) ||
        JSON.stringify(processedData.b3Data) !== JSON.stringify(parsedB3Data)
      )
      
      if (hasSignificantChanges) {
        setParsedSoybeanData(processedData.soybeanData)
        setParsedCornData(processedData.cornData)
        setParsedWheatData(processedData.wheatData)
        setParsedMealData(processedData.mealData)
        setParsedOilData(processedData.oilData)
        setParsedB3Data(processedData.b3Data)
        setParsedCurvaData(processedData.curvaData)
      }
    }
  }, [processedData, isUserScrolling, parsedSoybeanData, parsedCornData, parsedB3Data])

  useEffect(() => {
    const timeoutId = setTimeout(updateDataWithScrollPreservation, 100)
    return () => clearTimeout(timeoutId)
  }, [updateDataWithScrollPreservation])

  // Modificar a função para usar useDeferredValue para suavizar as atualizações
  // Adicionar useDeferredValue após a declaração dos estados
  const deferredSoybeanData = useDeferredValue(parsedSoybeanData)
  const deferredCornData = useDeferredValue(parsedCornData)
  const deferredWheatData = useDeferredValue(parsedWheatData)
  const deferredMealData = useDeferredValue(parsedMealData)
  const deferredOilData = useDeferredValue(parsedOilData)
  // Adicione o useDeferredValue para os dados da B3
  const deferredB3Data = useDeferredValue(parsedB3Data)
  const deferredCurvaData = useDeferredValue(parsedCurvaData)

  // Componentes memoizados para evitar re-renderizações desnecessárias
  const MemoizedDraggableTables = React.memo(DraggableTables)
  const MemoizedExchangeRates = React.memo(ExchangeRates)
  const MemoizedConnectionStatus = React.memo(ConnectionStatus)

  useEffect(() => {
    // Verificar se há um layout salvo no localStorage
    const savedLayout = localStorage.getItem("tableLayout")
    if (!savedLayout) {
      // Se não houver layout salvo, definir o layout padrão como vertical
      console.log("Inicializando layout padrão como vertical")
      setTableLayout("vertical")
    } else {
      // Se houver layout salvo, verificar se há tabelas em layout horizontal
      try {
        const parsedLayout = JSON.parse(savedLayout)
        const hasHorizontalLayout = parsedLayout.some((table: any) => table.layout === "horizontal")

        // Definir o layout com base no que foi encontrado
        setTableLayout(hasHorizontalLayout ? "horizontal" : "vertical")
        console.log("Layout inicializado a partir do localStorage:", hasHorizontalLayout ? "horizontal" : "vertical")
      } catch (e) {
        console.error("Erro ao analisar layout salvo:", e)
        setTableLayout("vertical")
      }
    }
  }, [])

  useEffect(() => {
    if (!isPageVisible) {
      console.log("Página não está visível. Pausando atualizações em tempo real.")
    }
  }, [isPageVisible])

  // Mostrar loading apenas se nunca carregou dados
  if (!initialDataFetched && !marketData && !error) {
    return (
      <>
        <LoadingScreen />
        <ProgressIndicator 
          isVisible={isLoading} 
          message="Carregando dados de mercado em tempo real..."
        />
      </>
    )
  }

  // Se há erro mas nunca carregou dados, mostrar erro
  if (error && !marketData && !initialDataFetched) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-red-500 text-xl mb-4">Erro ao carregar dados</h2>
          <p className="text-gray-400 mb-4">{error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  if (!isPageVisible) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-white">Atualizações em tempo real pausadas. Reabra a página para continuar.</p>
      </div>
    )
  }

  if (error && !marketData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-2 sm:p-4">
          <Card className="w-full">
            <CardContent>
              <div className="flex flex-col items-center justify-center h-40 gap-4">
                <div className="text-red-600 text-center">Error: {error.message}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Usar apenas marketData para determinar se deve mostrar loading inicial
  // Remover esta condição já que é redundante com a anterior

  return (
    <div className="min-h-screen bg-background stable-layout interface-glow">
      <LoadingIndicator isLoading={isLoading && initialDataFetched} message="Atualizando dados" />
      <MemoizedConnectionStatus 
        isLoading={isLoading} 
        error={error} 
        lastUpdate={marketData ? new Date().toISOString() : undefined}
      />
      {marketStatus.status === "open" ? (
        <div className="bg-green-800 text-white p-2 text-center">Mercado aberto - Sessão {marketStatus.session}</div>
      ) : (
        <div className="bg-yellow-800 text-white p-2 text-center">
          {marketStatus.status === "weekend"
            ? "Mercado fechado (fim de semana)"
            : "Mercado fechado (fora do horário de negociação)"}
        </div>
      )}
      <main className="p-2 sm:p-4">
        <TableFilter
          onChange={setVisibleTables}
          onLayoutChange={(layout) => {
            console.log("Layout changed in Dashboard to:", layout)
            setTableLayout((prevLayout) => {
              console.log("Changing layout from", prevLayout, "to", layout)
              return layout
            })
          }}
        />

        {/* Novo layout com dois containers lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <Card className="w-full bg-background">
              <CardContent className="p-2 sm:p-4">
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-4">Dados CBOT</h2>
                <MemoizedDraggableTables
                  soybeanData={deferredSoybeanData}
                  cornData={deferredCornData}
                  wheatData={deferredWheatData}
                  mealData={deferredMealData}
                  oilData={deferredOilData}
                  b3Data={deferredB3Data} // Adicionar os dados da B3
                  dollarData={[]} // Não mostrar dados do dólar aqui
                  visibleTables={visibleTables.filter((t) => t !== "dollar" && t !== "bmf")} // Remover bmf também
                  defaultLayout={tableLayout}
                  key={`cbot-tables-${tableLayout}-${visibleTables.filter((t) => t !== "dollar" && t !== "bmf").join("-")}`}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="w-full bg-background">
              <CardContent className="p-2 sm:p-4">
                {/* Título e ExchangeRates */}
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-4">Taxas de Câmbio</h2>
                <MemoizedExchangeRates data={marketData || {}} />

                {/* Tabela BM&F */}
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-4">MILHO BM&F</h2>
                {visibleTables.includes("bmf") && (
                  <>
                    {deferredB3Data.length > 0 ? (
                      <CBOTDataTables data={deferredB3Data} title="MILHO BM&F" />
                    ) : (
                      <div className="text-center text-gray-400 p-4 mb-4">
                        {!visibleTables.includes("bmf") ? "BM&F está filtrada" : "Carregando dados..."}
                      </div>
                    )}
                  </>
                )}

                {/* Tabela Curva do Dólar */}
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-4 mt-6">Curva do Dólar</h2>
                {visibleTables.includes("dollar") && deferredCurvaData.length > 0 ? (
                  <MarketDataTable data={deferredCurvaData} title="CURVA DE DÓLAR" />
                ) : (
                  <div className="text-center text-gray-400 p-4">
                    {!visibleTables.includes("dollar") ? "Curva do Dólar está filtrada" : "Carregando dados..."}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-4 sm:mt-8">
          <PTAXChart />
        </div>
      </main>
    </div>
  )
}

