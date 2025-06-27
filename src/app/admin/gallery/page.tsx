'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Upload, Check, X, ArrowLeft, FileImage } from 'lucide-react'
import { uploadImageToGitHubApi } from '@/services/gallery'
import { GITHUB_CONFIG } from '@/services/gallery/const'
import { cn } from '@/lib/utils'
import { PADDING_TOP } from '../../const'

interface UploadedImage {
  file: File
  url: string
  cdnUrl?: string
  uploadStatus: 'uploading' | 'success' | 'error'
  progress: number
  isHeic?: boolean
  isVideo?: boolean
  convertedFile?: File
}

const Page = () => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 检测文件是否为 HEIC 格式
  const isHeicFile = (file: File): boolean => {
    return (
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif')
    )
  }

  // 转换 HEIC 文件为 JPEG
  const convertHeicToJpeg = async (file: File): Promise<File> => {
    try {
      const convertedBlob = (await import('heic2any').then((module) =>
        module.default({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.9
        })
      )) as Blob

      // 创建新的 File 对象
      const convertedFile = new File(
        [convertedBlob],
        file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'),
        { type: 'image/jpeg' }
      )

      return convertedFile
    } catch (error) {
      console.error('HEIC 转换失败:', error)
      throw error
    }
  }

  const uploadImageToGitHub = useCallback(async (file: File): Promise<string | null> => {
    // 如果是 HEIC 文件，先转换为 JPEG
    let fileToUpload = file
    if (isHeicFile(file)) {
      try {
        fileToUpload = await convertHeicToJpeg(file)
      } catch (error) {
        console.error('HEIC 转换失败:', error)
        return null
      }
    }

    if (typeof window !== 'undefined') {
      console.log(fileToUpload.type)

      let width = 0
      let height = 0
      let path = ''

      if (fileToUpload.type.startsWith('video/')) {
        // 处理视频文件
        const video = document.createElement('video')
        const url = URL.createObjectURL(fileToUpload)
        video.src = url

        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            width = video.videoWidth
            height = video.videoHeight
            resolve(true)
          }
          video.onerror = () => {
            console.error('视频加载失败')
            resolve(false)
          }
        })

        path = `gallery/${Date.now()}-${width}x${height}-${fileToUpload.name}`
        URL.revokeObjectURL(url)
      } else {
        // 处理图片文件
        const img = new window.Image()
        const url = URL.createObjectURL(fileToUpload)
        img.src = url

        await new Promise((resolve) => {
          img.onload = () => {
            width = img.naturalWidth
            height = img.naturalHeight
            resolve(true)
          }
          img.onerror = () => {
            console.error('图片加载失败')
            resolve(false)
          }
        })

        path = `gallery/${Date.now()}-${width}x${height}-${fileToUpload.name}`
        URL.revokeObjectURL(url)
      }

      // 检查文件大小限制
      const fileSizeMB = fileToUpload.size / (1024 * 1024)
      const base64SizeMB = fileSizeMB * 1.33 // Base64编码增加约33%的大小

      // GitHub API 限制：100MB for base64 content
      if (base64SizeMB > 100) {
        console.error(
          `文件太大: ${fileSizeMB.toFixed(2)}MB (编码后: ${base64SizeMB.toFixed(2)}MB)，超过GitHub API 100MB限制`
        )
        return null
      }

      // 对于视频文件，建议使用更小的限制（如25MB）因为通常更大
      if (fileToUpload.type.startsWith('video/') && fileSizeMB > 25) {
        console.error(`视频文件太大: ${fileSizeMB.toFixed(2)}MB，建议小于25MB以确保稳定上传`)
        return null
      }

      // 将文件转换为 base64
      const reader = new FileReader()

      const base64Content = await new Promise<string>((resolve) => {
        reader.onload = (e) => {
          const base64 = (e.target?.result as string)?.split(',')[1]
          resolve(base64)
        }
        reader.readAsDataURL(fileToUpload)
      })

      const { error } = await uploadImageToGitHubApi(fileToUpload, path, base64Content)

      // 使用 jsDelivr CDN URL
      const cdnUrl = `https://cdn.jsdelivr.net/gh/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${path}`

      if (error) {
        console.error(error)
        return null
      }

      return cdnUrl
    }

    return null
  }, [])

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files) return

      const validFiles = Array.from(files).filter((file) => {
        const isValidType = file.type.startsWith('image/') || isHeicFile(file) || file.type.startsWith('video/')
        const fileSizeMB = file.size / (1024 * 1024)

        // 图片文件最大100MB，视频文件建议最大25MB
        const sizeLimit = file.type.startsWith('video/') ? 25 : 100

        return isValidType && fileSizeMB <= sizeLimit
      })

      if (validFiles.length === 0) return

      // 处理文件并创建预览
      const processedImages: UploadedImage[] = []

      for (const file of validFiles) {
        let previewUrl = ''
        let convertedFile: File | undefined

        if (isHeicFile(file)) {
          try {
            // 转换 HEIC 文件用于预览
            convertedFile = await convertHeicToJpeg(file)
            previewUrl = URL.createObjectURL(convertedFile)
          } catch (error) {
            console.error('HEIC 预览转换失败:', error)
            // 如果转换失败，使用原文件（虽然可能不显示）
            previewUrl = URL.createObjectURL(file)
          }
        } else {
          previewUrl = URL.createObjectURL(file)
        }

        processedImages.push({
          file,
          url: previewUrl,
          uploadStatus: 'uploading' as const,
          progress: 0,
          isHeic: isHeicFile(file),
          isVideo: file.type.startsWith('video/'),
          convertedFile
        })
      }

      setUploadedImages((prev) => [...prev, ...processedImages])

      // 上传每个文件
      for (let i = 0; i < processedImages.length; i++) {
        const imageIndex = uploadedImages.length + i

        try {
          // 模拟进度更新
          const progressInterval = setInterval(() => {
            setUploadedImages((prev) =>
              prev.map((img, idx) =>
                idx === imageIndex && img.progress < 90
                  ? { ...img, progress: Math.min(img.progress + Math.random() * 20, 90) }
                  : img
              )
            )
          }, 200)

          const cdnUrl = await uploadImageToGitHub(processedImages[i].file)

          clearInterval(progressInterval)

          setUploadedImages((prev) =>
            prev.map((img, idx) =>
              idx === imageIndex
                ? {
                    ...img,
                    cdnUrl: cdnUrl || undefined,
                    uploadStatus: cdnUrl ? 'success' : 'error',
                    progress: 100
                  }
                : img
            )
          )
        } catch {
          setUploadedImages((prev) =>
            prev.map((img, idx) => (idx === imageIndex ? { ...img, uploadStatus: 'error' as const, progress: 0 } : img))
          )
        }
      }
    },
    [uploadedImages.length, uploadImageToGitHub]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  const removeImage = useCallback((index: number) => {
    setUploadedImages((prev) => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].url)
      // 如果有转换后的文件，也需要释放其 URL
      if (updated[index].convertedFile) {
        URL.revokeObjectURL(updated[index].url)
      }
      updated.splice(index, 1)
      return updated
    })
  }, [])

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={cn('mx-auto max-w-4xl p-4', PADDING_TOP)}>
      {/* 页面标题 */}
      <div className="mb-8">
        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          返回图库
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">上传文件</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          支持 JPG、PNG、GIF、HEIC、MP4 等格式
          <br />
          图片文件：不超过 100MB，视频文件：建议不超过 25MB
        </p>
      </div>

      {/* 上传区域 */}
      <div
        className={cn(
          'relative mb-8 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-12 text-center transition-all duration-300',
          'dark:border-zinc-600 dark:bg-zinc-800/50',
          isDragging && 'border-blue-400 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-500/10',
          'hover:border-zinc-400 hover:bg-zinc-100/50 dark:hover:border-zinc-500 dark:hover:bg-zinc-700/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />

        <div className="pointer-events-none">
          <div className="mb-4 inline-flex rounded-full bg-zinc-200 p-4 dark:bg-zinc-700">
            <Upload className="h-8 w-8 text-zinc-600 dark:text-zinc-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">拖拽文件到这里上传</h3>
          <p className="mb-4 text-zinc-600 dark:text-zinc-400">或者</p>
          <button
            onClick={openFileDialog}
            className="pointer-events-auto rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            选择文件
          </button>
        </div>
      </div>

      {/* 上传列表 */}
      {uploadedImages.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">上传列表 ({uploadedImages.length})</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uploadedImages.map((image, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700"
              >
                {/* 文件预览 */}
                <div className="relative aspect-square">
                  {image.isVideo ? (
                    <video
                      src={image.url}
                      className="h-full w-full object-cover"
                      controls={false}
                      muted
                      loop
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => e.currentTarget.pause()}
                    />
                  ) : (
                    <Image
                      src={image.url}
                      alt={image.file.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  )}

                  {/* 视频标识 */}
                  {image.isVideo && (
                    <div className="absolute top-2 left-8 rounded bg-purple-500 px-2 py-1 text-xs text-white">
                      VIDEO
                    </div>
                  )}

                  {/* HEIC 标识 */}
                  {image.isHeic && (
                    <div className="absolute top-2 left-8 rounded bg-blue-500 px-2 py-1 text-xs text-white">HEIC</div>
                  )}

                  {/* 上传状态遮罩 */}
                  {image.uploadStatus !== 'success' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      {image.uploadStatus === 'uploading' && (
                        <div className="text-center">
                          <div className="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          <div className="text-sm text-white">{Math.round(image.progress)}%</div>
                        </div>
                      )}
                      {image.uploadStatus === 'error' && (
                        <div className="text-center text-white">
                          <X className="mx-auto mb-2 h-8 w-8" />
                          <div className="text-sm">上传失败</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 成功状态 */}
                  {image.uploadStatus === 'success' && (
                    <div className="absolute top-2 right-2 rounded-full bg-green-500 p-1">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}

                  {/* 删除按钮 */}
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 left-2 cursor-pointer rounded-full bg-red-500 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>

                {/* 文件信息 */}
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{image.file.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {(image.file.size / 1024 / 1024).toFixed(2)} MB
                    {image.isVideo && <span className="ml-1 text-purple-500">(视频)</span>}
                    {image.isHeic && <span className="ml-1 text-blue-500">(HEIC → JPEG)</span>}
                  </p>

                  {/* 进度条 */}
                  {image.uploadStatus === 'uploading' && (
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${image.progress}%` }}
                      />
                    </div>
                  )}

                  {/* CDN链接 */}
                  {image.cdnUrl && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={image.cdnUrl}
                        readOnly
                        className="w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                        onClick={(e) => e.currentTarget.select()}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {uploadedImages.length === 0 && (
        <div className="py-12 text-center">
          <FileImage className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">还没有上传任何文件</p>
        </div>
      )}
    </div>
  )
}

export default Page
