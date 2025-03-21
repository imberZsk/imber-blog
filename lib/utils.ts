import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// 类名处理函数
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
