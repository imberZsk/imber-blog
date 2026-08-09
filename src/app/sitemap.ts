import { MetadataRoute } from 'next'
import { getKnowledgeArticles } from '@/lib/knowledge'
import { getMindmaps } from '@/lib/mindmaps'
import { getPosts } from '@/lib/posts'

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
    ...postEntries,
    ...mindmapEntries,
    ...knowledgeEntries
  ]
}
