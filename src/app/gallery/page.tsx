import { cn } from '@/lib/utils'
// import { fetchGitHubImages } from '@/services/gallery'
// import Waterfall from './waterfall'

const Page = async () => {
  // const { data, error } = await fetchGitHubImages()

  return (
    <div className={cn('mx-auto flex items-center justify-center px-5 pt-32 text-center text-red-500')}>
      <div>
        <p> 暂时关闭 gallery 页面，需要修改</p>
        <p> TOOD: 之前图片放 Github 老是有点问题，或者网速太慢，准备修改</p>
      </div>
      {/* 错误状态 */}
      {/* {error && <div>请求失败</div>} */}
      {/* {!error && (
        <>
          <Waterfall data={data} />
        </>
      )} */}
    </div>
  )
}

export default Page
