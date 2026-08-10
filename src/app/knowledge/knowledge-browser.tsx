'use client'

import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Network, Search } from 'lucide-react'
import type { KnowledgeArticle, KnowledgeArticleKind } from '@/lib/knowledge'
import { Button, Input } from '@/components/ui'
import { getKnowledgeArticleAnchor, getKnowledgeListHref, getKnowledgeSubtopicAnchor } from './article-anchor'
import { KNOWLEDGE_TRACKS, type KnowledgeTrackSlug } from './config'

/** 知识库列表每次展示或追加的文章数量。 */
const ARTICLE_PAGE_SIZE = 80

/** 匹配列表左侧已经单独展示、不应在标题中重复出现的模块内课号。 */
const ARTICLE_TITLE_ORDER_PATTERN = /^第\s*\d+\s*课(?:实践|扩展)?[：:]\s*/

/** 不参与正式模块编号的知识库总览名称。 */
const OVERVIEW_MODULE_LABEL = '总览'

/** 右侧模块标题进入固定页头下方后触发侧栏联动的视口位置。 */
const MODULE_SCROLL_SPY_TOP_PX = 112

/** 返回文章列表时目标文章与固定页头之间保留的距离。 */
const FOCUSED_ARTICLE_SCROLL_OFFSET_PX = 96

/** 用于定位右侧模块标题的属性选择器。 */
const MODULE_HEADING_SELECTOR = '[data-knowledge-module-heading]'

/** 用于定位右侧文章列表细分类标题的属性选择器。 */
const SUBTOPIC_HEADING_SELECTOR = '[data-knowledge-subtopic-heading]'

/** 知识库地址中记录当前可见模块的查询参数名。 */
const MODULE_QUERY_PARAM = 'module'

/** 文章用途对应的初学者友好名称。 */
const ARTICLE_KIND_LABELS: Record<KnowledgeArticleKind, string> = {
  guide: '学习指南',
  lesson: '主课',
  practice: '实践',
  reference: '扩展'
}

/** 知识库列表页的可交互参数。 */
interface KnowledgeBrowserProps {
  articles: KnowledgeArticle[]
  activeTrack: KnowledgeTrackSlug
  activeModule: string | null
  focusedArticlePath: string | null
}

/**
 * 仅在导航容器内部居中选中项，避免原生 scrollIntoView 连带滚动整个页面。
 * @param navigationElement 当前可横向或纵向滚动的导航容器。
 * @param activeLinkElement 当前需要恢复到可见区域的选中链接。
 */
function centerActiveNavigationItem(
  navigationElement: HTMLElement | null,
  activeLinkElement: HTMLAnchorElement | null
) {
  if (!navigationElement || !activeLinkElement) {
    return
  }

  /** 导航容器相对当前视口的位置和尺寸。 */
  const navigationRect = navigationElement.getBoundingClientRect()
  /** 当前选中链接相对当前视口的位置和尺寸。 */
  const activeLinkRect = activeLinkElement.getBoundingClientRect()

  if (navigationElement.scrollWidth > navigationElement.clientWidth) {
    /** 使选中项在横向导航中居中的滚动位置。 */
    const horizontalOffset =
      navigationElement.scrollLeft +
      activeLinkRect.left -
      navigationRect.left -
      (navigationElement.clientWidth - activeLinkElement.clientWidth) / 2
    navigationElement.scrollLeft = horizontalOffset
  }

  if (navigationElement.scrollHeight > navigationElement.clientHeight) {
    /** 使选中项在纵向导航中靠上展示的滚动位置。 */
    const verticalOffset = navigationElement.scrollTop + activeLinkRect.top - navigationRect.top
    navigationElement.scrollTop = verticalOffset
  }
}

/**
 * 提供知识文章的主题筛选、搜索和列表导航。
 * @param props 全部文章元数据以及当前 URL 选中的学习主线和模块。
 */
export function KnowledgeBrowser({ articles, activeTrack, activeModule, focusedArticlePath }: KnowledgeBrowserProps) {
  /** 三条学习主线所在的可滚动导航容器。 */
  const trackNavigationRef = useRef<HTMLElement>(null)
  /** 当前主线模块所在的可滚动导航容器。 */
  const moduleNavigationRef = useRef<HTMLElement>(null)
  /** 当前主线链接，用于在窄屏导航中恢复选中项位置。 */
  const activeTrackLinkRef = useRef<HTMLAnchorElement>(null)
  /** 当前模块链接，用于在刷新带参数的链接后恢复选中项位置。 */
  const activeModuleLinkRef = useRef<HTMLAnchorElement>(null)
  /** 右侧文章列表容器，用于判断全部模块模式下当前滚动到的模块。 */
  const articleListRef = useRef<HTMLDivElement>(null)
  /** 用户当前输入的搜索关键词。 */
  const [query, setQuery] = useState('')
  /** 全部模块模式下根据右侧滚动位置识别出的当前模块。 */
  const [visibleModule, setVisibleModule] = useState<string | null>(null)
  /** 根据右侧滚动位置识别出的当前课程或技术细分类。 */
  const [visibleSubtopic, setVisibleSubtopic] = useState<string | null>(null)
  /** 从浏览器历史记录恢复的文章路径，用于处理 Next 复用旧列表实例的场景。 */
  const [historyFocusedArticlePath, setHistoryFocusedArticlePath] = useState<string | null>(focusedArticlePath)
  /** 服务端参数优先，否则使用浏览器历史事件同步出的返回目标。 */
  const effectiveFocusedArticlePath = focusedArticlePath || historyFocusedArticlePath
  /** 当前筛选范围内用于恢复位置的文章序号。 */
  const focusedArticleIndex = articles
    .filter(
      (article) =>
        (article.track === null || article.track === activeTrack) &&
        (activeModule === null || article.topic === activeModule)
    )
    .findIndex((article) => article.path === effectiveFocusedArticlePath)
  /** 为确保返回锚点已进入 DOM 而需要预先展示的文章数量。 */
  const initialVisibleCount =
    focusedArticleIndex < 0
      ? ARTICLE_PAGE_SIZE
      : Math.ceil((focusedArticleIndex + 1) / ARTICLE_PAGE_SIZE) * ARTICLE_PAGE_SIZE
  /** 当前允许展示的最大文章数量。 */
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount)
  /** 当前主线对应的标签和思维导图链接。 */
  const activeTrackConfig = KNOWLEDGE_TRACKS.find((track) => track.slug === activeTrack) || KNOWLEDGE_TRACKS[0]
  /** 当前主线按照实体内容目录顺序声明的一级模块。 */
  const activeTrackModules = activeTrackConfig.modules
  /** 当前学习主线下按照实体目录顺序排列的模块与文章数量。 */
  const moduleOptions = useMemo(() => {
    /** 用于累计当前主线各一级模块文章数量的映射。 */
    const moduleCounts = new Map<string, number>()

    articles.forEach((article) => {
      if (article.track !== null && article.track !== activeTrack) {
        return
      }

      moduleCounts.set(article.topic, (moduleCounts.get(article.topic) || 0) + 1)
    })

    /** 公共总览内容的文章数量。 */
    const overviewCount = moduleCounts.get(OVERVIEW_MODULE_LABEL) || 0
    /** 总览和当前确有文章的一级模块组成的固定顺序筛选项。 */
    const orderedModuleOptions = activeTrackModules
      .map((label) => ({ label, count: moduleCounts.get(label) || 0 }))
      .filter((moduleOption) => moduleOption.count > 0)

    return [
      ...(overviewCount > 0 ? [{ label: OVERVIEW_MODULE_LABEL, count: overviewCount }] : []),
      ...orderedModuleOptions
    ]
  }, [activeTrack, activeTrackModules, articles])
  /** 去除总览后从 01 开始编号的正式学习模块。 */
  const numberedModuleOptions = useMemo(
    () => moduleOptions.filter((moduleOption) => moduleOption.label !== OVERVIEW_MODULE_LABEL),
    [moduleOptions]
  )
  /** 经过主题和关键词过滤后的文章列表。 */
  const filteredArticles = useMemo(() => {
    /** 便于进行不区分大小写匹配的关键词。 */
    const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN')
    /** 总览和当前路线实体模块在正文中的固定展示顺序。 */
    const orderedModuleLabels = [OVERVIEW_MODULE_LABEL, ...activeTrackModules]
    /** 一级模块名称对应的正文排序位置。 */
    const moduleOrderByLabel = new Map(orderedModuleLabels.map((label, index) => [label, index]))

    return articles
      .filter((article) => {
        /** 总览文章在每条主线中可见，其余文章按主线归类。 */
        const matchesTrack = article.track === null || article.track === activeTrack
        /** 选中模块后只展示该模块文章，不混入公共总览。 */
        const matchesModule = activeModule === null || article.topic === activeModule
        /** 当前文章的标题或路径是否命中关键词。 */
        const matchesQuery =
          normalizedQuery.length === 0 ||
          article.title.toLocaleLowerCase('zh-CN').includes(normalizedQuery) ||
          article.displayPath.toLocaleLowerCase('zh-CN').includes(normalizedQuery)

        return matchesTrack && matchesModule && matchesQuery
      })
      .sort((leftArticle, rightArticle) => {
        /** 左侧文章一级模块在实体目录中的位置。 */
        const leftModuleOrder = moduleOrderByLabel.get(leftArticle.topic) ?? Number.MAX_SAFE_INTEGER
        /** 右侧文章一级模块在实体目录中的位置。 */
        const rightModuleOrder = moduleOrderByLabel.get(rightArticle.topic) ?? Number.MAX_SAFE_INTEGER

        return leftModuleOrder - rightModuleOrder
      })
  }, [activeModule, activeTrack, activeTrackModules, articles, query])
  /** 当前已进入页面 DOM 的文章列表。 */
  const visibleArticles = filteredArticles.slice(0, visibleCount)
  /** 左侧模块导航当前应高亮的模块；显式筛选优先于滚动识别结果。 */
  const highlightedModule = activeModule ?? visibleModule
  /** 各一级模块内每个细分类对应的完整文章数量。 */
  const subtopicCountsByModule = useMemo(() => {
    /** 一级模块名称到细分类文章数量的映射。 */
    const countsByModule = new Map<string, Map<string, number>>()

    filteredArticles.forEach((article) => {
      /** 当前文章所属一级模块的细分类数量映射。 */
      const moduleSubtopicCounts = countsByModule.get(article.topic) || new Map<string, number>()
      moduleSubtopicCounts.set(article.subtopic, (moduleSubtopicCounts.get(article.subtopic) || 0) + 1)
      countsByModule.set(article.topic, moduleSubtopicCounts)
    })

    return countsByModule
  }, [filteredArticles])
  /** 当前大模块中已渲染且包含多篇文章的细分类目录。 */
  const outlinedSubtopics = useMemo(() => {
    if (!highlightedModule) {
      return []
    }

    /** 防止同一细分类因多篇文章重复出现在右侧目录中。 */
    const visitedSubtopics = new Set<string>()

    return visibleArticles.flatMap((article) => {
      /** 当前细分类在所属大模块中的完整文章数量。 */
      const subtopicArticleCount = subtopicCountsByModule.get(article.topic)?.get(article.subtopic) || 0
      if (
        article.topic !== highlightedModule ||
        article.subtopic === article.topic ||
        subtopicArticleCount <= 1 ||
        visitedSubtopics.has(article.subtopic)
      ) {
        return []
      }

      visitedSubtopics.add(article.subtopic)
      return [{ label: article.subtopic, count: subtopicArticleCount }]
    })
  }, [highlightedModule, subtopicCountsByModule, visibleArticles])
  /** 当前高亮大模块从 01 开始的展示序号。 */
  const highlightedModuleOrder = numberedModuleOptions.findIndex(
    (moduleOption) => moduleOption.label === highlightedModule
  )

  /**
   * 在进入文章前把当前筛选和文章锚点写入现有历史记录，供浏览器返回恢复位置。
   * @param event 当前文章链接的鼠标点击事件。
   */
  const handleArticleNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    /** 当前链接对应的文章公开路径。 */
    const articlePath = event.currentTarget.dataset.articlePath
    if (!articlePath) {
      return
    }

    /** 浏览器返回时需要恢复的知识库列表地址。 */
    const returnListHref = getKnowledgeListHref({
      track: activeTrack,
      module: activeModule,
      focus: articlePath
    })

    // 修复浏览器返回丢失位置：进入文章前更新当前列表 history，文章页继续使用独立的干净路径。
    window.history.replaceState(window.history.state, '', returnListHref)
  }

  useEffect(() => {
    centerActiveNavigationItem(trackNavigationRef.current, activeTrackLinkRef.current)
    centerActiveNavigationItem(moduleNavigationRef.current, activeModuleLinkRef.current)
  }, [activeTrack, highlightedModule])

  useEffect(() => {
    /** 从当前地址栏同步浏览器返回时保存的文章路径。 */
    const syncHistoryFocusedArticlePath = () => {
      /** 当前知识库地址中持久化的文章定位参数。 */
      const currentFocusedArticlePath = new URL(window.location.href).searchParams.get('focus')
      setHistoryFocusedArticlePath(currentFocusedArticlePath)
    }

    syncHistoryFocusedArticlePath()
    window.addEventListener('popstate', syncHistoryFocusedArticlePath)
    window.addEventListener('pageshow', syncHistoryFocusedArticlePath)

    return () => {
      window.removeEventListener('popstate', syncHistoryFocusedArticlePath)
      window.removeEventListener('pageshow', syncHistoryFocusedArticlePath)
    }
  }, [])

  useEffect(() => {
    if (focusedArticleIndex < 0) {
      return
    }

    /** 为让返回目标进入 DOM 而需要展示的文章数量。 */
    const requiredVisibleCount = Math.ceil((focusedArticleIndex + 1) / ARTICLE_PAGE_SIZE) * ARTICLE_PAGE_SIZE
    // 修复客户端历史恢复复用旧分页状态：focus 更新后必须再次保证目标文章已经渲染。
    setVisibleCount((currentVisibleCount) => Math.max(currentVisibleCount, requiredVisibleCount))
  }, [focusedArticleIndex])

  useEffect(() => {
    if (!effectiveFocusedArticlePath || focusedArticleIndex < 0 || focusedArticleIndex >= visibleCount) {
      return
    }

    /** 等待分页扩容渲染完成后执行定位的动画帧。 */
    const animationFrameId = window.requestAnimationFrame(() => {
      /** 返回后需要重新定位并高亮的文章元素。 */
      const focusedArticleElement = document.getElementById(getKnowledgeArticleAnchor(effectiveFocusedArticlePath))
      if (!focusedArticleElement) {
        return
      }

      /** 扣除固定页头高度后的页面滚动位置。 */
      const focusedArticleTop =
        window.scrollY + focusedArticleElement.getBoundingClientRect().top - FOCUSED_ARTICLE_SCROLL_OFFSET_PX
      window.scrollTo({ top: focusedArticleTop, behavior: 'instant' })
    })

    return () => window.cancelAnimationFrame(animationFrameId)
  }, [effectiveFocusedArticlePath, focusedArticleIndex, visibleCount])

  useEffect(() => {
    /** 当前等待执行的滚动同步帧，用于合并连续滚动事件。 */
    let animationFrameId: number | null = null

    /** 根据右侧标题位置同步模块高亮与地址栏参数。 */
    const syncVisibleModule = () => {
      if (activeModule === null) {
        /** 当前文章列表中已经渲染的模块标题。 */
        const moduleHeadings = articleListRef.current?.querySelectorAll<HTMLElement>(MODULE_HEADING_SELECTOR) || []
        /** 已越过固定页头基准线的最后一个模块名称；总览对应全部模块。 */
        let nextVisibleModule: string | null = null

        moduleHeadings.forEach((moduleHeading) => {
          if (moduleHeading.getBoundingClientRect().top > MODULE_SCROLL_SPY_TOP_PX) {
            return
          }

          /** 当前标题记录的模块名称。 */
          const moduleLabel = moduleHeading.dataset.knowledgeModuleHeading || null
          nextVisibleModule = moduleLabel === OVERVIEW_MODULE_LABEL ? null : moduleLabel
        })

        setVisibleModule((currentModule) => (currentModule === nextVisibleModule ? currentModule : nextVisibleModule))

        /** 保留当前主线等参数，仅替换滚动对应的模块参数。 */
        const knowledgeUrl = new URL(window.location.href)
        if (nextVisibleModule) {
          knowledgeUrl.searchParams.set(MODULE_QUERY_PARAM, nextVisibleModule)
        } else {
          knowledgeUrl.searchParams.delete(MODULE_QUERY_PARAM)
        }

        /** 地址栏已经一致时不重复写入浏览器历史状态。 */
        const nextKnowledgePath = `${knowledgeUrl.pathname}${knowledgeUrl.search}${knowledgeUrl.hash}`
        const currentKnowledgePath = `${window.location.pathname}${window.location.search}${window.location.hash}`
        if (nextKnowledgePath !== currentKnowledgePath) {
          window.history.replaceState(window.history.state, '', nextKnowledgePath)
        }
      }

      /** 当前文章列表中已经渲染的细分类标题。 */
      const subtopicHeadings = articleListRef.current?.querySelectorAll<HTMLElement>(SUBTOPIC_HEADING_SELECTOR) || []
      /** 已越过固定页头基准线的最后一个细分类名称。 */
      let nextVisibleSubtopic: string | null = null

      subtopicHeadings.forEach((subtopicHeading) => {
        if (subtopicHeading.getBoundingClientRect().top > MODULE_SCROLL_SPY_TOP_PX) {
          return
        }

        nextVisibleSubtopic = subtopicHeading.dataset.knowledgeSubtopicHeading || null
      })

      setVisibleSubtopic((currentSubtopic) =>
        currentSubtopic === nextVisibleSubtopic ? currentSubtopic : nextVisibleSubtopic
      )
    }

    /** 将滚动与窗口尺寸变化合并到下一帧执行，避免高频读取布局。 */
    const scheduleVisibleModuleSync = () => {
      if (animationFrameId !== null) {
        return
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null
        syncVisibleModule()
      })
    }

    setVisibleModule(null)
    setVisibleSubtopic(null)
    scheduleVisibleModuleSync()
    window.addEventListener('scroll', scheduleVisibleModuleSync, { passive: true })
    window.addEventListener('resize', scheduleVisibleModuleSync)

    return () => {
      window.removeEventListener('scroll', scheduleVisibleModuleSync)
      window.removeEventListener('resize', scheduleVisibleModuleSync)
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [activeModule, activeTrack, query, visibleCount])

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_168px]">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-15rem)] lg:flex-col lg:self-start lg:overflow-hidden lg:pr-1">
        <nav
          ref={trackNavigationRef}
          className="flex max-w-full gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible"
          aria-label="知识主线"
        >
          {KNOWLEDGE_TRACKS.map((track, index) => {
            /** 当前导航项是否与 URL 中选中的主线一致。 */
            const isActive = track.slug === activeTrack
            /** 当前主线包含的公开文章数量。 */
            const articleCount = articles.filter(
              (article) => article.track === null || article.track === track.slug
            ).length

            return (
              <Link
                key={track.slug}
                ref={isActive ? activeTrackLinkRef : undefined}
                href={`/knowledge?track=${track.slug}`}
                aria-current={isActive ? 'page' : undefined}
                className={`group grid min-w-[220px] shrink-0 grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-2 border-l-2 px-3 py-3 transition-colors lg:min-w-0 ${
                  isActive
                    ? 'border-mint bg-accent text-foreground'
                    : 'text-muted-foreground hover:border-border hover:bg-accent/50 hover:text-foreground border-transparent'
                }`}
              >
                <span className="text-mint font-mono text-xs font-semibold">{String(index + 1).padStart(2, '0')}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium whitespace-nowrap">{track.label}</span>
                  <span className="mt-1 block text-xs leading-5 whitespace-nowrap">{track.description}</span>
                </span>
                <span className="text-mint font-mono text-[11px]">{articleCount}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-border mt-4 min-h-0 border-t pt-4 lg:flex lg:flex-1 lg:flex-col">
          <p className="text-muted-foreground mb-2 px-3 font-mono text-[11px] font-semibold uppercase">当前路线模块</p>
          <nav
            ref={moduleNavigationRef}
            className="flex max-w-full gap-1 overflow-x-auto pb-2 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto"
            aria-label={`${activeTrackConfig.label}模块`}
          >
            <Link
              ref={highlightedModule === null ? activeModuleLinkRef : undefined}
              href={`/knowledge?track=${activeTrack}`}
              aria-current={highlightedModule === null ? 'page' : undefined}
              className={`grid min-w-[164px] shrink-0 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 text-xs transition-colors lg:min-w-0 ${
                highlightedModule === null
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <span className="text-mint font-mono text-[11px] font-semibold">ALL</span>
              <span>全部模块</span>
              <span className="text-mint font-mono text-[11px]">
                {moduleOptions.reduce((totalCount, moduleOption) => totalCount + moduleOption.count, 0)}
              </span>
            </Link>

            {numberedModuleOptions.map((moduleOption, index) => {
              /** 当前模块是否与显式筛选或右侧滚动位置一致。 */
              const isActive = moduleOption.label === highlightedModule

              return (
                <Link
                  key={moduleOption.label}
                  ref={isActive ? activeModuleLinkRef : undefined}
                  href={{ pathname: '/knowledge', query: { track: activeTrack, module: moduleOption.label } }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`grid min-w-[164px] shrink-0 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 text-xs transition-colors lg:min-w-0 ${
                    isActive
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  }`}
                >
                  <span className="text-mint font-mono text-[11px] font-semibold">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="truncate">{moduleOption.label}</span>
                  <span className="text-mint font-mono text-[11px]">{moduleOption.count}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <Link
          href={activeTrackConfig.mindmapHref}
          className="text-muted-foreground hover:text-mint mt-3 flex shrink-0 items-center gap-2 px-3 text-xs transition-colors"
        >
          <Network className="h-3.5 w-3.5" aria-hidden="true" />
          查看对应思维导图
          <ArrowUpRight className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </aside>

      <section className="min-w-0">
        <div className="mb-5 flex items-center gap-3">
          <Search className="text-mint h-4 w-4 shrink-0" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题或路径"
            aria-label="搜索知识文章"
            className="min-w-0 flex-1"
          />
          <span className="text-mint shrink-0 font-mono text-xs">{filteredArticles.length} 篇</span>
        </div>

        <div ref={articleListRef}>
          {visibleArticles.map((article, index) => {
            /** 当前文章在所属模块中稳定且从 01 开始的展示顺序。 */
            const displayOrder = String(article.sequence).padStart(2, '0')
            /** 去掉来源标题中不统一的顺序前缀后的列表标题。 */
            const displayTitle = article.title.replace(ARTICLE_TITLE_ORDER_PATTERN, '')
            /** 首篇文章或模块切换处需要展示新的模块标题。 */
            const showsModuleHeading = index === 0 || visibleArticles[index - 1]?.topic !== article.topic
            /** 当前细分类在所属大模块中的完整文章数量。 */
            const subtopicArticleCount = subtopicCountsByModule.get(article.topic)?.get(article.subtopic) || 0
            /** 模块切换或细分类切换处展示包含多篇文章的细分类标题。 */
            const showsSubtopicHeading =
              article.topic !== OVERVIEW_MODULE_LABEL &&
              article.subtopic !== article.topic &&
              subtopicArticleCount > 1 &&
              (index === 0 ||
                visibleArticles[index - 1]?.topic !== article.topic ||
                visibleArticles[index - 1]?.subtopic !== article.subtopic)
            /** 当前文章所属正式模块在侧栏中的顺序；总览不参与编号。 */
            const moduleIndex = numberedModuleOptions.findIndex((moduleOption) => moduleOption.label === article.topic)
            /** 当前文章所属模块的完整文章数量。 */
            const moduleArticleCount =
              moduleOptions.find((moduleOption) => moduleOption.label === article.topic)?.count || 0
            /** 模块标题上方展示的总览标识或从 01 开始的正式模块编号。 */
            const moduleEyebrow =
              article.topic === OVERVIEW_MODULE_LABEL
                ? 'OVERVIEW'
                : `MODULE ${String(moduleIndex + 1).padStart(2, '0')}`

            return (
              <Fragment key={article.path}>
                {showsModuleHeading && (
                  <div
                    data-knowledge-module-heading={article.topic}
                    className="border-border flex items-end justify-between border-b pt-8 pb-3 first:pt-2"
                  >
                    <div>
                      <span className="text-mint font-mono text-[11px] font-semibold">{moduleEyebrow}</span>
                      <h2 className="text-foreground mt-1 text-base font-semibold">{article.topic}</h2>
                    </div>
                    <span className="text-muted-foreground font-mono text-[11px]">{moduleArticleCount} 篇</span>
                  </div>
                )}
                {showsSubtopicHeading && (
                  <div
                    id={getKnowledgeSubtopicAnchor(article.topic, article.subtopic)}
                    data-knowledge-subtopic-heading={article.subtopic}
                    className="border-border/70 flex scroll-mt-28 items-center gap-3 border-b px-3 pt-6 pb-2.5"
                  >
                    <span className="bg-mint h-1.5 w-1.5 shrink-0" aria-hidden="true" />
                    <h3 className="text-foreground text-sm font-medium">{article.subtopic}</h3>
                    <span className="text-muted-foreground ml-auto font-mono text-[11px]">
                      {subtopicArticleCount} 篇
                    </span>
                  </div>
                )}
                <Link
                  id={getKnowledgeArticleAnchor(article.path)}
                  href={article.href}
                  data-article-path={article.path}
                  onClick={handleArticleNavigation}
                  className="border-border hover:bg-accent/50 target:bg-accent/50 group flex scroll-mt-24 gap-4 border-b px-3 py-4 transition-colors"
                >
                  <span className="text-mint mt-0.5 w-7 shrink-0 font-mono text-xs font-semibold">{displayOrder}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-foreground text-sm font-medium group-hover:underline">{displayTitle}</h3>
                      <span className="border-mint/40 text-mint border px-1.5 py-0.5 font-mono text-[11px]">
                        {ARTICLE_KIND_LABELS[article.kind]}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 truncate text-xs">{article.displayPath}</p>
                  </div>
                </Link>
              </Fragment>
            )
          })}
        </div>

        {filteredArticles.length === 0 && (
          <p className="text-muted-foreground py-16 text-center text-sm">没有找到匹配的文章</p>
        )}

        {visibleArticles.length < filteredArticles.length && (
          <div className="pt-6 text-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setVisibleCount((currentCount) => currentCount + ARTICLE_PAGE_SIZE)}
            >
              加载更多
            </Button>
          </div>
        )}
      </section>

      <aside className="hidden min-w-0 xl:block">
        <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <p className="text-muted-foreground font-mono text-[11px] font-semibold uppercase">细分目录</p>
          {highlightedModule && highlightedModuleOrder >= 0 ? (
            <>
              <p className="text-foreground mt-2 text-xs font-medium">
                <span className="text-mint mr-2 font-mono text-[11px]">
                  {String(highlightedModuleOrder + 1).padStart(2, '0')}
                </span>
                {highlightedModule}
              </p>
              {outlinedSubtopics.length > 0 ? (
                <nav className="border-border mt-4 border-l" aria-label={`${highlightedModule}细分目录`}>
                  {outlinedSubtopics.map((subtopicOption) => {
                    /** 当前细分类是否与右侧文章列表的滚动位置一致。 */
                    const isActive = subtopicOption.label === visibleSubtopic
                    /** 当前细分类标题在文章列表中的稳定锚点。 */
                    const subtopicAnchor = getKnowledgeSubtopicAnchor(highlightedModule, subtopicOption.label)

                    return (
                      <a
                        key={subtopicOption.label}
                        href={`#${subtopicAnchor}`}
                        aria-current={isActive ? 'location' : undefined}
                        className={`grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-l-2 py-2 pr-1 pl-3 text-xs transition-colors ${
                          isActive
                            ? 'border-mint text-foreground bg-accent/70 -ml-px'
                            : 'text-muted-foreground hover:text-foreground hover:border-border -ml-px border-transparent'
                        }`}
                      >
                        <span className="truncate">{subtopicOption.label}</span>
                        <span className="text-mint font-mono text-[10px]">{subtopicOption.count}</span>
                      </a>
                    )
                  })}
                </nav>
              ) : (
                <p className="text-muted-foreground mt-4 text-xs leading-5">继续向下阅读以查看细分类。</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground mt-3 text-xs leading-5">滚动到模块后显示当前细分类。</p>
          )}
        </div>
      </aside>
    </div>
  )
}
