import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** 组合条件类名并合并 Tailwind 冲突；inputs 为各调用方的类名片段。
 * 通用入口不再导出编辑器工具，避免首页仅导入 cn 也引入 Tiptap，导致客户端边界编译失败。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 支持的图片格式
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif', '.heic', '.HEIC']

// 检查是否为图片文件或者视频
export const isImageFileOrVideo = (filename: string) => {
  return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext)) || filename.toLowerCase().endsWith('.mp4')
}
