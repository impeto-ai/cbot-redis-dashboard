"use client"

// Adicionar estas configurações para garantir que a página seja dinâmica
export const dynamic = "force-dynamic"
export const revalidate = 0

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function RedisExplorer() {
  const [keys, setKeys] = useState<string[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [keyValue, setKeyValue] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/redis/keys")

      if (!response.ok) {
        throw new Error(`Erro ao buscar chaves: ${response.status}`)
      }

      const data = await response.json()
      setKeys(data.keys || [])
    } catch (error) {
      console.error("Erro ao buscar chaves:", error)
      setError("Falha ao carregar chaves do Redis")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchKeyValue = async (key: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/redis/value?key=${encodeURIComponent(key)}`)

      if (!response.ok) {
        throw new Error(`Erro ao buscar valor: ${response.status}`)
      }

      const data = await response.json()
      setKeyValue(data.value)
      setSelectedKey(key)
    } catch (error) {
      console.error("Erro ao buscar valor:", error)
      setError(`Falha ao carregar valor para a chave: ${key}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mb-4">
        <Link href="/" className="flex items-center text-blue-500 hover:text-blue-700">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-white">Redis Explorer</h1>
        <Button onClick={fetchKeys} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {error && <div className="bg-red-900 text-white p-3 rounded-md mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Chaves Redis</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !keys.length ? (
              <div className="text-center py-4">Carregando chaves...</div>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto">
                {keys.length === 0 ? (
                  <div className="text-center py-4">Nenhuma chave encontrada</div>
                ) : (
                  <ul className="space-y-1">
                    {keys.map((key) => (
                      <li key={key}>
                        <button
                          onClick={() => fetchKeyValue(key)}
                          className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-800 transition-colors ${
                            selectedKey === key ? "bg-gray-800 text-blue-400" : "text-gray-300"
                          }`}
                        >
                          {key}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">
              {selectedKey ? `Valor: ${selectedKey}` : "Selecione uma chave"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && selectedKey ? (
              <div className="text-center py-4">Carregando valor...</div>
            ) : selectedKey ? (
              <pre className="bg-[#0D0D0D] p-4 rounded-md overflow-x-auto text-gray-300 max-h-[70vh] overflow-y-auto">
                {JSON.stringify(keyValue, null, 2)}
              </pre>
            ) : (
              <div className="text-center py-4 text-gray-400">Selecione uma chave para ver seu valor</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

