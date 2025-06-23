import './mdx.css'
import { TableOfContents } from '@/components/TableOfContents'
import { MDXContent } from '@/components/MDXContent'

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div
      className="mx-auto h-full w-full bg-[#191a1a]"
      style={
        {
          '--color': 'rgba(114, 114, 114, 0.2)',
          backgroundImage: `
            linear-gradient(0deg, transparent 24%, var(--color) 25%, var(--color) 26%, transparent 27%, transparent 74%, var(--color) 75%, var(--color) 76%, transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, var(--color) 25%, var(--color) 26%, transparent 27%, transparent 74%, var(--color) 75%, var(--color) 76%, transparent 77%, transparent)
          `,
          backgroundSize: '55px 55px'
        } as React.CSSProperties
      }
    >
      <div className="relative mx-auto max-w-7xl">
        <TableOfContents />
        <MDXContent>{children}</MDXContent>
      </div>
    </div>
  )
}
