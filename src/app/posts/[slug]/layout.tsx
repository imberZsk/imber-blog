// import './mdx.css'
// import { TableOfContents } from '@/components/TableOfContents'
// import { MDXContent } from '@/components/MDXContent'

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="relative mx-auto min-h-screen w-full bg-white dark:bg-[#191a1a]">
      <div
        className="fixed top-0 left-0 mx-auto h-screen w-full"
        style={
          {
            '--color': 'rgba(114, 114, 114, 0.1)',
            '--color-dark': 'rgba(114, 114, 114, 0.2)',
            backgroundImage: `
            linear-gradient(0deg, transparent 24%, var(--color) 25%, var(--color) 26%, transparent 27%, transparent 74%, var(--color) 75%, var(--color) 76%, transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, var(--color) 25%, var(--color) 26%, transparent 27%, transparent 74%, var(--color) 75%, var(--color) 76%, transparent 77%, transparent)
          `,
            backgroundSize: '55px 55px'
          } as React.CSSProperties
        }
      ></div>
      <div
        className="fixed top-0 left-0 mx-auto hidden h-screen w-full dark:block"
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
      ></div>
      {/* <TableOfContents /> */}
      {children}
    </div>
  )
}
