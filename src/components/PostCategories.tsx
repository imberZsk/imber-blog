import { cn } from '../../lib/utils'

interface PostCategoriesProps {
  categories: string[]
  activeCategory: string
  onCategoryChange: (category: string) => void
}

const PostCategories = ({ categories, activeCategory, onCategoryChange }: PostCategoriesProps) => {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onCategoryChange('all')}
          className={cn(
            'cursor-pointer rounded px-3 py-1 text-xs transition-colors',
            activeCategory === 'all'
              ? 'bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300'
          )}
        >
          全部
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={cn(
              'cursor-pointer rounded px-3 py-1 text-xs transition-colors',
              activeCategory === category
                ? 'bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300'
            )}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  )
}

export default PostCategories
