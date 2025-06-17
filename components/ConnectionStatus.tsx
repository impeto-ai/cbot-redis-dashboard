"use client"

import React, { useState, useEffect } from "react"

interface ConnectionStatusProps {
  isLoading: boolean
  error: Error | null
  lastUpdate?: string
}

export const ConnectionStatus = React.memo(function ConnectionStatus({ isLoading, error, lastUpdate }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const getStatusColor = () => {
    if (!isOnline) return "bg-gray-500"
    if (error) return "bg-red-500"
    if (isLoading) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getStatusText = () => {
    if (!isOnline) return "Offline"
    if (error) return "Erro de conexão"
    if (isLoading) return "Sincronizando..."
    return "Online"
  }

  const formatLastUpdate = (timestamp?: string) => {
    if (!timestamp) return ""
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    } catch {
      return ""
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg text-xs z-50">
      <div className="flex items-center space-x-2">
        <div 
          className={`w-2 h-2 rounded-full ${getStatusColor()} ${isLoading ? 'animate-pulse' : ''}`}
        ></div>
        <span>{getStatusText()}</span>
        {lastUpdate && !error && (
          <span className="text-gray-400">
            • {formatLastUpdate(lastUpdate)}
          </span>
        )}
      </div>
    </div>
  )
})