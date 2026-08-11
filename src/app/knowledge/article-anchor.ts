import { DEFAULT_KNOWLEDGE_TRACK, type KnowledgeTrackSlug } from './config'

/** 知识库列表中用于恢复文章位置的锚点前缀。 */
const KNOWLEDGE_ARTICLE_ANCHOR_PREFIX = 'article-'

/** 知识库列表中用于定位细分类标题的锚点前缀。 */
const KNOWLEDGE_SUBTOPIC_ANCHOR_PREFIX = 'subtopic-'

/** 生成知识库返回地址所需的筛选与定位信息。 */
interface KnowledgeListLocation {
  track: KnowledgeTrackSlug
  module?: string | null
  focus?: string | null
}

/**
 * 返回一条学习路线对应的静态知识库地址。
 * @param track 当前需要打开的学习路线。
 */
export function getKnowledgeTrackHref(track: KnowledgeTrackSlug): string {
  return track === DEFAULT_KNOWLEDGE_TRACK ? '/knowledge' : `/knowledge/track/${track}`
}

/**
 * 为知识库列表中的文章生成稳定锚点。
 * @param articlePath 文章在知识库中的公开路径。
 */
export function getKnowledgeArticleAnchor(articlePath: string): string {
  return `${KNOWLEDGE_ARTICLE_ANCHOR_PREFIX}${articlePath}`
}

/**
 * 生成可恢复筛选和文章位置的知识库地址。
 * @param location 当前学习路线、可选模块和文章路径。
 */
export function getKnowledgeListHref({ track, module, focus }: KnowledgeListLocation): string {
  /** 知识库列表需要持久化的筛选参数。 */
  const searchParams = new URLSearchParams()

  if (module) {
    searchParams.set('module', module)
  }

  if (focus) {
    searchParams.set('focus', focus)
  }

  /** 当前学习路线对应的静态页面地址。 */
  const trackHref = getKnowledgeTrackHref(track)
  /** 仅在存在模块或定位信息时添加查询字符串。 */
  const search = searchParams.size > 0 ? `?${searchParams.toString()}` : ''
  /** 有定位目标时使用的文章锚点。 */
  const articleHash = focus ? `#${getKnowledgeArticleAnchor(focus)}` : ''
  return `${trackHref}${search}${articleHash}`
}

/**
 * 为一级模块中的细分类标题生成稳定锚点。
 * @param moduleLabel 细分类所属的一级模块名称。
 * @param subtopicLabel 课程或技术细分类名称。
 */
export function getKnowledgeSubtopicAnchor(moduleLabel: string, subtopicLabel: string): string {
  return `${KNOWLEDGE_SUBTOPIC_ANCHOR_PREFIX}${moduleLabel}-${subtopicLabel}`
}
