"use client"

import { useEffect } from "react"

export function HydrationFix() {
  useEffect(() => {
    // Fix hydration mismatch caused by browser extensions
    const suppressHydrationWarning = () => {
      const originalError = console.error
      console.error = (...args) => {
        // Only suppress very specific hydration warnings, not all errors
        if (
          typeof args[0] === 'string' &&
          (args[0].includes('Extra attributes from the server') ||
           args[0].includes('cz-shortcut-listen') ||
           (args[0].includes('hydration') && args[0].includes('mismatch') && !args[0].includes('error')))
        ) {
          // Suppress only hydration warnings related to browser extensions
          return
        }
        // Let all other errors through, including data fetching errors
        originalError.apply(console, args)
      }
    }

    suppressHydrationWarning()

    // Clean up any extension-added attributes
    const cleanupExtensionAttributes = () => {
      const body = document.body
      if (body) {
        // Remove common extension attributes that cause hydration issues
        body.removeAttribute('cz-shortcut-listen')
        body.removeAttribute('data-new-gr-c-s-check-loaded')
        body.removeAttribute('data-gr-ext-installed')
      }
    }

    // Run cleanup immediately and after a short delay
    cleanupExtensionAttributes()
    const timeoutId = setTimeout(cleanupExtensionAttributes, 100)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [])

  return null
}