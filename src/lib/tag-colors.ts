// 预定义颜色 - 确保每个都有明显区别
const colors: Record<string, string> = {
  editor: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  脚手架: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300',
  'React 源码': 'bg-violet-100 text-violet-800 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300',
  ai: 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
  工程化: 'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
  animation: 'bg-pink-100 text-pink-800 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-300',
  Nextjs: 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-900/30 dark:text-slate-300',
  TypeScript: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300',
  面试题: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300',
  others: 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900/30 dark:text-gray-300'
}

// 随机颜色池
const randomColors = [
  'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  'bg-teal-100 text-teal-800 hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-300',
  'bg-lime-100 text-lime-800 hover:bg-lime-200 dark:bg-lime-900/30 dark:text-lime-300',
  'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
  'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300',
  'bg-violet-100 text-violet-800 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300',
  'bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
  'bg-sky-100 text-sky-800 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-300',
  'bg-stone-100 text-stone-800 hover:bg-stone-200 dark:bg-stone-900/30 dark:text-stone-300'
]

const cache = new Map<string, string>()

// 超简化哈希
function hash(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
  }
  return Math.abs(h)
}

export const getTagColor = (tag: string): string => {
  if (colors[tag]) return colors[tag]
  if (cache.has(tag)) return cache.get(tag)!

  const color = randomColors[hash(tag) % randomColors.length]
  cache.set(tag, color)
  return color
}
