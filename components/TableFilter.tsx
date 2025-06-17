"use client"

import { useEffect, useState } from "react"
import { Check, X, LayoutGrid, AlignVerticalJustifyCenter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface TableFilterProps {
  onChange: (selectedTables: string[]) => void
  onLayoutChange?: (layout: "horizontal" | "vertical") => void
}

const AVAILABLE_TABLES = [
  { id: "soybean", label: "Soja CBOT" },
  { id: "corn", label: "Milho CBOT" },
  { id: "meal", label: "Farelo CBOT" },
  { id: "oil", label: "Óleo CBOT" },
  { id: "wheat", label: "Trigo CBOT" },
  { id: "bmf", label: "BM&F" },
  { id: "dollar", label: "Curva Dólar" },
]

export function TableFilter({ onChange, onLayoutChange }: TableFilterProps) {
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [showDragHint, setShowDragHint] = useState(true)
  const [currentLayout, setCurrentLayout] = useState<"horizontal" | "vertical">("vertical")

  // Inicializar com todas as tabelas selecionadas ou carregar do localStorage
  useEffect(() => {
    const savedFilter = localStorage.getItem("tableFilter")
    if (savedFilter) {
      try {
        const parsed = JSON.parse(savedFilter)
        setSelectedTables(parsed)
      } catch (e) {
        console.error("Erro ao carregar filtros salvos:", e)
        setSelectedTables(AVAILABLE_TABLES.map((t) => t.id))
      }
    } else {
      setSelectedTables(AVAILABLE_TABLES.map((t) => t.id))
    }

    // Verificar se já mostramos a dica de arrastar
    const dragHintShown = localStorage.getItem("dragHintShown")
    if (dragHintShown) {
      setShowDragHint(false)
    }

    // Esconder a dica após 10 segundos
    const timer = setTimeout(() => {
      setShowDragHint(false)
      localStorage.setItem("dragHintShown", "true")
    }, 10000)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Verificar se há um layout salvo no localStorage
    const savedLayout = localStorage.getItem("tableLayout")
    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout)
        const hasHorizontalLayout = parsedLayout.some((table: any) => table.layout === "horizontal")

        // Definir o layout com base no que foi encontrado
        setCurrentLayout(hasHorizontalLayout ? "horizontal" : "vertical")
      } catch (e) {
        console.error("Erro ao analisar layout salvo:", e)
      }
    }
  }, [])

  // Atualizar quando a seleção mudar
  useEffect(() => {
    if (selectedTables.length > 0) {
      onChange(selectedTables)
      localStorage.setItem("tableFilter", JSON.stringify(selectedTables))
    }
  }, [selectedTables, onChange])

  const toggleTable = (tableId: string) => {
    setSelectedTables((prev) => {
      if (prev.includes(tableId)) {
        return prev.filter((id) => id !== tableId)
      } else {
        return [...prev, tableId]
      }
    })
  }

  const selectAll = () => {
    setSelectedTables(AVAILABLE_TABLES.map((t) => t.id))
  }

  const clearAll = () => {
    setSelectedTables([])
  }

  return (
    <div className="mb-4 bg-[#1A1A1A] border border-gray-800 rounded-md p-3">
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-sm md:text-base lg:text-lg font-medium text-white">Filtrar Tabelas</h3>
          {showDragHint && (
            <span className="text-[9px] sm:text-xs md:text-sm text-gray-500">
              Passe o mouse sobre as tabelas para opções de organização
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="hidden sm:flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log("Layout button clicked: horizontal")
                setCurrentLayout("horizontal")
                onLayoutChange?.("horizontal")
              }}
              className={`text-xs clickable ${currentLayout === "horizontal" ? "bg-blue-900/30 border-blue-700" : ""}`}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              Lado a Lado
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log("Layout button clicked: vertical")
                setCurrentLayout("vertical")
                onLayoutChange?.("vertical")
              }}
              className={`text-xs clickable ${currentLayout === "vertical" ? "bg-blue-900/30 border-blue-700" : ""}`}
            >
              <AlignVerticalJustifyCenter className="w-4 h-4 mr-1" />
              Empilhar
            </Button>
          </div>
          <Button onClick={selectAll} variant="outline" size="sm" className="text-xs clickable">
            <Check className="w-3 h-3 mr-1" />
            Selecionar Todos
          </Button>
          <Button onClick={clearAll} variant="outline" size="sm" className="text-xs clickable">
            <X className="w-3 h-3 mr-1" />
            Limpar Todos
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {AVAILABLE_TABLES.map((table) => (
          <Badge
            key={table.id}
            variant="outline"
            className={`cursor-pointer transition-colors clickable ${
              selectedTables.includes(table.id)
                ? "bg-blue-900/30 text-blue-300 border-blue-700"
                : "bg-gray-800/30 text-gray-400 border-gray-700"
            }`}
            onClick={() => toggleTable(table.id)}
          >
            {table.label}
          </Badge>
        ))}
      </div>
    </div>
  )
}

