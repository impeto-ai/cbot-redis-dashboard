"use client"

import { useState, useCallback, useRef } from "react"

// Hook para manter estado do modal persistente durante re-renders
export function useModalState() {
  const [isOpen, setIsOpen] = useState(false)
  const modalStateRef = useRef({
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
    modalStateRef.current = {
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
    }
  }, [])

  const updateModalState = useCallback((updates: Partial<typeof modalStateRef.current>) => {
    modalStateRef.current = { ...modalStateRef.current, ...updates }
  }, [])

  return {
    isOpen,
    openModal,
    closeModal,
    modalState: modalStateRef.current,
    updateModalState
  }
}