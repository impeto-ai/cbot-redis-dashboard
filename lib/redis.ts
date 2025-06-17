import { Redis } from "@upstash/redis"

// Create Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Predefined keys to use
const KNOWN_CBOT_KEYS = [
  "cbot:ZSH6",
  "cbot:ZSK6",
  "cbot:ZSN6",
  "cbot:ZSQ6",
  "cbot:ZSU6",
  "cbot:ZSX6",
  "cbot:ZCH6",
  "cbot:ZCK6",
  "cbot:ZCN6",
  "cbot:ZCU6",
  "cbot:ZCZ6",
]

const KNOWN_DOLLAR_KEYS = [
  "dollar:CURVA DE DOLAR 1D",
  "dollar:CURVA DE DOLAR 30D",
  "dollar:CURVA DE DOLAR 60D",
  "dollar:CURVA DE DOLAR 90D",
  "dollar:CURVA DE DOLAR 180D",
  "dollar:CURVA DE DOLAR 360D",
  "dollar:PTAX",
]

export async function getData(pattern: string): Promise<any> {
  try {
    console.log(`Buscando dados com padrão: ${pattern}`)

    // For pattern searches, return predefined keys
    if (pattern.endsWith("*")) {
      if (pattern === "cbot:*") {
        console.log("Usando lista predefinida de chaves CBOT")
        return KNOWN_CBOT_KEYS
      } else if (pattern === "dollar:*") {
        console.log("Usando lista predefinida de chaves DOLLAR")
        return KNOWN_DOLLAR_KEYS
      } else {
        console.log("Padrão desconhecido, retornando array vazio")
        return []
      }
    }

    // For specific keys, use Redis get
    console.log(`Buscando dados para chave específica: ${pattern}`)
    try {
      const data = await redis.get(pattern)
      console.log(`Dados recuperados para ${pattern}:`, data ? "Sucesso" : "Não encontrado")
      return data
    } catch (error) {
      console.error(`Erro ao buscar dados para ${pattern}:`, error)
      return null
    }
  } catch (error) {
    console.error(`Erro ao buscar dados do Redis para ${pattern}:`, error)
    return pattern.endsWith("*") ? [] : null
  }
}

export default redis

