import type { NextConfig } from 'next'

const rawApiProxyTarget = (process.env.API_PROXY_TARGET ?? process.env.API_BASE_URL ?? 'http://api:4000').replace(/\/+$/, '')
const apiProxyTarget = rawApiProxyTarget.endsWith('/api') ? rawApiProxyTarget.slice(0, -4) : rawApiProxyTarget

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH,
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination: `${apiProxyTarget}/api/:path*`
      }
    ]
  },
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/home',
        permanent: true,
        locale: false
      }
    ]
  }
}

export default nextConfig
