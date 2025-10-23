import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
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
