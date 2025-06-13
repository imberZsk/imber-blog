/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'mdx'],
  reactStrictMode: false,
  experimental: {
    mdxRs: true
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.res.meizu.com',
        port: '',
        pathname: '/**'
      }
    ]
  }
}

const withMDX = require('@next/mdx')()
module.exports = withMDX(nextConfig)
