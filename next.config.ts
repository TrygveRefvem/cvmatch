/** @type {import('next').NextConfig} */
import { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  },
  images: {
    domains: ['localhost'],
  },
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    OPENAI_API_BASE_URL: process.env.OPENAI_API_BASE_URL || '',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
      {
        source: '/batch/:path*',
        destination: '/batch/:path*',
      }
    ];
  },
  webpack: (config) => {
    if (!config.resolve) {
      config.resolve = {};
    }
    if (!config.resolve.fallback) {
      config.resolve.fallback = {};
    }
    config.resolve.fallback.fs = false;
    return config;
  },
};

export default config;
