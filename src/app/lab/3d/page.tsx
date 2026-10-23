'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Search } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { useMemo, useState } from 'react'
import { THREE_ASSET_ROOT as THREE_BASE_PATH, THREE_DEMOS } from './config'

// THREE_SEARCH_PLACEHOLDER 描述 3D 场景搜索框可检索的内容。
const THREE_SEARCH_PLACEHOLDER = '搜索场景、模型或技术类型'

/** 渲染统一视觉语言下的 3D 实验索引页。 */
export default function Page() {
  // searchQuery 存储用户输入的 3D 场景搜索词。
  const [searchQuery, setSearchQuery] = useState('')
  // filteredDemos 存储标题、说明或技术类型命中搜索词的 3D 场景。
  const filteredDemos = useMemo(() => {
    // normalizedQuery 存储去除首尾空格并统一为小写的搜索词。
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase()

    if (!normalizedQuery) {
      return THREE_DEMOS
    }

    return THREE_DEMOS.filter((demo) =>
      `${demo.title} ${demo.description} ${demo.slug} ${demo.type}`.toLocaleLowerCase().includes(normalizedQuery)
    )
  }, [searchQuery])

  /** 同步用户输入的 3D 场景搜索词。 */
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value)
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1180px] px-5 py-10 md:px-8">
      <header className="border-border mb-8 grid gap-6 border-b pb-10 md:grid-cols-[1fr_360px] md:items-end">
        <div>
          <p className="text-mint mb-4 font-mono text-xs font-bold">SPATIAL STUDIES / 06 SCENES</p>
          <h1 className="text-foreground max-w-3xl text-3xl leading-tight font-semibold md:text-4xl">3D 场景</h1>
        </div>
        <p className="text-muted-foreground m-0 text-sm leading-7 md:text-base">
          从材质、环境贴图到 GLTF 与 FBX 模型，逐步探索 Three.js 在浏览器中的空间表达与交互方式。
        </p>
      </header>

      <section
        className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        aria-label="搜索 3D 场景"
      >
        <label className="border-border bg-card focus-within:border-mint flex h-12 w-full max-w-xl items-center gap-3 rounded-md border px-4 transition-colors">
          <Search className="text-mint h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">搜索 3D 场景</span>
          <input
            className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={THREE_SEARCH_PLACEHOLDER}
          />
        </label>
        <p className="text-muted-foreground m-0 font-mono text-xs">
          {filteredDemos.length} / {THREE_DEMOS.length} SCENES
        </p>
      </section>

      {filteredDemos.length > 0 ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="3D 实验列表">
          {filteredDemos.map((demo) => (
            <article
              className="group border-border bg-card hover:border-mint overflow-hidden rounded-lg border transition-colors"
              key={demo.slug}
            >
              <Link href={`/lab/3d/${demo.slug}`}>
                <div className="border-border bg-muted aspect-[16/10] overflow-hidden border-b">
                  <Image
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    src={`${THREE_BASE_PATH}/${demo.image}`}
                    width={800}
                    height={500}
                    alt={`${demo.title}预览`}
                    unoptimized
                  />
                </div>
                <div className="min-h-36 p-4">
                  <p className="text-mint mb-2 font-mono text-[11px] font-bold">
                    {String(THREE_DEMOS.indexOf(demo) + 1).padStart(2, '0')} / {demo.type}
                  </p>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-foreground m-0 text-lg font-semibold">{demo.title}</h2>
                      <p className="text-muted-foreground mt-2 mb-0 text-sm leading-6 font-normal">
                        {demo.description}
                      </p>
                    </div>
                    <span
                      className="text-muted-foreground group-hover:text-mint mt-1 text-lg transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <div className="border-border text-muted-foreground flex min-h-60 items-center justify-center rounded-lg border border-dashed text-sm">
          没有找到匹配的 3D 场景
        </div>
      )}
    </main>
  )
}
