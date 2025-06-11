export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { default: Post } = await import(`@/content/${slug}.mdx`)

  return <Post />
}

export function generateStaticParams() {
  return [
    { slug: 'write' },
    { slug: 'this' },
    { slug: 'leetcode' },
    { slug: 'safe' },
    { slug: 'sandpack-mdx' },
    { slug: 'promise' },
    { slug: 'react-write' },
    { slug: 'print' },
    { slug: 'responsive' },
    { slug: 'adaptive' }
  ]
}

export const dynamicParams = false
