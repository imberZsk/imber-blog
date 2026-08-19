'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { InteractiveMindmap } from '@/components/interactive-mindmap'
import { KnowledgeLanguageSwitch } from '@/components/knowledge-language-switch'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui'
import type { MindmapSummary } from '@/lib/mindmaps'
import type { KnowledgeLanguage } from '@/lib/knowledge-language'

/** 思维导图画布的客户端参数。 */
interface MindmapViewerProps {
  /** 当前页面展示的思维导图标识。 */
  currentSlug: string
  /** TypeScript 与 Python 对应的 Markmap Markdown。 */
  markdownByLanguage: Record<KnowledgeLanguage, string>
  /** 可从当前页面直接切换的全部思维导图。 */
  mindmaps: MindmapSummary[]
  /** 当前画布的无障碍名称与页面标题。 */
  title: string
  /** 服务端从当前请求 URL 解析出的首屏语言。 */
  initialLanguage: KnowledgeLanguage
}

/**
 * 把 Markdown 层级渲染为可缩放、拖动和折叠的 SVG 思维导图。
 * @param props 当前思维导图、全部可切换导图及画布标题。
 */
export function MindmapViewer({ currentSlug, markdownByLanguage, mindmaps, title, initialLanguage }: MindmapViewerProps) {
  /** 在导图之间执行客户端导航，避免整页刷新。 */
  const router = useRouter()
  /** 当前展示的大类导图代码语言。 */
  const [language, setLanguage] = useState<KnowledgeLanguage>(initialLanguage)

  /**
   * 跳转到用户在下拉菜单中选中的思维导图。
   * @param href 目标思维导图的规范链接。
   */
  const handleMindmapChange = (href: string): void => {
    router.push(`${href}?lang=${language}`)
  }

  /**
   * 原子切换大类导图内容并更新可分享 URL。
   * @param nextLanguage 用户选择的新语言。
   */
  const handleLanguageChange = (nextLanguage: KnowledgeLanguage): void => {
    /** 当前浏览器地址的可变副本。 */
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set('lang', nextLanguage)
    window.history.replaceState(window.history.state, '', nextUrl)
    setLanguage(nextLanguage)
  }

  return (
    <InteractiveMindmap
      markdown={markdownByLanguage[language]}
      title={title}
      variant="page"
      pageTitleControl={
        <div className="flex flex-wrap items-center gap-2">
          <KnowledgeLanguageSwitch language={language} onLanguageChange={handleLanguageChange} />
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              aria-label="切换思维导图"
              className="w-48 max-w-full justify-between rounded-md px-3 shadow-sm"
            >
              <span className="truncate">{title}</span>
              <ChevronDown className="text-muted-foreground ml-2" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
            {mindmaps.map((mindmap) => {
              /** 当前菜单项是否对应正在展示的思维导图。 */
              const isCurrentMindmap = mindmap.slug === currentSlug

              return (
                <DropdownMenuItem
                  key={mindmap.slug}
                  aria-current={isCurrentMindmap ? 'page' : undefined}
                  className="cursor-pointer"
                  onSelect={() => handleMindmapChange(mindmap.href)}
                >
                  <span className="truncate">{mindmap.title}</span>
                  {isCurrentMindmap ? <Check className="text-mint ml-auto" aria-hidden="true" /> : null}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    />
  )
}
