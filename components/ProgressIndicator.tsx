"use client"

import { useState, useEffect } from "react"

interface ProgressIndicatorProps {
  isVisible: boolean
  message?: string
}

export function ProgressIndicator({ isVisible, message = "Carregando dados..." }: ProgressIndicatorProps) {
  const [progress, setProgress] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)

  useEffect(() => {
    if (!isVisible) {
      setProgress(0)
      setTimeElapsed(0)
      return
    }

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      setTimeElapsed(Math.floor(elapsed / 1000))
      
      // Simular progresso baseado no tempo (mais lento depois dos primeiros segundos)
      if (elapsed < 3000) {
        setProgress(Math.min(30, (elapsed / 3000) * 30))
      } else if (elapsed < 8000) {
        setProgress(30 + Math.min(50, ((elapsed - 3000) / 5000) * 50))
      } else {
        setProgress(80 + Math.min(15, ((elapsed - 8000) / 7000) * 15))
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-6 min-w-[300px]">
        <div className="text-center">
          <div className="mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto opacity-90"></div>
          </div>
          <h3 className="text-white text-lg mb-2">{message}</h3>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div 
              className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-gray-400 text-sm">
            {progress.toFixed(0)}% - {timeElapsed}s
          </p>
          {timeElapsed > 8 && (
            <p className="text-yellow-400 text-xs mt-2">
              Processando dados do Redis... Isso pode levar alguns segundos.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}