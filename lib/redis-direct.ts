// Reduzir o tempo de cache para garantir dados mais atualizados
const CACHE_TTL = 10000 // 10 segundos (reduzido de 25000)
const STALE_CACHE_TTL = 60000 // 1 minuto (reduzido de 3600000)

// Estrutura do cache
const cache: Record<string, { data: any; timestamp: number; status?: "fresh" | "stale" }> = {}

// Controle de circuit breaker para evitar requisições quando estamos em rate limit
let circuitBreakerActive = false
let circuitBreakerResetTime = 0
const CIRCUIT_BREAKER_TIMEOUT = 60000 // 1 minuto (reduzido de 300000)

// Função para esperar um tempo específico
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Função para verificar se o circuit breaker está ativo
function isCircuitBreakerActive() {
  if (!circuitBreakerActive) return false

  // Verificar se o tempo de reset já passou
  if (Date.now() > circuitBreakerResetTime) {
    console.log("Circuit breaker reset após timeout")
    circuitBreakerActive = false
    return false
  }

  return true
}

// Função para ativar o circuit breaker
function activateCircuitBreaker() {
  circuitBreakerActive = true
  circuitBreakerResetTime = Date.now() + CIRCUIT_BREAKER_TIMEOUT
  console.log(`Circuit breaker ativado até ${new Date(circuitBreakerResetTime).toLocaleTimeString()}`)
}

// Função para fazer uma requisição ao Upstash
async function fetchFromUpstash(endpoint: string, options: RequestInit = {}): Promise<any> {
  // Verificar se o circuit breaker está ativo
  if (isCircuitBreakerActive()) {
    console.log(`Circuit breaker ativo, pulando requisição para ${endpoint}`)
    throw new Error("Circuit breaker ativo")
  }

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    throw new Error("Credenciais Redis não configuradas")
  }

  try {
    console.log(`Fazendo requisição para ${url}/${endpoint}`)

    const response = await fetch(`${url}/${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        ...options.headers,
      },
    })

    if (!response.ok) {
      if (response.status === 429) {
        // Ativar circuit breaker em caso de rate limit
        activateCircuitBreaker()
      }
      throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`)
    }

    // Obter o texto da resposta
    const text = await response.text()

    // Se a resposta estiver vazia, retornar null
    if (!text.trim()) {
      return { result: null }
    }

    // Se a resposta contiver "Too Many Requests", ativar circuit breaker
    if (text.includes("Too Many Requests")) {
      activateCircuitBreaker()
      throw new Error("Rate limit excedido")
    }

    // Tentar fazer parse do JSON
    try {
      return JSON.parse(text)
    } catch (e) {
      // Se não for um JSON válido, retornar o texto como está
      console.warn(`Resposta não é um JSON válido, retornando como texto: ${text.substring(0, 50)}...`)
      return { result: text }
    }
  } catch (error) {
    console.error(`Erro ao fazer requisição para ${endpoint}:`, error)
    throw error
  }
}

// Função para buscar todas as chaves relevantes
export async function getAllKeys(): Promise<string[]> {
  const cacheKey = "all_keys"
  const cachedItem = cache[cacheKey]

  if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
    console.log("Usando chaves em cache")
    return cachedItem.data
  }

  // Se o circuit breaker estiver ativo, retornar array vazio
  if (isCircuitBreakerActive()) {
    console.log("Circuit breaker ativo, retornando array vazio")
    return []
  }

  try {
    console.log("Buscando todas as chaves...")

    // Fazer uma única requisição para buscar todas as chaves
    const result = await fetchFromUpstash("keys/*")

    // Extrair o resultado da resposta
    let keys = []
    if (result && result.result && Array.isArray(result.result)) {
      keys = result.result
    } else if (Array.isArray(result)) {
      keys = result
    }

    // Log all keys before filtering
    console.log("All Redis keys before filtering:", keys)
    const filteredKeys = keys.filter((key: string) => {
      const isRelevant =
        key.includes("ZS") ||
        key.includes("ZC") ||
        key.includes("ZW") || // Add ZW (trigo)
        key.includes("ZM") || // Add ZM (farelo)
        key.includes("ZL") || // Add ZL (óleo)
        key.includes("CURVA DE DOLAR") ||
        key.includes("PTAX") ||
        key.includes("cambio:DOL COM") ||
        key.includes("cambio:EUROCOM") ||
        key.includes("b3:") // Adicionar chaves da B3

      if (isRelevant) {
        console.log("Found relevant key:", key)
      }
      return isRelevant
    })
    console.log("Filtered Redis keys:", filteredKeys)

    console.log(`Encontradas ${filteredKeys.length} chaves relevantes`)

    // Armazenar no cache
    cache[cacheKey] = { data: filteredKeys, timestamp: Date.now() }

    return filteredKeys
  } catch (error) {
    console.error("Erro ao buscar chaves:", error)
    return []
  }
}

// Função para buscar todos os valores de uma vez
export async function getAllValues(): Promise<Record<string, any>> {
  const cacheKey = "all_values"
  const cachedItem = cache[cacheKey]
  const now = Date.now()

  // Verificar se temos dados em cache válidos
  if (cachedItem && now - cachedItem.timestamp < CACHE_TTL) {
    console.log(`Usando valores em cache (fresh) - Idade: ${(now - cachedItem.timestamp) / 1000}s`)
    return cachedItem.data
  }

  console.log("Cache expirado ou não existente, buscando novos dados...")

  // Verificar se temos dados em cache "stale" (expirados mas ainda utilizáveis)
  if (cachedItem && Date.now() - cachedItem.timestamp < STALE_CACHE_TTL) {
    console.log("Cache expirado, tentando atualizar em background...")

    // Tentar atualizar o cache em background, mas retornar os dados stale imediatamente
    getAllValuesBackground().catch((err) => {
      console.error("Erro ao atualizar cache em background:", err)
    })

    console.log("Usando valores em cache (stale)")
    return cachedItem.data
  }

  // Se não temos cache ou está muito velho, buscar novos dados
  try {
    return await getAllValuesInternal()
  } catch (error) {
    console.error("Erro ao buscar valores:", error)

    // Se temos cache stale, usar mesmo que seja muito velho
    if (cachedItem) {
      console.warn("Usando cache muito antigo devido a erro")
      return cachedItem.data
    }

    // Em último caso, retornar objeto vazio
    console.warn("Nenhum dado disponível")
    return {}
  }
}

// Função para atualizar o cache em background
async function getAllValuesBackground(): Promise<void> {
  try {
    const data = await getAllValuesInternal()
    console.log("Cache atualizado com sucesso em background")
  } catch (error) {
    console.error("Falha ao atualizar cache em background:", error)
    throw error
  }
}

// Função interna para buscar todos os valores de uma vez
async function getAllValuesInternal(): Promise<Record<string, any>> {
  // Se o circuit breaker estiver ativo, usar dados em cache
  if (isCircuitBreakerActive()) {
    console.log("Circuit breaker ativo, usando dados em cache")
    const cachedItem = cache["all_values"]
    if (cachedItem) {
      return cachedItem.data
    }
    return {}
  }

  try {
    // Buscar todas as chaves
    const keys = await getAllKeys()

    if (keys.length === 0) {
      return {}
    }

    console.log(`Buscando valores para ${keys.length} chaves...`)

    // Usar o pipeline para buscar múltiplos valores
    // Construir um array de comandos para o pipeline
    const pipeline = keys.map((key) => ["GET", key])

    // Fazer a requisição de pipeline
    const pipelineResponse = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pipeline),
    })

    if (!pipelineResponse.ok) {
      if (pipelineResponse.status === 429) {
        activateCircuitBreaker()
        throw new Error("Rate limit excedido")
      }
      throw new Error(`Erro HTTP: ${pipelineResponse.status} ${pipelineResponse.statusText}`)
    }

    const pipelineResults = await pipelineResponse.json()

    // Processar os resultados do pipeline
    const data: Record<string, any> = {}

    if (Array.isArray(pipelineResults)) {
      pipelineResults.forEach((result, index) => {
        const key = keys[index]

        if (result && result.result !== null) {
          let value = result.result

          // Se o valor for uma string que parece JSON, tentar converter
          if (typeof value === "string" && (value.startsWith("{") || value.startsWith("["))) {
            try {
              value = JSON.parse(value)
            } catch (e) {
              // Manter como string se não for possível converter
            }
          }

          data[key] = value

          // Também armazenar no cache individual
          cache[`value_${key}`] = { data: value, timestamp: Date.now() }
        }
      })
    }

    console.log(`Recuperados ${Object.keys(data).length} valores`)

    // Armazenar no cache
    cache["all_values"] = { data, timestamp: Date.now(), status: "fresh" }

    return data
  } catch (error) {
    console.error("Erro ao buscar valores via pipeline:", error)

    // Se o pipeline falhar, tentar buscar os valores individualmente
    console.log("Tentando buscar valores individualmente...")

    const keys = await getAllKeys()
    const data: Record<string, any> = {}

    // Limitar o número de chaves para evitar sobrecarregar a API
    const maxKeys = 50 // Aumentar para 50 mas com processamento mais rápido
    const limitedKeys = keys.slice(0, maxKeys)

    for (const key of limitedKeys) {
      try {
        const cacheKey = `value_${key}`
        const cachedItem = cache[cacheKey]

        if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
          console.log(`Usando valor em cache para ${key}`)
          data[key] = cachedItem.data
          continue
        }

        const result = await fetchFromUpstash(`get/${encodeURIComponent(key)}`)

        if (result && result.result !== null) {
          let value = result.result

          // Se o valor for uma string que parece JSON, tentar converter
          if (typeof value === "string" && (value.startsWith("{") || value.startsWith("["))) {
            try {
              value = JSON.parse(value)
            } catch (e) {
              // Manter como string se não for possível converter
            }
          }

          data[key] = value
          cache[cacheKey] = { data: value, timestamp: Date.now() }
        }

        // Reduzir delay entre requisições
        await sleep(100)
      } catch (error) {
        console.error(`Erro ao buscar valor para ${key}:`, error)

        // Se for erro de circuit breaker, parar o processamento
        if (error.message === "Circuit breaker ativo") {
          console.log("Circuit breaker ativado, interrompendo processamento")
          break
        }

        // Para outros erros, tentar usar dados em cache
        const cacheKey = `value_${key}`
        const cachedItem = cache[cacheKey]

        if (cachedItem) {
          data[key] = cachedItem.data
        }
      }
    }

    // Se conseguimos recuperar alguns dados, armazenar no cache
    if (Object.keys(data).length > 0) {
      cache["all_values"] = { data, timestamp: Date.now(), status: "fresh" }
      return data
    }

    throw error
  }
}

// Função para buscar um valor específico
export async function getValue(key: string): Promise<any> {
  const cacheKey = `value_${key}`
  const cachedItem = cache[cacheKey]

  if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
    console.log(`Usando valor em cache para ${key}`)
    return cachedItem.data
  }

  // Se o circuit breaker estiver ativo, usar dados em cache
  if (isCircuitBreakerActive()) {
    console.log(`Circuit breaker ativo, usando dados em cache para ${key}`)
    if (cachedItem) {
      return cachedItem.data
    }
    return null
  }

  try {
    console.log(`Buscando valor para ${key}...`)

    const result = await fetchFromUpstash(`get/${encodeURIComponent(key)}`)

    let value = null
    if (result && result.result !== null) {
      value = result.result

      // Se o valor for uma string que parece JSON, tentar converter
      if (typeof value === "string" && (value.startsWith("{") || value.startsWith("["))) {
        try {
          value = JSON.parse(value)
        } catch (e) {
          // Manter como string se não for possível converter
        }
      }
    }

    // Armazenar no cache
    cache[cacheKey] = { data: value, timestamp: Date.now() }

    return value
  } catch (error) {
    console.error(`Erro ao buscar valor para ${key}:`, error)

    // Se temos cache, usar mesmo que seja antigo
    if (cachedItem) {
      console.log(`Usando valor em cache antigo para ${key} devido a erro`)
      return cachedItem.data
    }

    return null
  }
}

