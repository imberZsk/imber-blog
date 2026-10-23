import type { ReactNode } from 'react'
import { AnimationNavigation } from '@/components/lab/animation-navigation'

/** 为动画列表和详情保留同一份实验导航；children 为具体实验页面。 */
export default function AnimationLayout({ children }: { children: ReactNode }) {
  return <AnimationNavigation>{children}</AnimationNavigation>
}
