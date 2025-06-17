"use client"

import Image from "next/image"

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center">
      <Image
        src="https://gwakkxqrbqiezvrsnzhb.supabase.co/storage/v1/object/public/images_innovagro/10d194c5-41ac-460b-91fa-ff09ee6e7b1a.png"
        alt="Innovagro Brasil"
        width={200}
        height={53}
        className="mb-8"
      />
      <div className="w-16 h-16 border-t-4 border-white border-solid rounded-full animate-spin"></div>
      <p className="mt-4 text-foreground">Carregando dados do mercado...</p>
    </div>
  )
}

