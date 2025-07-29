"use client"

import Image from "next/image"
import { useState, useEffect } from "react"

const logos = [
  {
    src: "https://gwakkxqrbqiezvrsnzhb.supabase.co/storage/v1/object/public/images_innovagro/10d194c5-41ac-460b-91fa-ff09ee6e7b1a.png",
    alt: "Innovagro Brasil",
    width: 200,
    height: 53,
  },
  {
    src: "https://gwakkxqrbqiezvrsnzhb.supabase.co/storage/v1/object/public/images_innovagro/89601b75-4b8a-4cd3-9ce7-77b0ee648374.png",
    alt: "Powered by",
    width: 120,
    height: 36,
  }
]

export function LoadingScreen() {
  const [selectedLogo, setSelectedLogo] = useState(logos[0])

  useEffect(() => {
    // Seleciona uma logo aleatória quando o componente monta
    const randomIndex = Math.floor(Math.random() * logos.length)
    setSelectedLogo(logos[randomIndex])
  }, [])

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center">
      <Image
        src={selectedLogo.src}
        alt={selectedLogo.alt}
        width={selectedLogo.width}
        height={selectedLogo.height}
        className="mb-8 h-12 sm:h-14 lg:h-16 w-auto"
      />
      <div className="w-16 h-16 border-t-4 border-white border-solid rounded-full animate-spin opacity-90"></div>
      <p className="mt-4 text-foreground">Carregando dados do mercado...</p>
    </div>
  )
}

