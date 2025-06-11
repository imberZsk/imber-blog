import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/header'
import { ChatBot } from '@/components/ChatBot'
import { ThemeProvider } from 'next-themes'

export const metadata: Metadata = {
  title: 'imber | maybe a blog',
  description: 'imber 的博客'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="" suppressHydrationWarning>
      <body suppressHydrationWarning className="">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Header />
          {children}
          <ChatBot />
        </ThemeProvider>
      </body>
    </html>
  )
}
