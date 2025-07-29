"use client"

import { useState, useCallback } from "react"

// Hook para manter estado do modal persistente durante re-renders
export function useModalState() {
  const [isOpen, setIsOpen] = useState(false)
  const [modalState, setModalState] = useState({
    amount: "",
    selectedCurva: "",
    conversionDirection: "usd-to-brl" as "brl-to-usd" | "usd-to-brl",
    result: null as number | null,
    mode: "convert" as "convert" | "date",
    targetDate: "",
    dateResult: null as {curva: string, taxa: number, dias: number} | null,
    quickConvertAmount: "",
    quickConvertResult: "",
    quickConversionDirection: "usd-to-brl" as "usd-to-brl" | "brl-to-usd"
  })

  const openModal = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    // Reset form state when closing
    setModalState({
      amount: "",
      selectedCurva: "",
      conversionDirection: "usd-to-brl",
      result: null,
      mode: "convert",
      targetDate: "",
      dateResult: null,
      quickConvertAmount: "",
      quickConvertResult: "",
      quickConversionDirection: "usd-to-brl"
    })
  }, [])

  const updateModalState = useCallback((updates: Partial<typeof modalState>) => {
    setModalState(prev => ({ ...prev, ...updates }))
  }, [])

  return {
    isOpen,
    openModal,
    closeModal,
    modalState,
    updateModalState
  }
}