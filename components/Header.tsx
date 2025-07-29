"use client"

import Image from "next/image"
import { useMarketData } from "@/hooks/useMarketData"
import { ConnectionStatus } from "@/components/ConnectionStatus"

export function Header() {
  const { marketStatus, error, isLoading } = useMarketData()

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center p-2 sm:p-4 bg-[#1A1A1A] border-b border-gray-800">
      <div className="flex items-center gap-4 mb-2 sm:mb-0">
        <Image
          src="https://gwakkxqrbqiezvrsnzhb.supabase.co/storage/v1/object/public/images_innovagro/10d194c5-41ac-460b-91fa-ff09ee6e7b1a.png"
          alt="Innovagro Brasil"
          width={200}
          height={54}
          className="h-8 sm:h-10 lg:h-12 w-auto"
        />
        <div
          className={`w-2 h-2 rounded-full ${marketStatus.status === "open" ? "bg-green-500" : "bg-red-500"} animate-[blink_3s_ease-in-out_infinite] my-auto ml-2`}
        />
      </div>
      <div className="flex items-center gap-4">
        {/* Status de conexão movido para o cabeçalho */}
        <ConnectionStatus 
          isLoading={isLoading} 
          error={error} 
          isInHeader={true}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Powered By:</span>
          <Image
            src="https://gwakkxqrbqiezvrsnzhb.supabase.co/storage/v1/object/public/images_innovagro/89601b75-4b8a-4cd3-9ce7-77b0ee648374.png"
            alt="Powered by"
            width={80}
            height={24}
            className="h-4 sm:h-5 lg:h-6 w-auto"
          />
        </div>
      </div>
    </div>
  )
}

