import { gitHubService } from '@/services'
import { GITHUB_CONFIG } from './const'
import { isImageFileOrVideo } from '@/lib/utils'
import { GitHubFile } from './types'

// 获取文件的最后修改时间
const getFileLastModified = async (filePath: string): Promise<string | null> => {
  try {
    const response = await gitHubService.request(
      `/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/commits?path=${filePath}&per_page=1`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `Bearer ${GITHUB_CONFIG.token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (response && response.length > 0) {
      return response[0].commit.author.date
    }
    return null
  } catch (error) {
    console.warn(`获取文件 ${filePath} 修改时间失败:`, error)
    return null
  }
}

// 上传图片到 GitHub API
export const uploadImageToGitHubApi = async (file: File, path: string, base64Content: string) => {
  return await gitHubService.request(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Upload product image: ${file.name}`,
      content: base64Content
    }),
    headers: {
      Authorization: `Bearer ${GITHUB_CONFIG.token}`
    }
  })
}

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
    const response = await gitHubService.request(
      `/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`,
      {
        method: 'GET',
        next: { revalidate: 300 },
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `Bearer ${GITHUB_CONFIG.token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const files: GitHubFile[] = response

    // 过滤出图片文件
    const imageFiles = files.filter((file) => file.type === 'file' && isImageFileOrVideo(file.name))

    // 获取每个文件的最后修改时间
    const filesWithModTime = await Promise.all(
      imageFiles.map(async (file) => {
        const lastModified = await getFileLastModified(file.path)
        return {
          ...file,
          lastModified
        }
      })
    )

    // 按最后修改时间排序（最新的在前）
    filesWithModTime.sort((a, b) => {
      if (!a.lastModified && !b.lastModified) return 0
      if (!a.lastModified) return 1
      if (!b.lastModified) return -1
      return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    })

    target.data = filesWithModTime
  } catch (err) {
    console.error('获取 GitHub 图片失败:', err)
    target.error = err instanceof Error ? err : new Error(String(err))
  }

  return target
}
