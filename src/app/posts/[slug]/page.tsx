export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  return <div>Hello {slug}</div>
}

export function generateStaticParams() {
  return [{ slug: 'editor' }]
}

export const dynamicParams = false
