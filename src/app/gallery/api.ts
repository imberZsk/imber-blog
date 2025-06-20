import { isImageFile } from '@/lib/utils'
import { GitHubFile } from './types'
import { GITHUB_CONFIG } from '@/services/gallery/const'

// 服务端请求，服务端的时候返回data和error
export const fetchGitHubImages = async () => {
  const target: {
    data: GitHubFile[]
    error: Error | null
  } = {
    data: [] as GitHubFile[],
    error: null as unknown as Error
  }
  try {
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json'
    }

    // 如果有 GitHub token，添加认证头
    if (GITHUB_CONFIG.token) {
      headers.Authorization = `token ${GITHUB_CONFIG.token}`
    }

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`,
      {
        next: { revalidate: 300 },
        headers
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('仓库或路径不存在，请检查配置')
      } else if (response.status === 403) {
        throw new Error('API 访问限制，请添加 GitHub Token')
      } else {
        throw new Error(`GitHub API 错误: ${response.status}`)
      }
    }

    const files: GitHubFile[] = await response.json()

    // 过滤出图片文件
    const imageFiles = files
      .filter((file) => file.type === 'file' && isImageFile(file.name))
      .sort((a, b) => a.name.localeCompare(b.name)) // 按文件名排序

    console.log(imageFiles, 'imageFiles')

    target.data = imageFiles

    // 计算分页信息
    // const totalPages = Math.ceil(imageFiles.length / ITEMS_PER_PAGE)
    // setPagination({
    //   currentPage: 1,
    //   totalPages,
    //   hasNextPage: totalPages > 1,
    //   hasPrevPage: false
    // })
  } catch (err) {
    console.error('获取 GitHub 图片失败:', err)
    target.error = err instanceof Error ? err : new Error(String(err))
  }

  return target
}
