import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  eslint: {
    // ✅ Skip linting during Vercel (or any) production build
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // ✅ Alias @ to src for imports
    config.resolve.alias['@'] = path.resolve(__dirname, 'src')

    if (isServer) {
      // Prevent server build from trying to include browser-only modules
      config.resolve.alias.canvas = false
      config.resolve.alias.encoding = false
      config.resolve.alias['pdfjs-dist'] = false
    }

    return config
  },
}

export default nextConfig
