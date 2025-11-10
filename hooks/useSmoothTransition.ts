"use client"

import { useState, useEffect, useRef } from "react"

interface TransitionConfig {
  duration?: number // ms
  easing?: (t: number) => number
}

// Easing functions
const easings = {
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutQuad: (t: number) => 1 - (1 - t) * (1 - t),
}

/**
 * Hook para interpolar valores numéricos suavemente
 * Evita "trancos" quando valores mudam abruptamente
 */
export function useSmoothValue(targetValue: number | null, config: TransitionConfig = {}) {
  const { duration = 600, easing = easings.easeOutCubic } = config

  const [currentValue, setCurrentValue] = useState<number | null>(targetValue)
  const animationRef = useRef<number | undefined>(undefined)
  const startValueRef = useRef<number | null>(targetValue)
  const startTimeRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    // Se valor é null, atualizar imediatamente
    if (targetValue === null) {
      setCurrentValue(null)
      return
    }

    // Se é a primeira vez ou mudança muito pequena, atualizar imediatamente
    if (startValueRef.current === null || Math.abs(targetValue - (startValueRef.current || 0)) < 0.01) {
      setCurrentValue(targetValue)
      startValueRef.current = targetValue
      return
    }

    // Cancelar animação anterior se existir
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    startValueRef.current = currentValue
    startTimeRef.current = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - (startTimeRef.current || currentTime)
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easing(progress)

      const start = startValueRef.current || 0
      const interpolated = start + (targetValue - start) * easedProgress

      setCurrentValue(interpolated)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setCurrentValue(targetValue)
        startValueRef.current = targetValue
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [targetValue, duration, easing, currentValue])

  return currentValue
}

/**
 * Hook para detectar quando um valor mudou e aplicar classe CSS temporária
 */
export function useValueChangeEffect<T>(value: T, duration = 1200) {
  const [isChanging, setIsChanging] = useState(false)
  const prevValueRef = useRef<T>(value)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    if (value !== prevValueRef.current) {
      setIsChanging(true)
      prevValueRef.current = value

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        setIsChanging(false)
      }, duration)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, duration])

  return isChanging
}

/**
 * Hook para aplicar classes de transição suave baseado em hash de dados
 */
export function useRowTransition(rowKey: string, data: any) {
  const [className, setClassName] = useState("")
  const prevDataRef = useRef<string>("")

  useEffect(() => {
    const currentHash = JSON.stringify(data)

    if (prevDataRef.current && prevDataRef.current !== currentHash) {
      // Dados mudaram - aplicar animação de update
      setClassName("data-updated")

      const timer = setTimeout(() => {
        setClassName("")
      }, 1200)

      prevDataRef.current = currentHash
      return () => clearTimeout(timer)
    }

    prevDataRef.current = currentHash
  }, [data])

  return className
}
