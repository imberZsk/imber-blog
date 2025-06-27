export interface GitHubFile {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string
  type: 'file'
  lastModified?: string | null // 添加最后修改时间字段
  _links?: {
    self: string
    git: string
    html: string
  }
}

export interface PaginationInfo {
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}
