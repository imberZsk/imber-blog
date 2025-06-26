import { gitHubService } from '@/services'
import { GITHUB_CONFIG } from './const'
import { isImageFile } from '@/lib/utils'
import { GitHubFile } from './types'

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
  'use server'

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
    const imageFiles = files
      .filter((file) => file.type === 'file' && isImageFile(file.name))
      .sort((a, b) => a.name.localeCompare(b.name)) // 按文件名排序

    target.data = imageFiles
  } catch (err) {
    console.error('获取 GitHub 图片失败:', err)
    target.error = err instanceof Error ? err : new Error(String(err))
  }

  return target
}
