"use client"

import React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, ArrowLeftRight } from "lucide-react"
import { CBOTDataTables } from "@/components/CBOTDataTables"
import { MarketDataTable } from "@/components/MarketDataTable"
import type { ParsedMarketData, ParsedCurvaData } from "@/types/market-data"
import { useDataFlash } from "@/hooks/useDataFlash"

// Adicione a opção "bmf" na interface TableConfig
interface TableConfig {
  id: string
  type: "soybean" | "corn" | "wheat" | "meal" | "oil" | "bmf" | "dollar"
  title: string
  visible: boolean
  layout: "vertical" | "horizontal"
  pairedWith?: string // ID of the table it's paired with horizontally
}

interface SortableTableProps {
  id: string
  table: TableConfig
  onLayoutToggle: (id: string) => void
  children: React.ReactNode
}

// Modificar o componente SortableTable para usar React.memo
const SortableTable = React.memo(
  ({ id, table, onLayoutToggle, children }: SortableTableProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 1 : 0,
      position: "relative" as const,
    }

    const handleLayoutToggle = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onLayoutToggle(id)
    }

    return (
      <div ref={setNodeRef} style={style} className="relative group no-flash">
        <div className="absolute top-0 right-0 flex items-center gap-2 p-1 bg-[#1a1f2e] rounded-bl z-20">
          <button
            type="button"
            onClick={handleLayoutToggle}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200 transition-colors z-30 clickable"
            title={table.layout === "vertical" ? "Colocar lado a lado" : "Empilhar"}
          >
            <ArrowLeftRight size={14} />
          </button>
          <div
            {...attributes}
            {...listeners}
            className="p-1 hover:bg-gray-700 rounded cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-200 transition-colors"
            title="Arrastar para reordenar"
          >
            <GripVertical size={14} />
          </div>
        </div>
        <div className="table-fade-in no-flash">{children}</div>
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Comparação personalizada para evitar re-renderizações desnecessárias
    return (
      prevProps.id === nextProps.id &&
      prevProps.table.visible === nextProps.table.visible &&
      prevProps.table.layout === nextProps.table.layout &&
      prevProps.table.pairedWith === nextProps.table.pairedWith
    )
  },
)

SortableTable.displayName = "SortableTable"

// Adicione a propriedade b3Data na interface DraggableTablesProps
interface DraggableTablesProps {
  soybeanData: ParsedMarketData[]
  cornData: ParsedMarketData[]
  wheatData: ParsedMarketData[]
  mealData: ParsedMarketData[]
  oilData: ParsedMarketData[]
  b3Data?: ParsedMarketData[] // Tornar opcional
  dollarData: ParsedCurvaData[]
  visibleTables: string[]
  defaultLayout?: "horizontal" | "vertical"
}

export function DraggableTables({
  soybeanData,
  cornData,
  wheatData,
  mealData,
  oilData,
  b3Data,
  dollarData,
  visibleTables,
  defaultLayout,
}: DraggableTablesProps) {
  // Store the default tables configuration
  // Adicione a opção "bmf" na lista defaultTablesConfig
  const defaultTablesConfig = useRef<TableConfig[]>([
    { id: "soybean", type: "soybean", title: "SOJA CBOT", visible: true, layout: "vertical" },
    { id: "corn", type: "corn", title: "MILHO CBOT", visible: true, layout: "vertical" },
    { id: "meal", type: "meal", title: "FARELO DE SOJA CBOT", visible: true, layout: "vertical" },
    { id: "oil", type: "oil", title: "ÓLEO DE SOJA CBOT", visible: true, layout: "vertical" },
    { id: "wheat", type: "wheat", title: "TRIGO CBOT", visible: true, layout: "vertical" },
    { id: "bmf", type: "bmf", title: "MILHO BM&F", visible: true, layout: "vertical" },
    { id: "dollar", type: "dollar", title: "CURVA DE DÓLAR", visible: true, layout: "vertical" },
  ])

  // Use refs to store stable references to the data
  const soybeanDataRef = useRef(soybeanData)
  const cornDataRef = useRef(cornData)
  const wheatDataRef = useRef(wheatData)
  const mealDataRef = useRef(mealData)
  const oilDataRef = useRef(oilData)
  // Adicione a referência para os dados da B3 com inicialização segura
  const b3DataRef = useRef<ParsedMarketData[]>(b3Data || [])
  const dollarDataRef = useRef(dollarData)

  // Update refs when data changes
  useEffect(() => {
    soybeanDataRef.current = soybeanData
    cornDataRef.current = cornData
    wheatDataRef.current = wheatData
    mealDataRef.current = mealData
    oilDataRef.current = oilData
    // Atualize a referência quando os dados mudarem, com fallback para array vazio
    b3DataRef.current = b3Data || []
    dollarDataRef.current = dollarData
  }, [soybeanData, cornData, wheatData, mealData, oilData, b3Data, dollarData])

  const [tables, setTables] = useState<TableConfig[]>(defaultTablesConfig.current)
  const [previousVisibleTables, setPreviousVisibleTables] = useState<string[]>(visibleTables)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isLayoutApplied, setIsLayoutApplied] = useState(false)

  // Store the layout configuration in a ref to prevent it from being lost during re-renders
  const layoutRef = useRef<{ [key: string]: { layout: string; pairedWith?: string } }>({})

  // Store the previous default layout to detect changes
  const prevDefaultLayoutRef = useRef<string | undefined>(defaultLayout)

  // Load saved layout only once on initial mount
  useEffect(() => {
    const savedLayout = localStorage.getItem("tableLayout")
    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout)

        // Garantir que as tabelas visíveis sejam renderizadas corretamente
        const updatedLayout = parsedLayout.map((table: TableConfig) => ({
          ...table,
          visible: visibleTables.includes(table.type),
        }))

        setTables(updatedLayout)

        // Store layout information in ref for stable updates
        updatedLayout.forEach((table: TableConfig) => {
          layoutRef.current[table.id] = {
            layout: table.layout,
            pairedWith: table.pairedWith,
          }
        })
      } catch (e) {
        console.error("Erro ao carregar layout das tabelas:", e)
        // Em caso de erro, inicializar com configuração padrão
        initializeDefaultLayout()
      }
    } else {
      // Se não houver layout salvo, inicializar com configuração padrão
      initializeDefaultLayout()
    }

    setIsInitialLoad(false)
  }, [visibleTables])

  // Add after the existing useEffect hooks
  useEffect(() => {
    if (!isInitialLoad && tables.length > 0) {
      // Save both order and layout state
      const tableState = tables.map((table) => ({
        id: table.id,
        type: table.type,
        visible: table.visible,
        layout: table.layout,
        pairedWith: table.pairedWith,
      }))
      localStorage.setItem("tableLayout", JSON.stringify(tableState))
      console.log("Saved table state:", tableState)
    }
  }, [tables, isInitialLoad])

  // Função para inicializar o layout padrão
  const initializeDefaultLayout = () => {
    // First try to load saved state
    const savedLayout = localStorage.getItem("tableLayout")
    let initialTables

    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout)
        initialTables = parsed.map((table: any) => ({
          ...table,
          visible: visibleTables.includes(table.type),
        }))
      } catch (e) {
        console.error("Error parsing saved layout:", e)
        initialTables = defaultTablesConfig.current.map((table) => ({
          ...table,
          visible: visibleTables.includes(table.type),
        }))
      }
    } else {
      initialTables = defaultTablesConfig.current.map((table) => ({
        ...table,
        visible: visibleTables.includes(table.type),
      }))
    }

    setTables(initialTables)

    // Update layout reference
    initialTables.forEach((table: TableConfig) => {
      layoutRef.current[table.id] = {
        layout: table.layout,
        pairedWith: table.pairedWith,
      }
    })

    console.log("Initialized layout:", initialTables)
  }

  // Save layout when it changes
  useEffect(() => {
    if (!isInitialLoad) {
      localStorage.setItem("tableLayout", JSON.stringify(tables))
    }
  }, [tables, isInitialLoad])

  // Update visibility based on visibleTables prop without changing layout
  useEffect(() => {
    if (isInitialLoad) return

    // Check if visibility has changed
    const hasVisibilityChanged =
      visibleTables.length !== previousVisibleTables.length ||
      visibleTables.some((id) => !previousVisibleTables.includes(id)) ||
      previousVisibleTables.some((id) => !visibleTables.includes(id))

    if (hasVisibilityChanged) {
      setPreviousVisibleTables(visibleTables)

      setTables((prev) => {
        // Create a new array to avoid mutating the previous state
        return prev.map((table) => {
          const isVisible = visibleTables.includes(table.type)

          // If visibility changed but layout didn't, preserve the layout
          if (table.visible !== isVisible) {
            // If this table is paired but now invisible, we need to update its pair
            if (!isVisible && table.pairedWith) {
              const pairedTable = prev.find((t) => t.id === table.pairedWith)
              if (pairedTable) {
                // Update the paired table in layoutRef
                layoutRef.current[pairedTable.id] = {
                  layout: "vertical",
                  pairedWith: undefined,
                }

                // Find and update the paired table in our new array
                const pairedIndex = prev.findIndex((t: TableConfig) => t.id === table.pairedWith)
                if (pairedIndex !== -1) {
                  prev[pairedIndex] = {
                    ...prev[pairedIndex],
                    layout: "vertical",
                    pairedWith: undefined,
                  }
                }
              }
            }

            return {
              ...table,
              visible: isVisible,
              // If becoming invisible, reset layout to vertical
              ...(isVisible ? {} : { layout: "vertical", pairedWith: undefined }),
            }
          }

          return table
        })
      })
    }
  }, [visibleTables, previousVisibleTables, isInitialLoad])

  // Apply default layout when it changes, but only if it's different from the previous value
  useEffect(() => {
    if (isInitialLoad) return

    console.log("defaultLayout changed:", defaultLayout, "previous:", prevDefaultLayoutRef.current)

    // Sempre atualizar a referência, mesmo que seja igual
    const layoutChanged = defaultLayout !== prevDefaultLayoutRef.current
    prevDefaultLayoutRef.current = defaultLayout

    if (!defaultLayout || (!layoutChanged && isLayoutApplied)) return

    setIsLayoutApplied(true)
    console.log("Applying layout:", defaultLayout)

    setTables((prev) => {
      // Create a deep copy to avoid mutating the previous state
      const newTables = JSON.parse(JSON.stringify(prev))

      console.log("Current tables before layout change:", newTables)

      // First, reset all tables to remove existing pairs
      newTables.forEach((table: TableConfig) => {
        table.layout = "vertical"
        table.pairedWith = undefined
      })

      if (defaultLayout === "horizontal") {
        // Get only visible tables
        const visibleTableIds = newTables
          .filter((table: TableConfig) => table.visible)
          .map((table: TableConfig) => table.id)

        // Pair adjacent visible tables
        for (let i = 0; i < visibleTableIds.length - 1; i += 2) {
          const firstId = visibleTableIds[i]
          const secondId = visibleTableIds[i + 1]

          const firstIndex = newTables.findIndex((t: TableConfig) => t.id === firstId)
          const secondIndex = newTables.findIndex((t: TableConfig) => t.id === secondId)

          if (firstIndex !== -1 && secondIndex !== -1) {
            newTables[firstIndex] = {
              ...newTables[firstIndex],
              layout: "horizontal",
              pairedWith: secondId,
            }

            newTables[secondIndex] = {
              ...newTables[secondIndex],
              layout: "horizontal",
              pairedWith: firstId,
            }
          }
        }
      }

      // Update layout reference
      newTables.forEach((table: TableConfig) => {
        layoutRef.current[table.id] = {
          layout: table.layout,
          pairedWith: table.pairedWith,
        }
      })

      console.log("Tables after layout change:", newTables)
      return newTables
    })

    // Reset the flag after a delay to allow future layout changes
    const timer = setTimeout(() => {
      setIsLayoutApplied(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [defaultLayout, isInitialLoad, isLayoutApplied])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setTables((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        // Create new array with updated order
        const newItems = arrayMove(items, oldIndex, newIndex)

        // Immediately save the new order to localStorage
        const tableState = newItems.map((table) => ({
          id: table.id,
          type: table.type,
          visible: table.visible,
          layout: table.layout,
          pairedWith: table.pairedWith,
        }))
        localStorage.setItem("tableLayout", JSON.stringify(tableState))
        console.log("Saved new table order:", tableState)

        // Update layout reference
        newItems.forEach((table) => {
          layoutRef.current[table.id] = {
            layout: table.layout,
            pairedWith: table.pairedWith,
          }
        })

        return newItems
      })
    }
  }

  const toggleLayout = (tableId: string) => {
    console.log("Toggle layout called for:", tableId)

    // Usar uma função de atualização de estado para garantir que estamos trabalhando com o estado mais recente
    setTables((prevTables) => {
      console.log("Current tables state:", prevTables)

      // Find the table to toggle
      const tableIndex = prevTables.findIndex((t) => t.id === tableId)
      if (tableIndex === -1) {
        console.log("Table not found:", tableId)
        return prevTables
      }

      // Create a deep copy to avoid mutating the previous state
      const newTables = JSON.parse(JSON.stringify(prevTables))
      const table = newTables[tableIndex]

      console.log("Table to toggle:", table)

      // If table is already paired, unset both tables
      if (table.pairedWith) {
        console.log("Unpair tables:", table.id, "and", table.pairedWith)

        const pairedIndex = newTables.findIndex((t: TableConfig) => t.id === table.pairedWith)
        if (pairedIndex !== -1) {
          newTables[pairedIndex] = {
            ...newTables[pairedIndex],
            layout: "vertical",
            pairedWith: undefined,
          }
        }

        newTables[tableIndex] = {
          ...table,
          layout: "vertical",
          pairedWith: undefined,
        }
      } else {
        // Find next unpaired table to pair with
        const nextUnpairedIndex = newTables.findIndex(
          (t: TableConfig, i: number) => i > tableIndex && t.visible && t.layout === "vertical" && !t.pairedWith,
        )

        if (nextUnpairedIndex !== -1) {
          console.log("Pair tables:", table.id, "and", newTables[nextUnpairedIndex].id)

          newTables[tableIndex] = {
            ...table,
            layout: "horizontal",
            pairedWith: newTables[nextUnpairedIndex].id,
          }

          newTables[nextUnpairedIndex] = {
            ...newTables[nextUnpairedIndex],
            layout: "horizontal",
            pairedWith: table.id,
          }
        } else {
          console.log("No unpaired table found to pair with")
        }
      }

      console.log("New tables state:", newTables)
      return newTables
    })
  }

  // Modificar a função renderTableContent para usar memoização
  // Na função renderTableContent, adicione o caso para "bmf"
  const renderTableContent = useCallback((table: TableConfig) => {
    if (!table.visible) return null

    // Verificar se há dados para esta tabela
    const hasData = (() => {
      switch (table.type) {
        case "soybean":
          return soybeanDataRef.current.length > 0
        case "corn":
          return cornDataRef.current.length > 0
        case "wheat":
          return wheatDataRef.current.length > 0
        case "meal":
          return mealDataRef.current.length > 0
        case "oil":
          return oilDataRef.current.length > 0
        case "bmf":
          return b3DataRef.current?.length > 0
        case "dollar":
          return dollarDataRef.current.length > 0
        default:
          return false
      }
    })()

    // Se não houver dados, mostrar um placeholder
    if (!hasData) {
      return (
        <div className="bg-[#1A1A1A] p-4 rounded-md smooth-update">
          <div className="bg-gradient-to-r from-[#004d40] to-[#00695c] px-2 py-1 mb-2">
            <h2 className="text-[#00ff00] font-bold text-xs">{table.title}</h2>
          </div>
          <div className="text-gray-400 text-center p-4">Carregando dados...</div>
        </div>
      )
    }

    // Renderizar a tabela com os dados
    switch (table.type) {
      case "soybean":
        return <CBOTDataTables data={soybeanDataRef.current} title={table.title} />
      case "corn":
        return <CBOTDataTables data={cornDataRef.current} title={table.title} />
      case "wheat":
        return <CBOTDataTables data={wheatDataRef.current} title={table.title} />
      case "meal":
        return <CBOTDataTables data={mealDataRef.current} title={table.title} />
      case "oil":
        return <CBOTDataTables data={oilDataRef.current} title={table.title} />
      case "bmf":
        return <CBOTDataTables data={b3DataRef.current} title={table.title} />
      case "dollar":
        return <MarketDataTable data={dollarDataRef.current} title={table.title} />
      default:
        return null
    }
  }, [])

  const renderTables = () => {
    // Filter tables that are visible
    const visibleTables = tables.filter((table) => table.visible)

    console.log("Rendering tables:", visibleTables.length, "visible tables")

    if (visibleTables.length === 0) {
      console.log("No visible tables found!")
      return <div className="text-white text-center p-4">Nenhuma tabela selecionada para exibição</div>
    }

    return visibleTables.map((table) => {
      // If this table is paired and is the first of the pair
      if (table.layout === "horizontal" && table.pairedWith) {
        const pairedTable = tables.find((t) => t.id === table.pairedWith)

        // Skip if this is the second table of a pair
        if (pairedTable && tables.indexOf(pairedTable) < tables.indexOf(table)) {
          return null
        }

        // If paired table exists and is visible, render both side by side
        if (pairedTable && pairedTable.visible) {
          return (
            <div key={`pair-${table.id}`} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SortableTable id={table.id} table={table} onLayoutToggle={toggleLayout}>
                {renderTableContent(table)}
              </SortableTable>
              <SortableTable id={pairedTable.id} table={pairedTable} onLayoutToggle={toggleLayout}>
                {renderTableContent(pairedTable)}
              </SortableTable>
            </div>
          )
        }
      }

      // Render single table
      return (
        <SortableTable key={table.id} id={table.id} table={table} onLayoutToggle={toggleLayout}>
          {renderTableContent(table)}
        </SortableTable>
      )
    })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <SortableContext items={tables.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {renderTables()}
        </SortableContext>
      </div>
    </DndContext>
  )
}

