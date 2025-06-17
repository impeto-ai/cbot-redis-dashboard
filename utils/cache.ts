interface CacheData {
  timestamp: number
  data: any
}

const cache: Map<string, CacheData> = new Map()
const CACHE_DURATION = 10000 // 10 segundos

export function shouldFetchData(key: string): boolean {
  const cachedData = cache.get(key)
  if (!cachedData) return true

  const now = Date.now()
  return now - cachedData.timestamp > CACHE_DURATION
}

export function getCachedData(key: string): any | null {
  const cachedData = cache.get(key)
  if (!cachedData) return null

  return cachedData.data
}

export function setCachedData(key: string, data: any): void {
  cache.set(key, {
    timestamp: Date.now(),
    data,
  })
}

export function hasDataChanged(newData: any, oldData: any): boolean {
  if (!oldData) return true
  return JSON.stringify(newData) !== JSON.stringify(oldData)
}

