import { NextResponse } from "next/server"
import { getAllKeys } from "@/lib/redis-direct"

export async function GET() {
  try {
    const keys = await getAllKeys()

    return NextResponse.json({ keys })
  } catch (error) {
    console.error("Erro ao buscar chaves do Redis:", error)
    return NextResponse.json({ error: "Falha ao buscar chaves" }, { status: 500 })
  }
}

