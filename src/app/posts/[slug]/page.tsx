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
    { slug: 'print' },
    { slug: 'responsive' },
    { slug: 'adaptive' },
    { slug: 'cursor-mcp' },
    { slug: 'animate' },
    { slug: 'gallery' },
    { slug: 'strapi-supabase' },
    { slug: 'skill' },
    { slug: 'tailwind' },
    { slug: 'typescript' },
    { slug: 'react' },
    { slug: 'editor' },
    { slug: 'webpack' }
  ]
}

export const dynamicParams = false
