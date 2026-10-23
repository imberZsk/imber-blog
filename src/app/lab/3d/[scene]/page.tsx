import Link from 'next/link'
import { notFound } from 'next/navigation'
import { THREE_DEMOS } from '../config'
import { ThreeScene } from '@/components/lab/three-scene'

/** 根据 scene 路由参数展示登记过的可交互 3D 实验。 */
export default async function ThreeScenePage({ params }: { params: Promise<{ scene: string }> }) {
  /** 浏览器请求的场景标识。 */
  const { scene } = await params
  /** 与当前路由对应的场景描述。 */
  const demo = THREE_DEMOS.find((item) => item.slug === scene)
  if (!demo) notFound()

  return (
    <main className="mx-auto max-w-7xl px-5 py-6">
      <Link href="/lab/3d" className="text-mint text-sm">
        ← 全部 3D 场景
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{demo.title}</h1>
      <p className="text-muted-foreground mt-2 mb-5 text-sm">{demo.description}</p>
      <ThreeScene sceneSlug={demo.slug} />
    </main>
  )
}
