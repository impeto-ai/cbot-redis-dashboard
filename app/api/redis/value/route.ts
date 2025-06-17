import { NextResponse } from "next/server"
import { getValue } from "@/lib/redis-direct"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get("key")

    if (!key) {
      return NextResponse.json({ error: "Chave não fornecida" }, { status: 400 })
    }

    const value = await getValue(key)

    return NextResponse.json({ key, value })
  } catch (error) {
    console.error("Erro ao buscar valor do Redis:", error)
    return NextResponse.json({ error: "Falha ao buscar valor" }, { status: 500 })
  }
}

