import './mdx.css'
import { TableOfContents } from '@/components/TableOfContents'
import { MDXContent } from '@/components/MDXContent'

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="relative mx-auto max-w-7xl">
      <TableOfContents />
      <MDXContent>{children}</MDXContent>
    </div>
  )
}
