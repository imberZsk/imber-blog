import { MetadataRoute } from 'next'
import { geekbangCourses } from '@/lib/geekbang'
import { getKnowledgeArticles } from '@/lib/knowledge'
import { getMindmaps } from '@/lib/mindmaps'
import { getPosts } from '@/lib/posts'
import { getFrontendDocs } from '@/lib/frontend-docs'
import { navigationSections } from '@/app/lab/animation/config'
import { THREE_DEMOS } from '@/app/lab/3d/config'

/** 生成网站首页、功能页和全部知识文章的 sitemap。 */
export default function sitemap(): MetadataRoute.Sitemap {
  /** 线上站点的基础地址。 */
  const baseUrl = 'https://imber.netlify.app'
  /** 本次构建生成 sitemap 的时间。 */
  const currentDate = new Date()
  /** 全部知识文章对应的 sitemap 条目。 */
  const knowledgeEntries: MetadataRoute.Sitemap = getKnowledgeArticles().map((article) => ({
    url: `${baseUrl}${article.href}`,
    lastModified: currentDate,
    changeFrequency: 'monthly',
    priority: 0.6
  }))
  /** 当前原创文集文章对应的 sitemap 条目。 */
  const postEntries: MetadataRoute.Sitemap = getPosts().map((post) => ({
    url: `${baseUrl}${post.href}`,
    lastModified: post.date ? new Date(post.date) : currentDate,
    changeFrequency: 'monthly',
    priority: 0.7
  }))
  /** 三张思维导图对应的 sitemap 条目。 */
  const mindmapEntries: MetadataRoute.Sitemap = getMindmaps().map((mindmap) => ({
    url: `${baseUrl}${mindmap.href}`,
    lastModified: currentDate,
    changeFrequency: 'monthly',
    priority: 0.7
  }))

  /** 实验室索引、可运行示例与原文档的公开路径。 */
  const labPaths = [
    '/lab', '/lab/animation', '/lab/3d', '/lab/docs',
    ...navigationSections.map((item) => item.path),
    ...THREE_DEMOS.map((item) => `/lab/3d/${item.slug}`),
    ...getFrontendDocs().map((doc) => doc.href)
  ]
  /** 新迁入功能的站点地图条目，不改变现有页面配置。 */
  const labEntries: MetadataRoute.Sitemap = labPaths.map((path) => ({
    url: `${baseUrl}${path}`, // 当前功能在博客下的规范地址。
    lastModified: currentDate, // 与同次构建的其他条目使用一致时间。
    changeFrequency: 'monthly', // 实验和历史文档更新频率较低。
    priority: 0.6 // 与知识文章使用相同收录权重。
  }))

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0
    },
    {
      url: `${baseUrl}/mindmaps`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8
    },
    {
      url: `${baseUrl}/posts`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9
    },
    {
      url: `${baseUrl}/knowledge`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9
    },
    {
      url: `${baseUrl}/test1`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: `${baseUrl}/test2`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: `${baseUrl}/test3`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: `${baseUrl}/notes`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.7
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5
    },
    ...labEntries,
    {
      url: `${baseUrl}/geekbang`, // 新增知识库的聚合入口。
      lastModified: currentDate, // 与章节条目保持构建时间一致。
      changeFrequency: 'monthly', // 本地备份按批次更新。
      priority: 0.8 // 聚合页高于单篇内容的发现优先级。
    },
    ...geekbangCourses.flatMap((course) =>
      course.chapters.map((chapter) => ({
        url: `${baseUrl}/geekbang/${course.slug}/${chapter.slug}`, // 迁入章节的固定公开路径。
        lastModified: currentDate, // 与同次构建的文章条目使用一致时间。
        changeFrequency: 'monthly' as const, // 原文备份不作为实时更新资料。
        priority: 0.6 // 与现有知识文章保持相同权重。
      }))
    ),
    ...postEntries,
    ...mindmapEntries,
    ...knowledgeEntries
  ]
}
