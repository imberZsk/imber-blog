'use client'

import { useRef, type ReactNode } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'

/** 首页首屏容器接收的页面内容。 */
interface HomeHeroProps {
  /** 参与首页分层入场动画的首屏内容。 */
  children: ReactNode
}

/**
 * 保留 CSS 兜底动画的当前视觉帧，再把控制权交给 GSAP。
 * @param element 正在执行首屏兜底动画的元素。
 */
function handOffFallbackAnimation(element: HTMLElement) {
  /** 交接瞬间元素的透明度。 */
  const opacity = gsap.getProperty(element, 'opacity')
  /** 交接瞬间元素的水平位移。 */
  const x = gsap.getProperty(element, 'x')
  /** 交接瞬间元素的垂直位移。 */
  const y = gsap.getProperty(element, 'y')
  /** 交接瞬间元素的水平缩放。 */
  const scaleX = gsap.getProperty(element, 'scaleX')
  /** 交接瞬间元素的垂直缩放。 */
  const scaleY = gsap.getProperty(element, 'scaleY')

  gsap.set(element, {
    animation: 'none', // 停止 CSS 兜底，避免与 GSAP 同时写入样式。
    opacity, // 延续交接瞬间的可见度，不重新隐藏内容。
    x, // 延续交接瞬间的水平位置。
    y, // 延续交接瞬间的垂直位置。
    scaleX, // 延续交接瞬间的水平缩放。
    scaleY // 延续交接瞬间的垂直缩放。
  })
}

/**
 * 为首页首屏提供带无脚本兜底的一次性 GSAP 层级入场动画。
 * @param props 首页首屏内容。
 */
export function HomeHero({ children }: HomeHeroProps) {
  /** 承载首页首屏元素的容器，用于限定 GSAP 查询范围。 */
  const heroRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      /** 当前首页首屏容器。 */
      const heroElement = heroRef.current
      /** 用户是否要求减少动态效果。 */
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (!heroElement || reducedMotion) {
        return
      }

      /** 首屏顶部强调元素。 */
      const accentElement = heroElement.querySelector<HTMLElement>('[data-hero-accent]')
      /** 按阅读顺序进入的标题、描述和操作元素。 */
      const revealElements = gsap.utils.toArray<HTMLElement>('[data-hero-reveal]', heroElement)
      /** 首屏右侧视觉元素。 */
      const visualElement = heroElement.querySelector<HTMLElement>('[data-hero-visual]')

      if (!accentElement || revealElements.length === 0 || !visualElement) {
        return
      }

      /** 所有需要从 CSS 兜底动画交给 GSAP 的元素。 */
      const animatedElements = [accentElement, ...revealElements, visualElement]
      animatedElements.forEach(handOffFallbackAnimation)

      /** 复用原版时间参数的首屏动画时间线。 */
      const timeline = gsap.timeline({
        defaults: {
          ease: 'power3.out' // 快速进入、平滑减速，保持原版的丝滑感。
        }
      })

      timeline
        .to(accentElement, {
          scaleX: 1, // 将强调线完整展开。
          autoAlpha: 1, // 恢复强调内容可见度。
          duration: 0.45 // 保持原版强调段时长。
        })
        .to(
          revealElements,
          {
            autoAlpha: 1, // 依次恢复正文层可见度。
            y: 0, // 依次落到最终纵向位置。
            duration: 0.6, // 保持原版正文段时长。
            stagger: 0.09 // 保持原版阅读顺序间隔。
          },
          '-=0.18'
        )
        .to(
          visualElement,
          {
            autoAlpha: 1, // 恢复图片可见度。
            scale: 1, // 将图片恢复到最终大小。
            y: 0, // 将图片落到最终纵向位置。
            duration: 0.7 // 保持原版图片段时长。
          },
          '-=0.45'
        )
    },
    { scope: heroRef }
  )

  return (
    <section ref={heroRef} className="home-hero">
      {children}
    </section>
  )
}
