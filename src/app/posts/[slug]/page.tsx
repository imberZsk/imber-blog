export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { default: Post } = await import(`@/content/${slug}.mdx`)

  return <Post />
}

export function generateStaticParams() {
  return [
    { slug: 'next-mdx' },
    { slug: 'write' },
    { slug: 'this' },
    { slug: 'leetcode' },
    { slug: 'safe' },
    { slug: 'sandpack' },
    { slug: 'promise' }
  ]
}

export const dynamicParams = false
