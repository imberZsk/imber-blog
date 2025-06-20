import { cn } from '../../../lib/utils'
import { fetchGitHubImages } from './api'
import Waterfall from './waterfall'

const Page = async () => {
  const { data, error } = await fetchGitHubImages()
  // const [images, setImages] = useState<GitHubFile[]>([])
  // const [loading, setLoading] = useState(true)
  // const [error, setError] = useState<string | null>(null)
  // const [pagination, setPagination] = useState<PaginationInfo>({
  //   currentPage: 1,
  //   totalPages: 0,
  //   hasNextPage: false,
  //   hasPrevPage: false
  // })

  // 获取当前页的图片
  // const getCurrentPageImages = () => {
  //   const startIndex = (pagination.currentPage - 1) * ITEMS_PER_PAGE
  //   const endIndex = startIndex + ITEMS_PER_PAGE
  //   return images.slice(startIndex, endIndex)
  // }

  // 翻页函数
  // const goToPage = (page: number) => {
  //   if (page < 1 || page > pagination.totalPages) return

  //   setPagination((prev) => ({
  //     ...prev,
  //     currentPage: page,
  //     hasNextPage: page < prev.totalPages,
  //     hasPrevPage: page > 1
  //   }))
  // }

  return (
    <div className={cn('mx-auto px-5 pt-32')}>
      {/* 错误状态 */}
      {error && <div>请求失败</div>}

      {/* 图片网格 */}
      {!error && (
        <>
          {/* 分页信息 */}
          {/* {images.length > 0 && (
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                共 {images.length} 张图片，第 {pagination.currentPage} 页 / 共 {pagination.totalPages} 页
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">显示 {getCurrentPageImages().length} 张图片</p>
            </div>
          )} */}

          {/* 图片列表 */}
          <Waterfall data={data} />

          {/* 空状态 - 暂时不考虑 */}
        </>
      )}
    </div>
  )
}

export default Page
