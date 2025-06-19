'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ImageIcon, ExternalLink, Download } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '../../../lib/utils'
import { PADDING_TOP } from '../const'

interface GitHubFile {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string
  type: 'file'
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

const ITEMS_PER_PAGE = 12
const GITHUB_CONFIG = {
  owner: 'imberZsk', // 替换为您的 GitHub 用户名
  repo: 'images', // 替换为您的仓库名
  path: 'products', // 图片文件夹路径
  token: process.env.NEXT_PUBLIC_GITHUB_TOKEN // 可选：GitHub token，提高API限制
}

const Page = () => {
  const [images, setImages] = useState<GitHubFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  })

  // 支持的图片格式
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']

  // 检查是否为图片文件
  const isImageFile = (filename: string) => {
    return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
  }

  // 获取 GitHub 仓库中的图片文件
  const fetchGitHubImages = async () => {
    setLoading(true)
    setError(null)

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
        { headers }
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

      setImages(imageFiles)

      // 计算分页信息
      const totalPages = Math.ceil(imageFiles.length / ITEMS_PER_PAGE)
      setPagination({
        currentPage: 1,
        totalPages,
        hasNextPage: totalPages > 1,
        hasPrevPage: false
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取图片失败')
      console.error('获取 GitHub 图片失败:', err)
    } finally {
      setLoading(false)
    }
  }

  // 获取当前页的图片
  const getCurrentPageImages = () => {
    const startIndex = (pagination.currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return images.slice(startIndex, endIndex)
  }

  // 生成图片 CDN URL
  const getImageCDNUrl = (file: GitHubFile) => {
    return `https://cdn.jsdelivr.net/gh/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${file.path}`
  }

  // 翻页函数
  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return

    setPagination((prev) => ({
      ...prev,
      currentPage: page,
      hasNextPage: page < prev.totalPages,
      hasPrevPage: page > 1
    }))
  }

  // 组件挂载时获取图片
  useEffect(() => {
    fetchGitHubImages()
  }, [])

  // async function uploadImageToGitHub(file: File) {
  //   const token = '我的token'
  //   const owner = 'imberZsk'
  //   const repo = 'images'
  //   const path = `products/${Date.now()}-${file.name}`

  //   // 将文件转换为 base64
  //   const reader = new FileReader()
  //   const base64Content = await new Promise<string>((resolve) => {
  //     reader.onload = (e) => {
  //       const base64 = (e.target?.result as string)?.split(',')[1]
  //       resolve(base64)
  //     }
  //     reader.readAsDataURL(file)
  //   })

  //   try {
  //     const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
  //       method: 'PUT',
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         'Content-Type': 'application/json'
  //       },
  //       body: JSON.stringify({
  //         message: `Upload product image: ${file.name}`,
  //         content: base64Content
  //       })
  //     })

  //     if (!response.ok) {
  //       throw new Error('Failed to upload image to GitHub')
  //     }

  //     const data = await response.json()
  //     // 使用 jsDelivr CDN URL
  //     const cdnUrl = `https://cdn.jsdelivr.net/gh/${owner}/${repo}/${path}`
  //     console.log(cdnUrl)
  //     return cdnUrl
  //   } catch (error) {
  //     console.error('Error uploading image to GitHub:', error)
  //     throw error
  //   }
  // }

  return (
    <div className={cn('mx-auto max-w-[1960px] p-4', PADDING_TOP)}>
      {/* 页面标题 */}
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-4xl font-bold text-zinc-900 dark:text-zinc-100">图片画廊</h1>
        <p className="text-zinc-600 dark:text-zinc-400">展示来自 GitHub 仓库的精美图片集合</p>
        <input
          type="file"
          // onChange={uploadImageToGitHub}
          className="w-32 rounded-lg border-0 bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200 focus:ring-2 focus:ring-zinc-300 focus:outline-none dark:bg-zinc-700 dark:text-white dark:ring-zinc-600"
        />
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-zinc-600 dark:text-zinc-400">正在加载图片...</p>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <ImageIcon className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">加载失败</h3>
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">{error}</p>
            <button
              onClick={fetchGitHubImages}
              className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
            >
              重试
            </button>
          </div>
        </div>
      )}

      {/* 图片网格 */}
      {!loading && !error && (
        <>
          {/* 分页信息 */}
          {images.length > 0 && (
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                共 {images.length} 张图片，第 {pagination.currentPage} 页 / 共 {pagination.totalPages} 页
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">显示 {getCurrentPageImages().length} 张图片</p>
            </div>
          )}

          {/* 图片列表 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            <AnimatePresence mode="wait">
              {getCurrentPageImages().map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-50 shadow-sm ring-1 ring-zinc-200 transition-all hover:shadow-lg hover:ring-zinc-300 dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:ring-zinc-600"
                >
                  {/* 图片 */}
                  <Image
                    src={getImageCDNUrl(file)}
                    alt={file.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  />

                  {/* 悬停遮罩 */}
                  <div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/20" />

                  {/* 操作按钮 */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="flex gap-2">
                      {/* 在新窗口打开 */}
                      <Link
                        href={getImageCDNUrl(file)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-white/90 p-2 text-zinc-900 shadow-lg transition-all hover:scale-105 hover:bg-white dark:bg-zinc-800/90 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        title="在新窗口打开"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>

                      {/* 下载图片 */}
                      <Link
                        href={file.download_url}
                        download={file.name}
                        className="rounded-full bg-white/90 p-2 text-zinc-900 shadow-lg transition-all hover:scale-105 hover:bg-white dark:bg-zinc-800/90 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        title="下载图片"
                      >
                        <Download className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>

                  {/* 文件名 */}
                  <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <p className="truncate text-sm text-white">{file.name}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* 分页控件 */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {/* 上一页 */}
              <button
                onClick={() => goToPage(pagination.currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className="flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-zinc-900 shadow-sm ring-1 ring-zinc-200 transition-all hover:bg-zinc-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700"
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </button>

              {/* 页码 */}
              <div className="flex gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={cn(
                      'h-10 w-10 rounded-lg text-sm font-medium transition-all',
                      page === pagination.currentPage
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50 hover:shadow-md dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700'
                    )}
                  >
                    {page}
                  </button>
                ))}
              </div>

              {/* 下一页 */}
              <button
                onClick={() => goToPage(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-zinc-900 shadow-sm ring-1 ring-zinc-200 transition-all hover:bg-zinc-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700"
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* 空状态 */}
          {images.length === 0 && (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <ImageIcon className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
                <h3 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">暂无图片</h3>
                <p className="text-zinc-600 dark:text-zinc-400">GitHub 仓库中没有找到图片文件</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Page
