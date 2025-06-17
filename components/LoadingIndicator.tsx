"use client"

import { useState, useEffect } from "react"

interface LoadingIndicatorProps {
  isLoading: boolean
  message?: string
}

export function LoadingIndicator({ isLoading, message = "Carregando..." }: LoadingIndicatorProps) {
  const [dots, setDots] = useState("")

  useEffect(() => {
    if (!isLoading) return

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === "...") return ""
        return prev + "."
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isLoading])

  if (!isLoading) return null

  return (
    <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        <span className="text-sm">{message}{dots}</span>
      </div>
    </div>
  )
}