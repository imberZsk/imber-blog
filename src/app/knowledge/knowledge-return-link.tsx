'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getKnowledgeListHref } from './article-anchor'
import { LANGCHAIN_MODULE_LABEL } from '@/lib/knowledge-language'
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
  /** LangChain 是 AI 应用路线的默认模块，返回列表时无需重复写入模块参数。 */
  const returnModule = articleTopic === LANGCHAIN_MODULE_LABEL ? null : articleTopic
  /** 返回知识库并恢复当前文章位置的地址。 */
  const returnHref = getKnowledgeListHref({ track: returnTrack, module: returnModule, focus: articlePath })

  return (
    <Link href={returnHref} className={KNOWLEDGE_RETURN_LINK_CLASS_NAME}>
      <ArrowLeft className="h-4 w-4" />
      返回知识库
    </Link>
  )
}
