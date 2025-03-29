/** @type {import('next').NextConfig} */
const nextConfig = {
  // External packages at the top level
  serverExternalPackages: ['pdf-parse', 'puppeteer-core'],
  
  // Disable TypeScript/ESLint errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Add experimental features
  experimental: {
    serverActions: true,
  }
}

module.exports = nextConfig
