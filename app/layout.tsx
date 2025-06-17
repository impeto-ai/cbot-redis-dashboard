import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ClientHeader } from "@/components/ClientHeader"
import { HydrationFix } from "@/components/HydrationFix"
import ErrorBoundary from "@/components/ErrorBoundary"

const inter = Inter({ subsets: ["latin"] })

// Adicionar esta função para garantir que a página seja dinâmica
export const dynamic = "force-dynamic"
export const revalidate = 0

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Adicionar meta tags para evitar cache */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <HydrationFix />
        <ErrorBoundary>
          <ClientHeader />
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.dev'
    };
