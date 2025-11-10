"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calculator, ArrowLeftRight, TrendingUp, DollarSign, Calendar, Zap, X, Package, TrendingDown, Info, HelpCircle } from "lucide-react"
import type { ParsedCurvaData, ParsedMarketData } from "@/types/market-data"
import { extractDaysFromCurva } from "@/utils/dateUtils"

interface FinancialCalculatorModalProps {
  curvaData: ParsedCurvaData[]
  cbotData: {
    soybean: ParsedMarketData[]
    corn: ParsedMarketData[]
  }
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  modalState: any
  updateModalState: (updates: any) => void
}

export function FinancialCalculatorModal({
  curvaData,
  cbotData,
  isOpen,
  onOpenChange,
  modalState,
  updateModalState
}: FinancialCalculatorModalProps) {
  const [activeTab, setActiveTab] = useState<"exchange" | "grain">("exchange")

  // Estados para conversor de câmbio
  const [exchangeAmount, setExchangeAmount] = useState("")
  const [selectedCurva, setSelectedCurva] = useState("")
  const [exchangeDirection, setExchangeDirection] = useState<"usd-to-brl" | "brl-to-usd">("usd-to-brl")
  const [exchangeResult, setExchangeResult] = useState<number | null>(null)

  // Estados para consulta por data
  const [targetDate, setTargetDate] = useState("")
  const [dateResult, setDateResult] = useState<{curva: string, taxa: number, dias: number, taxaInterpolada?: number} | null>(null)
  const [showInfo, setShowInfo] = useState(false)

  // Estados para calculadora de grãos
  const [grainType, setGrainType] = useState<"soybean" | "corn">("soybean")
  const [selectedContract, setSelectedContract] = useState("")
  const [volume, setVolume] = useState("") // em sacas
  const [premium, setPremium] = useState("0") // prêmio em USD/bushel
  const [freight, setFreight] = useState("") // frete em R$/saca
  const [grainResult, setGrainResult] = useState<{
    cbotPrice: number
    exchangeRate: number
    pricePerBushel: number
    pricePerSack: number
    freightCost: number
    netPrice: number
    totalRevenue: number
    totalFreight: number
  } | null>(null)

  // Ordenar curvas por dias
  const sortedCurvaData = useMemo(() => {
    return [...curvaData].sort((a, b) => {
      const getDays = (curva: string) => {
        const match = curva.match(/(\d+)D/i)
        return match ? Number.parseInt(match[1], 10) : 0
      }
      return getDays(a.curva) - getDays(b.curva)
    })
  }, [curvaData])

  // Obter dados CBOT filtrados
  const currentCBOTData = useMemo(() => {
    return grainType === "soybean" ? cbotData.soybean : cbotData.corn
  }, [grainType, cbotData])

  // Conversão: 1 saca = 60kg, 1 bushel = 27.216 kg para soja
  const BUSHEL_TO_KG = 27.216
  const SACK_KG = 60
  const BUSHELS_PER_SACK = SACK_KG / BUSHEL_TO_KG // ~2.204

  // Calcular conversão de câmbio
  const calculateExchange = () => {
    if (!exchangeAmount || !selectedCurva || isNaN(Number(exchangeAmount))) {
      setExchangeResult(null)
      return
    }

    const selectedCurvaData = curvaData.find(item => item.curva === selectedCurva)
    if (!selectedCurvaData || !selectedCurvaData.taxa) {
      setExchangeResult(null)
      return
    }

    const amountNum = Number(exchangeAmount)
    const taxa = selectedCurvaData.taxa

    const converted = exchangeDirection === "usd-to-brl"
      ? amountNum * taxa
      : amountNum / taxa

    setExchangeResult(converted)
  }

  // Calcular resultado de grãos
  const calculateGrainResult = () => {
    if (!selectedContract || !volume || !targetDate || !freight) {
      setGrainResult(null)
      return
    }

    const contract = currentCBOTData.find(c => c.symbol === selectedContract)

    if (!contract || !contract.ultimoPreco) {
      setGrainResult(null)
      return
    }

    // Se não tiver dateResult, buscar agora
    if (!dateResult) {
      findCurveByDate()
      return
    }

    // CBOT vem em cents, converter para dólares
    const cbotPriceCents = contract.ultimoPreco
    const cbotPrice = cbotPriceCents / 100 // USD/bushel
    const premiumValue = Number(premium) || 0 // USD/bushel

    // Usar taxa interpolada se disponível, senão usar taxa da curva
    const exchangeRate = dateResult.taxaInterpolada || dateResult.taxa // BRL/USD

    const volumeSacks = Number(volume)
    const freightPerTon = Number(freight) // R$/tonelada

    // Converter frete de R$/tonelada para R$/saca
    // 1 tonelada = 1000kg, 1 saca = 60kg
    const SACKS_PER_TON = 1000 / SACK_KG // 16.67 sacas/tonelada
    const freightCost = freightPerTon / SACKS_PER_TON // R$/saca

    // Preço FOB por bushel (CBOT + Prêmio)
    const fobPriceBushel = cbotPrice + premiumValue

    // Preço por saca em BRL antes do frete
    const pricePerSack = fobPriceBushel * BUSHELS_PER_SACK * exchangeRate

    // Preço líquido por saca (descontando frete)
    const netPrice = pricePerSack - freightCost

    // Receita total
    const totalRevenue = netPrice * volumeSacks

    // Frete total
    const totalFreight = freightCost * volumeSacks

    setGrainResult({
      cbotPrice,
      exchangeRate,
      pricePerBushel: fobPriceBushel,
      pricePerSack,
      freightCost,
      netPrice,
      totalRevenue,
      totalFreight
    })
  }

  // Buscar curva por data com interpolação linear
  const findCurveByDate = () => {
    if (!targetDate) {
      setDateResult(null)
      return
    }

    const today = new Date()
    const target = new Date(targetDate)
    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      setDateResult(null)
      return
    }

    // Ordenar curvas por dias
    const sortedCurvas = [...curvaData].sort((a, b) => {
      return extractDaysFromCurva(a.curva) - extractDaysFromCurva(b.curva)
    })

    // Encontrar curvas antes e depois da data alvo
    let curvaBefore = null
    let curvaAfter = null

    for (let i = 0; i < sortedCurvas.length; i++) {
      const curvaDays = extractDaysFromCurva(sortedCurvas[i].curva)

      if (curvaDays <= diffDays) {
        curvaBefore = sortedCurvas[i]
      }

      if (curvaDays >= diffDays && !curvaAfter) {
        curvaAfter = sortedCurvas[i]
        break
      }
    }

    // Se não encontrou curva antes, usar a primeira
    if (!curvaBefore) curvaBefore = sortedCurvas[0]
    // Se não encontrou curva depois, usar a última
    if (!curvaAfter) curvaAfter = sortedCurvas[sortedCurvas.length - 1]

    const daysBefore = extractDaysFromCurva(curvaBefore.curva)
    const daysAfter = extractDaysFromCurva(curvaAfter.curva)
    const taxaBefore = curvaBefore.taxa || 0
    const taxaAfter = curvaAfter.taxa || 0

    // Interpolação linear: taxa = taxaBefore + (taxaAfter - taxaBefore) * (diffDays - daysBefore) / (daysAfter - daysBefore)
    let taxaInterpolada = taxaBefore

    if (daysBefore !== daysAfter) {
      const ratio = (diffDays - daysBefore) / (daysAfter - daysBefore)
      taxaInterpolada = taxaBefore + (taxaAfter - taxaBefore) * ratio
    }

    // Encontrar curva mais próxima para exibição
    let bestMatch = curvaBefore
    let bestDiff = Math.abs(diffDays - daysBefore)

    sortedCurvas.forEach(item => {
      const curvaDays = extractDaysFromCurva(item.curva)
      const diff = Math.abs(diffDays - curvaDays)
      if (diff < bestDiff) {
        bestDiff = diff
        bestMatch = item
      }
    })

    if (bestMatch?.taxa) {
      setDateResult({
        curva: bestMatch.curva,
        taxa: bestMatch.taxa,
        dias: diffDays,
        taxaInterpolada: taxaInterpolada
      })
      // Auto-selecionar curva para cálculos
      setSelectedCurva(bestMatch.curva)
    }
  }

  // Auto-buscar curva quando data muda
  useEffect(() => {
    if (targetDate && curvaData.length > 0 && activeTab === "grain") {
      findCurveByDate()
    }
  }, [targetDate, curvaData, activeTab])

  // Reset ao trocar de aba
  useEffect(() => {
    setExchangeResult(null)
    setGrainResult(null)
  }, [activeTab])

  // Auto-preencher data 30 dias após vencimento do contrato
  useEffect(() => {
    if (selectedContract && activeTab === "grain") {
      const contract = currentCBOTData.find(c => c.symbol === selectedContract)
      if (contract && contract.vencimento) {
        try {
          // Parse vencimento (formato: "15/03/2026" ou "MAR/2026")
          let vencimentoDate: Date

          if (contract.vencimento.includes('/')) {
            const parts = contract.vencimento.split('/')
            if (parts.length === 3) {
              // Formato: "15/03/2026"
              const [day, month, year] = parts
              vencimentoDate = new Date(Number(year), Number(month) - 1, Number(day))
            } else if (parts.length === 2) {
              // Formato: "MAR/2026"
              const [monthStr, year] = parts
              const monthMap: { [key: string]: number } = {
                'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAI': 4, 'JUN': 5,
                'JUL': 6, 'AUG': 7, 'SET': 8, 'OUT': 9, 'NOV': 10, 'DEZ': 11
              }
              const month = monthMap[monthStr.toUpperCase()] ?? 0
              // Usar dia 15 como padrão
              vencimentoDate = new Date(Number(year), month, 15)
            } else {
              return
            }
          } else {
            return
          }

          // Verificar se a data é válida
          if (isNaN(vencimentoDate.getTime())) {
            return
          }

          // Adicionar 30 dias
          const paymentDate = new Date(vencimentoDate)
          paymentDate.setDate(paymentDate.getDate() + 30)

          // Formatar para input date (YYYY-MM-DD)
          const formattedDate = paymentDate.toISOString().split('T')[0]
          setTargetDate(formattedDate)
        } catch (error) {
          console.error('Erro ao parsear data de vencimento:', error)
        }
      }
    }
  }, [selectedContract, activeTab, currentCBOTData])

  // Formatar valores
  const formatCurrency = (value: number, currency: "BRL" | "USD") => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const formatNumber = (value: number, decimals = 2) => {
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  // Data mínima e máxima
  const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const maxDate = new Date(Date.now() + 600 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Verificar se pode calcular
  const canCalculateGrain = useMemo(() => {
    const result = Boolean(
      selectedContract &&
      volume &&
      targetDate &&
      freight &&
      dateResult
    )
    console.log('canCalculateGrain:', {
      selectedContract,
      volume,
      targetDate,
      freight,
      dateResult: dateResult ? 'exists' : 'null',
      result
    })
    return result
  }, [selectedContract, volume, targetDate, freight, dateResult])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto bg-yellow-600/10 border-yellow-600/30 text-yellow-400 hover:bg-yellow-600/20 hover:border-yellow-600/50"
        >
          <Calculator className="w-4 h-4 mr-2" />
          Calculadora Financeira
        </Button>
      </DialogTrigger>
      <DialogContent
        className="w-[95vw] max-w-2xl bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto [&>[data-radix-dialog-close]]:hidden"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white relative">
            <Calculator className="w-5 h-5 text-yellow-400" />
            Calculadora Financeira
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInfo(!showInfo)}
              className="ml-auto w-8 h-8 p-0 hover:bg-slate-800 text-blue-400 hover:text-blue-300"
              title="Informações sobre os cálculos"
            >
              <Info className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Modal de Informações */}
        {showInfo && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-blue-300 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Como funciona o cálculo
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInfo(false)}
                className="w-6 h-6 p-0 hover:bg-slate-800 text-gray-400"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>

            <div className="space-y-2 text-xs text-blue-100">
              <div>
                <strong className="text-blue-300">Aba Câmbio:</strong>
                <p className="mt-1">• Converte valores entre USD e BRL usando a curva do dólar futuro</p>
                <p>• Selecione a data da venda e o sistema encontra automaticamente a taxa correspondente</p>
              </div>

              <div>
                <strong className="text-blue-300">Aba Resultado Grãos:</strong>
                <p className="mt-1">• <strong>Fórmula:</strong> Preço Líquido = (CBOT + Prêmio) × 2.204 bu/sc × Câmbio - Frete</p>
                <p>• <strong>CBOT:</strong> Cotação da Bolsa de Chicago (USD/bushel)</p>
                <p>• <strong>Prêmio:</strong> Diferencial de mercado físico (positivo ou negativo)</p>
                <p>• <strong>Câmbio:</strong> Taxa de conversão BRL/USD na data da venda</p>
                <p>• <strong>Frete:</strong> Custo logístico até o porto (R$/tonelada, convertido para R$/saca)</p>
                <p>• <strong>2.204 bushels/saca:</strong> Conversão de unidade (1 saca = 60kg)</p>
              </div>

              <div>
                <strong className="text-blue-300">Taxa Interpolada:</strong>
                <p className="mt-1">• Calculamos a taxa diária exata usando interpolação linear entre as curvas</p>
                <p>• Exemplo: Se você vende em 45 dias, calculamos o valor entre as curvas 30D e 60D</p>
                <p>• Isso proporciona maior precisão nos cálculos financeiros</p>
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 mb-4">
            <TabsTrigger
              value="exchange"
              className="data-[state=active]:bg-yellow-600 data-[state=active]:text-black"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Câmbio
            </TabsTrigger>
            <TabsTrigger
              value="grain"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-black"
            >
              <Package className="w-4 h-4 mr-2" />
              Resultado Grãos
            </TabsTrigger>
          </TabsList>

          {/* ABA CÂMBIO */}
          <TabsContent value="exchange" className="space-y-4">
            {/* Consulta por data */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-300 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data da Venda
              </h4>
              <div className="space-y-2">
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  min={minDate}
                  max={maxDate}
                  className="bg-slate-800 border-slate-600 text-white focus:border-yellow-400
                    [&::-webkit-calendar-picker-indicator]:filter
                    [&::-webkit-calendar-picker-indicator]:invert
                    [&::-webkit-calendar-picker-indicator]:opacity-70"
                />
              </div>

              {dateResult && (
                <div className="mt-3 space-y-2">
                  {/* Taxa Interpolada em Destaque */}
                  {dateResult.taxaInterpolada && dateResult.taxaInterpolada !== dateResult.taxa && (
                    <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 p-3 rounded-lg border border-green-500/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-300 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Taxa Interpolada (dia exato)
                        </span>
                        <span className="text-green-400 font-mono font-bold text-lg">
                          {formatNumber(dateResult.taxaInterpolada, 4)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-slate-800/50 p-2 rounded">
                      <div className="text-gray-400 text-xs">Taxa Curva</div>
                      <div className="text-yellow-400 font-mono">{formatNumber(dateResult.taxa, 4)}</div>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <div className="text-gray-400 text-xs">Curva</div>
                      <div className="text-yellow-400 font-mono text-xs">{dateResult.curva.replace(/CURVA\s*DE\s*DOLAR\s*/i, "")}</div>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <div className="text-gray-400 text-xs">Dias</div>
                      <div className="text-blue-400 font-mono">{dateResult.dias}d</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Conversor simples */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">
                    {exchangeDirection === "usd-to-brl" ? "Valor USD" : "Valor BRL"}
                  </label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={exchangeAmount}
                    onChange={(e) => setExchangeAmount(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white focus:border-yellow-400"
                    step="0.01"
                  />
                </div>
                <Button
                  onClick={() => setExchangeDirection(exchangeDirection === "usd-to-brl" ? "brl-to-usd" : "usd-to-brl")}
                  variant="outline"
                  size="sm"
                  className="mt-5 bg-slate-700 border-slate-600 hover:bg-slate-600"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">
                    {exchangeDirection === "usd-to-brl" ? "Resultado BRL" : "Resultado USD"}
                  </label>
                  <Input
                    value={exchangeResult !== null ? formatNumber(exchangeResult, 2) : ""}
                    readOnly
                    placeholder="0.00"
                    className="bg-slate-700 border-slate-600 text-green-400 font-mono"
                  />
                </div>
              </div>

              <Button
                onClick={calculateExchange}
                disabled={!exchangeAmount || !selectedCurva}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-semibold"
              >
                Converter
              </Button>
            </div>
          </TabsContent>

          {/* ABA RESULTADO GRÃOS */}
          <TabsContent value="grain" className="space-y-4">
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-300 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Calculadora de Resultado Financeiro
              </h4>
              <p className="text-xs text-green-200">
                Calcule o resultado líquido da sua venda considerando CBOT, prêmio, câmbio e frete.
              </p>
            </div>

            {/* Seleção de grão */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300">Grão</label>
                <Select value={grainType} onValueChange={(v: any) => setGrainType(v)}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="soybean" className="text-white">Soja</SelectItem>
                    <SelectItem value="corn" className="text-white">Milho</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300">Contrato CBOT</label>
                <Select value={selectedContract} onValueChange={setSelectedContract}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600 max-h-48">
                    {currentCBOTData.map((item) => (
                      <SelectItem key={item.symbol} value={item.symbol} className="text-white">
                        <div className="flex justify-between items-center w-full gap-2">
                          <span>{item.symbol}</span>
                          <span className="text-yellow-400 text-xs">${formatNumber(item.ultimoPreco || 0, 2)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Data e curva */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Data da Venda</label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                min={minDate}
                max={maxDate}
                className="bg-slate-800 border-slate-600 text-white focus:border-yellow-400
                  [&::-webkit-calendar-picker-indicator]:filter
                  [&::-webkit-calendar-picker-indicator]:invert"
              />
              {dateResult && (
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <span>Taxa: <span className="text-green-400 font-mono">{formatNumber(dateResult.taxa, 4)}</span></span>
                  <span>•</span>
                  <span>Curva: <span className="text-yellow-400">{dateResult.curva.replace(/CURVA\s*DE\s*DOLAR\s*/i, "")}</span></span>
                </div>
              )}
            </div>

            {/* Volume, Prêmio, Frete */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300">Volume (sacas)</label>
                <Input
                  type="number"
                  placeholder="Ex: 1000"
                  value={volume}
                  onChange={(e) => {
                    console.log('Volume onChange:', e.target.value)
                    setVolume(e.target.value)
                  }}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300">Prêmio ($/bu)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={premium}
                  onChange={(e) => setPremium(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300">Frete (R$/ton)</label>
                <Input
                  type="number"
                  placeholder="Ex: 250.00"
                  value={freight}
                  onChange={(e) => setFreight(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-gray-500"
                  step="0.01"
                />
                <p className="text-[10px] text-gray-500">Valor típico: R$ 150-500/tonelada</p>
              </div>
            </div>

            <Button
              onClick={calculateGrainResult}
              disabled={!canCalculateGrain}
              className="w-full bg-green-600 hover:bg-green-700 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Calcular Resultado
            </Button>

            {/* Resultado Detalhado */}
            {grainResult && (
              <div className="space-y-3">
                {/* Aviso de Prejuízo */}
                {grainResult.netPrice < 0 && (
                  <div className="bg-red-900/30 border-2 border-red-500/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400 text-sm font-semibold mb-1">
                      <span>⚠️</span>
                      <span>ATENÇÃO: Operação com Prejuízo!</span>
                    </div>
                    <p className="text-xs text-red-300">
                      O custo do frete (R$ {formatNumber(grainResult.freightCost, 2)}/saca) é maior que o preço bruto
                      (R$ {formatNumber(grainResult.pricePerSack, 2)}/saca).
                      Revise os valores ou considere reduzir o custo logístico.
                    </p>
                  </div>
                )}

                {/* Receita Líquida Total */}
                <div className={`${grainResult.netPrice >= 0 ? 'bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-green-500/50' : 'bg-gradient-to-r from-red-900/40 to-red-800/40 border-red-500/50'} p-4 rounded-lg border-2`}>
                  <div className="text-center">
                    <div className={`text-sm font-semibold mb-1 ${grainResult.netPrice >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {grainResult.netPrice >= 0 ? '💰 Receita Líquida Total' : '⚠️ Prejuízo Total'}
                    </div>
                    <div className={`text-3xl font-bold ${grainResult.netPrice >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(grainResult.totalRevenue, "BRL")}
                    </div>
                    <div className={`text-xs mt-1 ${grainResult.netPrice >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                      {volume} sacas × {formatCurrency(grainResult.netPrice, "BRL")}/saca
                    </div>
                  </div>
                </div>

                {/* Breakdown de Preços */}
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-600">
                  <h4 className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Composição do Preço
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">CBOT (Bolsa Chicago)</span>
                      <span className="text-yellow-400 font-mono">${formatNumber(grainResult.cbotPrice, 2)}/bu</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">+ Prêmio</span>
                      <span className="text-blue-400 font-mono">${formatNumber(Number(premium), 2)}/bu</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-700">
                      <span className="text-gray-400 font-semibold">= FOB por Bushel</span>
                      <span className="text-yellow-300 font-mono font-bold">${formatNumber(grainResult.pricePerBushel, 2)}/bu</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">× Câmbio {dateResult?.taxaInterpolada && dateResult.taxaInterpolada !== dateResult.taxa ? '★' : ''}</span>
                      <span className="text-blue-400 font-mono">{formatNumber(grainResult.exchangeRate, 4)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">× 2.204 bushels/saca</span>
                      <span className="text-gray-500 font-mono">conversão</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-700">
                      <span className="text-gray-400 font-semibold">= Preço Bruto/Saca</span>
                      <span className="text-green-300 font-mono font-bold">{formatCurrency(grainResult.pricePerSack, "BRL")}</span>
                    </div>
                  </div>
                </div>

                {/* Custos e Resultado Final */}
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-600">
                  <h4 className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Custos e Líquido
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Preço Bruto/Saca</span>
                      <span className="text-green-400 font-mono">{formatCurrency(grainResult.pricePerSack, "BRL")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">- Frete/Saca</span>
                      <span className="text-red-400 font-mono">-{formatCurrency(grainResult.freightCost, "BRL")}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                      <span className="text-gray-300 font-bold">Preço Líquido/Saca</span>
                      <span className="text-green-400 font-mono font-bold text-base">{formatCurrency(grainResult.netPrice, "BRL")}</span>
                    </div>
                  </div>
                </div>

                {/* Totais Consolidados */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 p-3 rounded-lg border border-blue-500/30">
                    <div className="text-blue-300 font-semibold mb-1">Volume Total</div>
                    <div className="text-xl font-bold text-blue-400">{volume}</div>
                    <div className="text-blue-200 text-[10px]">sacas de {grainType === 'soybean' ? 'soja' : 'milho'}</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 p-3 rounded-lg border border-red-500/30">
                    <div className="text-red-300 font-semibold mb-1">Frete Total</div>
                    <div className="text-xl font-bold text-red-400">{formatCurrency(grainResult.totalFreight, "BRL")}</div>
                    <div className="text-red-200 text-[10px]">{formatCurrency(grainResult.freightCost, "BRL")}/saca</div>
                  </div>
                </div>

                {/* Nota sobre Taxa Interpolada */}
                {dateResult?.taxaInterpolada && dateResult.taxaInterpolada !== dateResult.taxa && (
                  <div className="text-[10px] text-center text-green-400 bg-green-900/20 p-2 rounded flex items-center justify-center gap-1">
                    <span>★</span>
                    <span>Taxa de câmbio interpolada para o dia exato ({dateResult.dias} dias) - maior precisão</span>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
