import { Tiptap } from '@/components/editor'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  console.log(slug)

  return <Tiptap></Tiptap>
}

export function generateStaticParams() {
  return [{ slug: 'editor' }]
}

export const dynamicParams = false
