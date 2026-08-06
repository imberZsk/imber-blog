import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Header } from '@/components/layout'
import { ChatBot } from '@/components/common'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ]
}

export const metadata: Metadata = {
  metadataBase: new URL('https://imber.netlify.app'),
  title: {
    default: 'Imber | AI Application Developer',
    template: '%s | Imber的博客'
  },
  description: 'Imber的个人博客 - 高级前端背景的AI应用开发工程师，分享全栈开发、AI编程与大模型应用实践',
  keywords: ['Imber', 'AI应用开发', 'AI编程', 'RAG', 'Agent', '全栈开发', '前端开发', '个人博客', '技术分享'],
  authors: [{ name: 'Imber', url: 'https://imber.netlify.app' }],
  creator: 'Imber',
  publisher: 'Imber',
  formatDetection: {
    email: false,
    address: false,
    telephone: false
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: 'https://imber.netlify.app',
    siteName: 'Imber的博客',
    title: 'Imber | AI Application Developer',
    description: '高级前端背景的AI应用开发工程师，分享全栈开发、AI编程与大模型应用实践',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Imber的博客'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Imber | AI Application Developer',
    description: '高级前端背景的AI应用开发工程师，分享全栈开发、AI编程与大模型应用实践',
    images: ['/og-image.png']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#000000'
      }
    ]
  },
  // manifest: '/site.webmanifest',
  alternates: {
    canonical: 'https://imber.netlify.app'
  },
  category: 'technology'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="" suppressHydrationWarning>
      <body suppressHydrationWarning className="">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <Header />
          {children}
          <ChatBot />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
