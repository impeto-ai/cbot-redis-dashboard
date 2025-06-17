"use client"

import React, { useMemo } from "react"

interface StableTableProps {
  children: React.ReactNode
  dataHash: string // A hash or string representation of the data
}

export const StableTable = React.memo(function StableTable({ children, dataHash }: StableTableProps) {
  return useMemo(() => children, [dataHash])
})

// Helper function to create stable data hash
export function createDataHash(data: any[]): string {
  if (!data || data.length === 0) return "empty"
  
  // Create a stable hash from the data that only changes when actual values change
  return data.map(item => 
    `${item.symbol}-${item.ultimoPreco}-${item.variacao}-${item.lastUpdate}`
  ).join("|")
}