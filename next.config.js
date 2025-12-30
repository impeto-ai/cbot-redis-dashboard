/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desabilitar cache estático para todas as páginas
  reactStrictMode: true,

  // Configurar imagens permitidas (usando remotePatterns para Next.js 16+)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gwakkxqrbqiezvrsnzhb.supabase.co',
        pathname: '/**',
      },
    ],
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

