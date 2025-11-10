"use client"

import { useState, useEffect } from "react"

interface LoadingIndicatorProps {
  isLoading: boolean
  message?: string
}

export function LoadingIndicator({ isLoading, message = "Carregando..." }: LoadingIndicatorProps) {
  const [dots, setDots] = useState("")
  const [showLoading, setShowLoading] = useState(false)

  // Só mostrar loading após 800ms para evitar "flash" em atualizações rápidas
  useEffect(() => {
    let timeout: NodeJS.Timeout

    if (isLoading) {
      timeout = setTimeout(() => {
        setShowLoading(true)
      }, 800) // Delay de 800ms antes de mostrar
    } else {
      setShowLoading(false)
    }

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [isLoading])

  useEffect(() => {
    if (!showLoading) return

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === "...") return ""
        return prev + "."
      })
    }, 500)

    return () => clearInterval(interval)
  }, [showLoading])

  if (!showLoading) return null

  return (
    <div className="fixed top-4 right-4 bg-blue-600/90 text-white px-3 py-1.5 rounded-lg shadow-lg z-50 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
        <span className="text-xs font-medium">{message}{dots}</span>
      </div>
    </div>
  )
}