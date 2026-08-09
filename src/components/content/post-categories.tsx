import { cn } from '../../lib/utils'
import { getTagColor } from '../../lib/tag-colors'
import { Button } from '@/components/ui'

interface PostCategoriesProps {
  categories: string[]
  activeCategory: string
  onCategoryChange: (category: string) => void
}

/** 展示文集分类筛选按钮并回传用户选择。 */
const PostCategories = ({ categories, activeCategory, onCategoryChange }: PostCategoriesProps) => {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          onClick={() => onCategoryChange('all')}
          className={cn(
            'h-7 rounded-[18px] px-3 text-xs',
            activeCategory === 'all'
              ? 'bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300'
          )}
        >
          全部
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            type="button"
            size="sm"
            onClick={() => onCategoryChange(category)}
            className={cn(
              'h-7 rounded-[18px] px-3 text-xs',
              activeCategory === category ? cn(getTagColor(category), 'opacity-80') : getTagColor(category)
            )}
          >
            {category}
          </Button>
        ))}
      </div>
    </div>
  )
}

export default PostCategories
