import { mockData } from "./mockData"

// Função para esperar um tempo específico
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Cache para armazenar resultados e evitar requisições repetidas
const cache: Record<string, { data: any; timestamp: number }> = {}
const CACHE_TTL = 60000 // 1 minuto

export class RedisClient {
  private url: string
  private token: string
  private useMock = false

  constructor() {
    this.url = process.env.UPSTASH_REDIS_REST_URL || ""
    this.token = process.env.UPSTASH_REDIS_REST_TOKEN || ""

    if (!this.url || !this.token) {
      console.warn("Credenciais Redis não configuradas, usando dados mock")
      this.useMock = true
    }
  }

  // Função para fazer requisição com retry e tratamento de texto
  private async fetchWithRetry(
    endpoint: string,
    options: RequestInit = {},
    retries = 3,
    initialDelay = 1000,
  ): Promise<any> {
    // Verificar cache
    const cacheKey = `${endpoint}:${JSON.stringify(options)}`
    const cachedItem = cache[cacheKey]

    if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
      console.log(`Usando dados em cache para ${endpoint}`)
      return cachedItem.data
    }

    let delay = initialDelay

    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Tentativa ${i + 1}/${retries} para ${endpoint}`)

        // Se estamos usando mock, retornar dados mock
        if (this.useMock) {
          if (endpoint.includes("keys")) {
            return { result: Object.keys(mockData) }
          } else if (endpoint.includes("get")) {
            const key = endpoint.split("/").pop()
            return { result: mockData[key] || null }
          }
          return { result: null }
        }

        const url = `${this.url}/${endpoint}`
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${this.token}`,
          },
        })

        // Verificar status HTTP
        if (response.status === 429) {
          console.warn(`Rate limit atingido, tentativa ${i + 1}/${retries}, aguardando ${delay}ms`)
          await sleep(delay)
          delay *= 2 // Backoff exponencial
          continue
        }

        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`)
        }

        // Obter o texto da resposta
        const text = await response.text()

        // Se a resposta estiver vazia, retornar null
        if (!text.trim()) {
          return { result: null }
        }

        // Tentar fazer parse do JSON
        try {
          const result = JSON.parse(text)

          // Armazenar no cache
          cache[cacheKey] = { data: result, timestamp: Date.now() }

          return result
        } catch (e) {
          // Se não for um JSON válido, verificar se é uma mensagem de erro
          if (text.includes("Too Many Requests")) {
            console.warn(`Rate limit atingido, tentativa ${i + 1}/${retries}, aguardando ${delay}ms`)
            await sleep(delay)
            delay *= 2 // Backoff exponencial
            continue
          }

          // Se não for uma mensagem de erro conhecida, retornar o texto como está
          console.warn(`Resposta não é um JSON válido: ${text.substring(0, 50)}...`)
          return { result: text }
        }
      } catch (error) {
        if (i === retries - 1) throw error
        console.warn(`Erro na tentativa ${i + 1}/${retries}, tentando novamente em ${delay}ms:`, error)
        await sleep(delay)
        delay *= 2 // Backoff exponencial
      }
    }

    throw new Error(`Falha após ${retries} tentativas`)
  }

  // Obter todas as chaves que correspondem a um padrão
  async getKeys(pattern: string): Promise<string[]> {
    try {
      const result = await this.fetchWithRetry(`keys/${pattern}`)
      return Array.isArray(result.result) ? result.result : []
    } catch (error) {
      console.error(`Erro ao buscar chaves com padrão ${pattern}:`, error)
      return []
    }
  }

  // Obter o valor de uma chave
  async getValue(key: string): Promise<any> {
    try {
      const result = await this.fetchWithRetry(`get/${encodeURIComponent(key)}`)
      return result.result
    } catch (error) {
      console.error(`Erro ao buscar valor para chave ${key}:`, error)
      return null
    }
  }

  // Obter múltiplos valores com controle de concorrência
  async getMultipleValues(keys: string[], batchSize = 1, delayBetweenBatches = 1000): Promise<Record<string, any>> {
    const result: Record<string, any> = {}

    // Processar chaves em lotes pequenos
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize)
      console.log(
        `Processando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(keys.length / batchSize)}: ${batch.join(", ")}`,
      )

      // Processar cada chave no lote sequencialmente
      for (const key of batch) {
        try {
          const value = await this.getValue(key)
          if (value !== null) {
            result[key] = value
          }
        } catch (error) {
          console.error(`Erro ao processar chave ${key}:`, error)
        }
      }

      // Aguardar antes de processar o próximo lote
      if (i + batchSize < keys.length) {
        console.log(`Aguardando ${delayBetweenBatches}ms antes do próximo lote`)
        await sleep(delayBetweenBatches)
      }
    }

    return result
  }
}

// Exportar uma instância única
export const redisClient = new RedisClient()

