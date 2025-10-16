import { cn } from '@/lib/utils'
import { PADDING_TOP } from '../const'
import Client from './client'
import { postsConfig } from './config'

const Page = async () => {
  const categories = ['editor']

  return (
    <div className={cn('mx-auto max-w-4xl px-4 py-6', PADDING_TOP)}>
      <Client posts={postsConfig} categories={categories} />
    </div>
  )
}

export default Page
