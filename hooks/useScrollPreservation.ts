"use client"

import { useEffect, useRef } from "react"

export function useScrollPreservation() {
  const scrollPositionRef = useRef<number>(0)
  const isUserScrollingRef = useRef<boolean>(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    let lastScrollTime = 0

    const handleScroll = () => {
      const now = Date.now()
      lastScrollTime = now
      isUserScrollingRef.current = true
      scrollPositionRef.current = window.scrollY

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Set timeout to detect when user stops scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        // Only mark as not scrolling if enough time has passed
        if (Date.now() - lastScrollTime >= 500) {
          isUserScrollingRef.current = false
        }
      }, 500)
    }

    const handleBeforeUnload = () => {
      sessionStorage.setItem('scrollPosition', scrollPositionRef.current.toString())
    }

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Restore scroll position on mount
    const savedPosition = sessionStorage.getItem('scrollPosition')
    if (savedPosition) {
      const position = parseInt(savedPosition, 10)
      window.scrollTo(0, position)
      scrollPositionRef.current = position
    }

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const preserveScroll = (callback: () => void) => {
    const currentPosition = window.scrollY
    const wasUserScrolling = isUserScrollingRef.current

    // Execute the callback
    callback()

    // Only restore scroll if user was not scrolling and position changed significantly
    if (!wasUserScrolling && Math.abs(window.scrollY - currentPosition) > 50) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: currentPosition, behavior: 'instant' })
      })
    }
  }

  return {
    preserveScroll,
    isUserScrolling: () => isUserScrollingRef.current
  }
}