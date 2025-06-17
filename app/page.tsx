import Dashboard from "@/components/Dashboard"
import { Marquee } from "@/components/Marquee"

// Adicionar estas configurações para garantir que a página seja dinâmica
export const dynamic = "force-dynamic"
export const revalidate = 0

export default function Home() {
  return (
    <>
      <Marquee />
      <Dashboard />
    </>
  )
}

