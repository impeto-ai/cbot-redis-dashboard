import { NextResponse } from "next/server"
import { getAllValues } from "@/lib/redis-direct"

// Configurar para que a rota seja sempre dinâmica
export const dynamic = "force-dynamic"
export const revalidate = 0

// Implementar um sistema de rate limiting para a API
const API_RATE_LIMIT = {
  windowMs: 60000, // 1 minuto
  maxRequests: 30, // Aumentado para 30 requisições por minuto
  requests: new Map<string, number[]>(),
}

export async function GET(request: Request) {
  try {
    // Implementar rate limiting básico
    const now = Date.now()
    const clientIp = "api-client" // Em produção, usar o IP real do cliente

    // Limpar requisições antigas
    if (!API_RATE_LIMIT.requests.has(clientIp)) {
      API_RATE_LIMIT.requests.set(clientIp, [])
    }

    const clientRequests = API_RATE_LIMIT.requests.get(clientIp)!
    const recentRequests = clientRequests.filter((timestamp) => now - timestamp < API_RATE_LIMIT.windowMs)

    // Atualizar lista de requisições
    API_RATE_LIMIT.requests.set(clientIp, [...recentRequests, now])

    // Verificar se excedeu o limite
    if (recentRequests.length >= API_RATE_LIMIT.maxRequests) {
      console.warn(`Rate limit excedido para API: ${recentRequests.length} requisições no último minuto`)
      return NextResponse.json({ error: "Too many requests, please try again later" }, { status: 429 })
    }

    console.log("Iniciando busca de dados do mercado...")

    // Buscar todos os valores com timeout
    const data = await Promise.race([
      getAllValues(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout na busca de dados")), 12000)
      )
    ]) as Record<string, any>

    // Adicionar cabeçalhos para evitar cache
    const headers = new Headers()
    headers.append("Cache-Control", "no-cache, no-store, must-revalidate")
    headers.append("Pragma", "no-cache")
    headers.append("Expires", "0")

    if (Object.keys(data).length === 0) {
      console.warn("Nenhum dado válido recuperado")
      return NextResponse.json({ data: {} }, { headers })
    }

    return NextResponse.json({ data, timestamp: Date.now() }, { headers })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    const errorName = error instanceof Error ? error.name : 'Unknown'
    
    console.error("Erro detalhado na API:", {
      message: errorMessage,
      stack: errorStack,
      name: errorName,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({ 
      error: "Failed to fetch data", 
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

