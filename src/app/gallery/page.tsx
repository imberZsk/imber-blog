import { cn } from '@/lib/utils'
import { fetchGitHubImages } from '@/services/gallery'
import Waterfall from './waterfall'

const Page = async () => {
  const { data, error } = await fetchGitHubImages()

  return (
    <div className={cn('mx-auto px-5 pt-32')}>
      {/* 错误状态 */}
      {error && <div>请求失败{JSON.stringify(error)}</div>}

      {/* 图片网格 */}
      {!error && (
        <>
          {/* 图片列表 */}
          <Waterfall data={data} />

          {/* 空状态 - 暂时不考虑 */}
        </>
      )}
    </div>
  )
}

export default Page
