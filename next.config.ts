/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'mdx'],
  reactStrictMode: false,
  experimental: {
    mdxRs: true
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.res.meizu.com',
        port: '',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'ssm.res.meizu.com',
        port: '',
        pathname: '/**'
      }
    ]
  }
}

const withMDX = require('@next/mdx')()
module.exports = withMDX(nextConfig)
