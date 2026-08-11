'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getKnowledgeListHref } from './article-anchor'
import { DEFAULT_KNOWLEDGE_TRACK, type KnowledgeTrackSlug } from './config'

/** 返回知识库链接在加载前后共用的外观。 */
export const KNOWLEDGE_RETURN_LINK_CLASS_NAME =
  'inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'

/** 返回知识库链接所需的当前文章信息。 */
interface KnowledgeReturnLinkProps {
  articlePath: string
  articleTrack: KnowledgeTrackSlug | null
  articleTopic: string
}

/**
 * 根据文章入口携带的来源参数恢复知识库筛选和原文章位置。
 * @param props 当前文章的路径、所属路线与模块。
 */
export function KnowledgeReturnLink({ articlePath, articleTrack, articleTopic }: KnowledgeReturnLinkProps) {
  /** 普通文章返回自身路线，公共总览文章回到默认路线。 */
  const returnTrack = articleTrack || DEFAULT_KNOWLEDGE_TRACK
  /** 返回知识库时用于恢复筛选和原文章位置的链接。 */
  const returnHref = getKnowledgeListHref({ track: returnTrack, module: articleTopic, focus: articlePath })

  return (
    <Link href={returnHref} className={KNOWLEDGE_RETURN_LINK_CLASS_NAME}>
      <ArrowLeft className="h-4 w-4" />
      返回知识库
    </Link>
  )
}
