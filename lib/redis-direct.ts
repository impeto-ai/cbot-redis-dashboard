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
    console.error("Credenciais Redis não configuradas:", {
      hasUrl: !!url,
      hasToken: !!token,
      url: url ? `${url.substring(0, 20)}...` : 'undefined',
      token: token ? `${token.substring(0, 10)}...` : 'undefined'
    })
    throw new Error("Credenciais Redis não configuradas - verifique UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN")
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
/**
 * Normaliza um valor vindo da base do go-cbot (produção) para o formato
 * legado que os parsers do dashboard esperam ({ symbolId, arrValues, lastUpdate }).
 *
 * go-cbot grava domain.Quote: { symbol, sourceId, price, bid, ask, high, low,
 * open, change, changePerc, volume, lastUpdate, values:{<códigoCMA>:valor} }.
 * O n8n gravava o quote CRU da CMA: { symbolId, arrValues:[{código:valor}] }.
 *
 * Regra: preserva TODO código CMA que o go-cbot ecoa em `values` (autoridade
 * do vendor) e só PREENCHE as lacunas com os campos já parseados — em especial
 * o "03" (taxa), que o go-cbot não repete no `values` da curva de dólar.
 */
export function normalizeQuoteShape(v: any): any {
  if (!v || typeof v !== "object") return v
  if (Array.isArray(v.arrValues)) return v // já é o formato legado (n8n)
  if (!v.values && v.price === undefined) return v // formato desconhecido, não mexe

  const codes: Record<string, string> = { ...(v.values || {}) }
  const str = (x: any) => (x === undefined || x === null ? undefined : String(x))
  const fill = (code: string, val: any) => {
    if (val !== undefined && !(code in codes)) codes[code] = val
  }
  // taxa / último: parsers leem "10" (cbot/b3/câmbio) ou "03" (curva)
  fill("10", str(v.price)); fill("03", str(v.price))
  fill("14", str(v.bid)); fill("15", str(v.ask))
  fill("16", str(v.high)); fill("17", str(v.low)); fill("18", str(v.open))
  fill("19", str(v.volume)); fill("26", str(v.change))
  fill("01", str(v.changePerc !== undefined ? v.changePerc : v.change))

  const arrValues = Object.entries(codes).map(([k, val]) => ({ [k]: String(val) }))
  return {
    ...v,
    symbolId: v.symbolId || { sourceId: v.sourceId, symbol: v.symbol },
    arrValues,
    lastUpdate: v.lastUpdate || new Date().toISOString(),
  }
}

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

    // Buscar por PREFIXO, não `keys/*`. A base de produção do go-cbot tem
    // ~17k chaves (candles:*, optionchain:* etc.) e o Upstash REJEITA um
    // `KEYS *` global: `ERR too many keys to fetch, please use SCAN`. Um
    // `KEYS <prefixo>*` por família fica muito abaixo do limite e traz só as
    // chaves de quote que o painel consome — nas duas bases (n8n e go-cbot
    // usam os mesmos prefixos cbot:/b3:/dolar:/cambio:).
    const quotePrefixes = ["cbot:", "b3:", "dolar:", "cambio:"]
    const collected: string[] = []
    for (const prefix of quotePrefixes) {
      try {
        const result = await fetchFromUpstash(`keys/${encodeURIComponent(prefix + "*")}`)
        const part = result && Array.isArray(result.result) ? result.result : Array.isArray(result) ? result : []
        collected.push(...part)
      } catch (e) {
        console.error(`Erro ao buscar chaves do prefixo ${prefix}:`, e)
      }
    }
    const keys = collected

    // Log all keys before filtering
    console.log("All Redis keys before filtering:", keys)
    const filteredKeys = keys.filter((key: string) => {
      // A base do go-cbot também tem candles:* (streams), optionchain:*,
      // discovery:*, news*, sources:* etc. — que NÃO são quotes planos e
      // fariam os parsers estourarem. Excluir esses prefixos.
      const isJunk =
        key.startsWith("candles:") ||
        key.startsWith("optionchain:") ||
        key.startsWith("discovery:") ||
        key.startsWith("sources:") ||
        key.startsWith("flow_") ||
        key.startsWith("news")
      const isRelevant =
        !isJunk &&
        (key.includes("ZS") ||
        key.includes("ZC") ||
        key.includes("ZW") || // Add ZW (trigo)
        key.includes("ZM") || // Add ZM (farelo)
        key.includes("ZL") || // Add ZL (óleo)
        key.includes("CURVA DE DOLAR") ||
        key.includes("PTAX") ||
        key.includes("cambio:DOL COM") ||
        key.includes("cambio:EUROCOM") ||
        key.includes("b3:")) // Adicionar chaves da B3

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
  console.log("🚀 Iniciando getAllValues - verificando configuração...")
  
  // Verificar credenciais logo no início
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  
  console.log("📊 Status das credenciais:", {
    hasUrl: !!url,
    hasToken: !!token,
    nodeEnv: process.env.NODE_ENV,
    totalEnvVars: Object.keys(process.env).length
  })
  
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

    // Verificar credenciais antes de fazer requisição
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    
    if (!url || !token) {
      console.error("Credenciais Redis não configuradas para pipeline:", {
        hasUrl: !!url,
        hasToken: !!token
      })
      throw new Error("Credenciais Redis não configuradas para pipeline")
    }

    // Fazer a requisição de pipeline
    const pipelineResponse = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
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
              value = normalizeQuoteShape(JSON.parse(value))
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
              value = normalizeQuoteShape(JSON.parse(value))
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
        if (error instanceof Error && error.message === "Circuit breaker ativo") {
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

