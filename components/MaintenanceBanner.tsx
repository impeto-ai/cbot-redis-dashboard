"use client"

export function MaintenanceBanner() {
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE !== "true") return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 max-w-lg w-full rounded-lg border border-yellow-500/50 bg-gray-900 p-8 text-center shadow-2xl">
        <div className="mb-4 text-5xl">&#9888;</div>
        <h1 className="mb-3 text-2xl font-bold text-yellow-400">
          Em Manuten&ccedil;&atilde;o
        </h1>
        <p className="text-gray-300 text-base leading-relaxed">
          Estamos passando por uma manuten&ccedil;&atilde;o no sistema. Nossa equipe j&aacute; est&aacute;
          trabalhando para restabelecer o servi&ccedil;o o mais r&aacute;pido poss&iacute;vel.
          Agradecemos a compreens&atilde;o.
        </p>
        <div className="mt-6 h-1 w-24 mx-auto rounded bg-yellow-500/60" />
      </div>
    </div>
  )
}
