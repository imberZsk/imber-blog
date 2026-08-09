'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'

/** 为首页首屏提供一次性、可跳过的层级入场动效。 */
export function HomeHero({ children }: { children: React.ReactNode }) {
  /** 承载首页首屏元素的容器，用于限定 GSAP 查询范围。 */
  const heroRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      /** 用户降低动态效果时不执行动画，内容保持立即可见。 */
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (!heroRef.current) {
        return
      }

      if (reducedMotion) {
        gsap.set(heroRef.current, { autoAlpha: 1 })
        return
      }

      // 服务端先隐藏整个首屏，客户端一次性设置子元素起点后再显示，避免内容先闪现再消失。
      gsap.set('[data-hero-accent]', { scaleX: 0, autoAlpha: 0 })
      gsap.set('[data-hero-reveal]', { autoAlpha: 0, y: 14 })
      gsap.set('[data-hero-visual]', { autoAlpha: 0, scale: 0.96, y: 10 })
      gsap.set(heroRef.current, { autoAlpha: 1 })

      /** 首页动画时间线，仅在首次进入时建立一次视觉层级。 */
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })

      timeline
        .to('[data-hero-accent]', { scaleX: 1, autoAlpha: 1, duration: 0.45 })
        .to('[data-hero-reveal]', { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.09 }, '-=0.18')
        .to('[data-hero-visual]', { autoAlpha: 1, scale: 1, y: 0, duration: 0.7 }, '-=0.45')
    },
    { scope: heroRef }
  )

  return (
    <section ref={heroRef} className="opacity-0 motion-reduce:opacity-100">
      {children}
    </section>
  )
}
