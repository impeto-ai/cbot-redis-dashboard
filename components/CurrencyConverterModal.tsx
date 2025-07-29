"use client"

import React, { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calculator, ArrowLeftRight, TrendingUp, DollarSign, Calendar, Zap, X } from "lucide-react"
import type { ParsedCurvaData } from "@/types/market-data"
import { extractDaysFromCurva } from "@/utils/dateUtils"

interface CurrencyConverterModalProps {
  curvaData: ParsedCurvaData[]
}

export function CurrencyConverterModal({ curvaData }: CurrencyConverterModalProps) {
  const [amount, setAmount] = useState<string>("")
  const [selectedCurva, setSelectedCurva] = useState<string>("")
  const [conversionDirection, setConversionDirection] = useState<"brl-to-usd" | "usd-to-brl">("usd-to-brl")
  const [result, setResult] = useState<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<"convert" | "date">("convert")
  const [targetDate, setTargetDate] = useState<string>("")
  const [dateResult, setDateResult] = useState<{curva: string, taxa: number, dias: number} | null>(null)
  const [quickConvertAmount, setQuickConvertAmount] = useState<string>("")
  const [quickConvertResult, setQuickConvertResult] = useState<string>("")
  const [quickConversionDirection, setQuickConversionDirection] = useState<"usd-to-brl" | "brl-to-usd">("usd-to-brl")

  // Ordenar curvas por número de dias
  const sortedCurvaData = useMemo(() => {
    return [...curvaData].sort((a, b) => {
      const getDays = (curva: string) => {
        const match = curva.match(/(\d+)D/i)
        return match ? Number.parseInt(match[1], 10) : 0
      }
      return getDays(a.curva) - getDays(b.curva)
    })
  }, [curvaData])

  // Função para calcular conversão
  const calculateConversion = () => {
    if (!amount || !selectedCurva || isNaN(Number(amount))) {
      setResult(null)
      return
    }

    const selectedCurvaData = curvaData.find(item => item.curva === selectedCurva)
    if (!selectedCurvaData || !selectedCurvaData.taxa) {
      setResult(null)
      return
    }

    const amountNum = Number(amount)
    const taxa = selectedCurvaData.taxa

    let convertedAmount: number

    if (conversionDirection === "brl-to-usd") {
      // BRL para USD: dividir pelo câmbio
      convertedAmount = amountNum / taxa
    } else {
      // USD para BRL: multiplicar pelo câmbio
      convertedAmount = amountNum * taxa
    }

    setResult(convertedAmount)
  }

  // Resetar resultado quando inputs mudam
  React.useEffect(() => {
    setResult(null)
  }, [amount, selectedCurva, conversionDirection])

  // Função para alternar direção da conversão
  const toggleDirection = () => {
    setConversionDirection(prev => 
      prev === "brl-to-usd" ? "usd-to-brl" : "brl-to-usd"
    )
    setResult(null)
  }

  // Formatar resultado
  const formatResult = (value: number) => {
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })
  }

  // Obter taxa selecionada para exibir
  const selectedRate = useMemo(() => {
    const selectedCurvaData = curvaData.find(item => item.curva === selectedCurva)
    return selectedCurvaData?.taxa
  }, [curvaData, selectedCurva])

  // Função para buscar curva por data
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

    // Encontrar a curva mais próxima
    let bestMatch = curvaData[0]
    let bestDiff = Math.abs(diffDays - extractDaysFromCurva(bestMatch.curva))

    curvaData.forEach(item => {
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
        dias: diffDays
      })
    }
  }

  // Função para conversão rápida
  const handleQuickConvert = (inputValue: string) => {
    setQuickConvertAmount(inputValue)
    
    if (inputValue && dateResult && dateResult.taxa) {
      const amount = Number(inputValue)
      if (!isNaN(amount)) {
        let converted: number
        if (quickConversionDirection === "usd-to-brl") {
          // USD → BRL (multiplicar pela taxa)
          converted = amount * dateResult.taxa
        } else {
          // BRL → USD (dividir pela taxa)
          converted = amount / dateResult.taxa
        }
        setQuickConvertResult(converted.toLocaleString('pt-BR', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        }))
      } else {
        setQuickConvertResult("")
      }
    } else {
      setQuickConvertResult("")
    }
  }

  // Reset form quando modal fecha
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setAmount("")
      setSelectedCurva("")
      setResult(null)
      setTargetDate("")
      setDateResult(null)
      setQuickConvertAmount("")
      setQuickConvertResult("")
      setMode("convert")
    }
  }

  // Buscar curva automaticamente quando a data muda
  React.useEffect(() => {
    if (targetDate && mode === "date" && curvaData.length > 0) {
      const today = new Date()
      const target = new Date(targetDate)
      const diffTime = target.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays < 0) {
        setDateResult(null)
        setQuickConvertAmount("")
        setQuickConvertResult("")
        return
      }

      // Encontrar a curva mais próxima
      let bestMatch = curvaData[0]
      let bestDiff = Math.abs(diffDays - extractDaysFromCurva(bestMatch.curva))

      curvaData.forEach(item => {
        const curvaDays = extractDaysFromCurva(item.curva)
        const diff = Math.abs(diffDays - curvaDays)
        if (diff < bestDiff) {
          bestDiff = diff
          bestMatch = item
        }
             })

      setDateResult({
        curva: bestMatch.curva,
        taxa: bestMatch.taxa || 0,
        dias: diffDays
      })
      
      // Reset conversão rápida quando nova curva é selecionada
      setQuickConvertAmount("")
      setQuickConvertResult("")
    }
  }, [targetDate, mode, curvaData])

  // Recalcular quando direção da conversão rápida muda
  React.useEffect(() => {
    if (quickConvertAmount && dateResult) {
      handleQuickConvert(quickConvertAmount)
    }
  }, [quickConversionDirection])

  // Formatar data para input
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Data mínima (amanhã)
  const minDate = formatDateForInput(new Date(Date.now() + 24 * 60 * 60 * 1000))
  
  // Data máxima (600 dias no futuro, baseado na maior curva)
  const maxDate = formatDateForInput(new Date(Date.now() + 600 * 24 * 60 * 60 * 1000))

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto bg-yellow-600/10 border-yellow-600/30 text-yellow-400 hover:bg-yellow-600/20 hover:border-yellow-600/50"
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Conversor de Moeda
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto [&>[data-radix-dialog-close]]:hidden [&_[data-radix-dialog-close]]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="absolute -left-2 -top-1 w-8 h-8 p-0 hover:bg-slate-800 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
            <Calculator className="w-5 h-5 text-yellow-400 ml-8" />
            Consulta de Câmbio
            <TrendingUp className="w-4 h-4 text-green-400 ml-auto" />
          </DialogTitle>
        </DialogHeader>

        <Tabs 
          value={mode} 
          onValueChange={(value: any) => setMode(value)} 
          className="w-full relative"
        >
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 mb-4 relative z-10">
            <TabsTrigger 
              value="convert" 
              className="data-[state=active]:bg-yellow-600 data-[state=active]:text-black relative z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <Calculator className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Converter</span>
              <span className="sm:hidden">Convert</span>
            </TabsTrigger>
            <TabsTrigger 
              value="date" 
              className="data-[state=active]:bg-yellow-600 data-[state=active]:text-black relative z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <Calendar className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Por Data</span>
              <span className="sm:hidden">Data</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="convert" className="space-y-4 relative z-0 overflow-hidden">
          {/* Valor de entrada */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Valor ({conversionDirection === "brl-to-usd" ? "BRL" : "USD"})
            </label>
            <Input
              type="number"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white placeholder-gray-400 focus:border-yellow-400"
              step="0.01"
            />
          </div>

          {/* Seleção da curva */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Curva de Dólar
            </label>
            <Select value={selectedCurva} onValueChange={setSelectedCurva}>
              <SelectTrigger 
                className="bg-slate-800 border-slate-600 text-white focus:border-yellow-400"
                onClick={(e) => e.stopPropagation()}
              >
                <SelectValue placeholder="Selecione uma curva" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600 max-h-48 z-50">
                {sortedCurvaData.map((item) => (
                  <SelectItem 
                    key={item.curva} 
                    value={item.curva}
                    className="text-white hover:bg-slate-700 focus:bg-slate-700"
                  >
                    <div className="flex justify-between items-center w-full">
                      <span>{item.curva}</span>
                      <span className="text-yellow-400 ml-2 text-xs">
                        {item.taxa ? item.taxa.toFixed(4) : "-"}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Taxa selecionada */}
          {selectedRate && (
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-600">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Taxa:</span>
                <span className="text-yellow-400 font-mono">
                  {selectedRate.toFixed(4)}
                </span>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2">
            <Button
              onClick={toggleDirection}
              variant="outline"
              size="sm"
              className="flex-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              {conversionDirection === "brl-to-usd" ? "BRL → USD" : "USD → BRL"}
            </Button>
            
            <Button
              onClick={calculateConversion}
              disabled={!amount || !selectedCurva}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-black font-semibold"
            >
              Converter
            </Button>
          </div>

          {/* Resultado */}
          {result !== null && (
            <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 p-4 rounded-lg border border-green-500/30">
              <div className="text-center">
                <div className="text-sm text-gray-300 mb-1">Resultado:</div>
                <div className="text-xl font-bold text-green-400">
                  {conversionDirection === "brl-to-usd" ? "$" : "R$"} {formatResult(result)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {conversionDirection === "brl-to-usd" ? "Dólares Americanos" : "Reais Brasileiros"}
                </div>
              </div>
            </div>
          )}
          </TabsContent>

          <TabsContent value="date" className="space-y-4 relative z-0 overflow-hidden">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-blue-300 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Planejamento de Safra
              </h4>
              <p className="text-xs text-blue-200">
                Informe a data da sua venda e descubra qual curva de dólar usar e a taxa estimada.
              </p>
            </div>

            {/* Data de venda */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Data da Venda Planejada
              </label>
              <div className="relative">
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  min={minDate}
                  max={maxDate}
                  className="bg-slate-800 border-slate-600 text-white focus:border-yellow-400 pr-8
                    [&::-webkit-calendar-picker-indicator]:filter 
                    [&::-webkit-calendar-picker-indicator]:invert 
                    [&::-webkit-calendar-picker-indicator]:opacity-70
                    [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  placeholder="dd/mm/aaaa"
                  title="Selecionar data"
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                />
                <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-yellow-400 pointer-events-none opacity-60" />
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Clique no campo para abrir o calendário ou digite a data (DD/MM/AAAA)</span>
              </p>
            </div>

            {/* Botão buscar */}
            <Button
              onClick={findCurveByDate}
              disabled={!targetDate}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-semibold"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Consultar Taxa
            </Button>

            {/* Resultado da consulta por data */}
            {dateResult && (
              <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 p-4 rounded-lg border border-green-500/30">
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-sm text-gray-300 mb-1">Taxa Estimada:</div>
                    <div className="text-2xl font-bold text-green-400">
                      R$ {dateResult.taxa.toFixed(4)}
                    </div>
                    <div className="text-xs text-gray-400">por dólar</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-800/50 p-2 rounded">
                      <div className="text-gray-400">Curva:</div>
                      <div className="text-yellow-400 font-mono">{dateResult.curva}</div>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <div className="text-gray-400">Dias:</div>
                      <div className="text-blue-400 font-mono">{dateResult.dias}</div>
                    </div>
                  </div>

                  <div className="text-xs text-center text-gray-400 mt-2">
                    Esta é uma estimativa baseada na curva mais próxima
                  </div>
                </div>
              </div>
            )}

            {/* Conversão rápida com a taxa encontrada */}
            {dateResult && (
              <div className="space-y-3 p-4 bg-slate-800/30 rounded-lg border border-slate-600">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Conversão Rápida:
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickConversionDirection(
                      quickConversionDirection === "usd-to-brl" ? "brl-to-usd" : "usd-to-brl"
                    )}
                    className="text-xs bg-slate-700 border-slate-600 hover:bg-slate-600"
                  >
                    {quickConversionDirection === "usd-to-brl" ? "USD → BRL" : "BRL → USD"}
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">
                      {quickConversionDirection === "usd-to-brl" ? "Valor em USD" : "Valor em BRL"}
                    </label>
                    <Input
                      type="number"
                      placeholder={quickConversionDirection === "usd-to-brl" ? "0.00" : "0,00"}
                      value={quickConvertAmount}
                      onChange={(e) => handleQuickConvert(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white placeholder-gray-400 focus:border-yellow-400"
                      step="0.01"
                    />
                  </div>
                  <div className="text-center text-gray-400">
                    <ArrowLeftRight className="w-4 h-4 mx-auto" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">
                      {quickConversionDirection === "usd-to-brl" ? "Valor em BRL" : "Valor em USD"}
                    </label>
                    <Input
                      value={quickConvertResult}
                      placeholder={quickConversionDirection === "usd-to-brl" ? "0,00" : "0.00"}
                      readOnly
                      className="bg-slate-700 border-slate-600 text-green-400 cursor-default font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 