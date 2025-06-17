import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/', '/private/', '*.json', '/_vercel/', '/.well-known/']
      },
      {
        userAgent: 'GPTBot',
        disallow: '/'
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: '/'
      },
      {
        userAgent: 'Google-Extended',
        disallow: '/'
      },
      {
        userAgent: 'CCBot',
        disallow: '/'
      }
    ],
    sitemap: 'https://imber.netlify.app/sitemap.xml',
    host: 'https://imber.netlify.app'
  }
}
