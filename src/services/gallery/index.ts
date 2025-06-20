import { gitHubService } from '@/services'
import { GITHUB_CONFIG } from './const'

export const uploadImageToGitHubApi = async (file: File, path: string, base64Content: string) => {
  const { data, error } = await gitHubService.put(
    `/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`,
    {
      message: `Upload product image: ${file.name}`,
      content: base64Content
    },
    {
      headers: {
        Authorization: `Bearer ${GITHUB_CONFIG.token}`
      }
    }
  )

  return { data, error }
}
