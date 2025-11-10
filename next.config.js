/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desabilitar cache estático para todas as páginas
  reactStrictMode: true,

  // Suporte a Web Workers
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.output.publicPath = `/_next/`
    }
    return config
  },

  // Configurar imagens permitidas
  images: {
    domains: ['gwakkxqrbqiezvrsnzhb.supabase.co'],
    unoptimized: true,
  },

  // Configurar headers para evitar cache
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig

