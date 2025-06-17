"use client"

import Image from "next/image"
import { useMarketData } from "@/hooks/useMarketData"

export function Header() {
  const { marketStatus } = useMarketData()

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center p-2 sm:p-4 bg-[#1A1A1A] border-b border-gray-800">
      <div className="flex items-center gap-4 mb-2 sm:mb-0">
        <Image
          src="https://gwakkxqrbqiezvrsnzhb.supabase.co/storage/v1/object/public/images_innovagro/10d194c5-41ac-460b-91fa-ff09ee6e7b1a.png"
          alt="Innovagro Brasil"
          width={150}
          height={40}
        />
        <div
          className={`w-2 h-2 rounded-full ${marketStatus.status === "open" ? "bg-green-500" : "bg-red-500"} animate-[blink_1s_ease-in-out_infinite] my-auto ml-2`}
        />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Powered By:</span>
          <Image
            src="https://gwakkxqrbqiezvrsnzhb.supabase.co/storage/v1/object/public/images_innovagro/89601b75-4b8a-4cd3-9ce7-77b0ee648374.png"
            alt="Powered by"
            width={60}
            height={18}
          />
        </div>
      </div>
    </div>
  )
}

