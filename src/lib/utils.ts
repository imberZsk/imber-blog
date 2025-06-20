import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 支持的图片格式
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif', '.heic', '.HEIC']

// 检查是否为图片文件
export const isImageFile = (filename: string) => {
  return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
}
