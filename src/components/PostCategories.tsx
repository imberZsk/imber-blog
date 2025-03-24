import { cn } from '../../lib/utils'

interface PostCategoriesProps {
  categories: string[]
  activeCategory: string
  onCategoryChange: (category: string) => void
}

const PostCategories = ({ categories, activeCategory, onCategoryChange }: PostCategoriesProps) => {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCategoryChange('all')}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm transition-colors',
            activeCategory === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
          )}
        >
          全部
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm transition-colors',
              activeCategory === category
                ? 'bg-blue-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
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
