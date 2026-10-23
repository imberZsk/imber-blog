'use client'
import { useGSAP } from '@gsap/react'
import React from 'react'
import { gsap } from 'gsap'
import Image from 'next/image'
import './section.css'
import { AnimationSourceStatic } from '@/components/lab/animation-source'
import { ANIMATION_BASE_PATH } from '@/app/lab/animation/config'

const PAGE_CODE = `

`

const Section = () => {
  useGSAP(() => {
    // 获取手机容器的位置
    const phoneRect = document.querySelector('.phone-container')?.getBoundingClientRect()
    const videoRect = document.querySelector('.video-container')?.getBoundingClientRect()

    if (phoneRect && videoRect) {
      // 计算相对于视频容器的裁剪值
      const top = phoneRect.top - videoRect.top + 10
      const right = videoRect.right - phoneRect.right + 10
      const bottom = videoRect.bottom - phoneRect.bottom + 10
      const left = phoneRect.left - videoRect.left + 10

      // 时间线
      gsap.timeline({
        scrollTrigger: {
          trigger: '.inner-container',
          start: 'center center',
          end: '+=3000',
          pin: true, // pin 中间
          invalidateOnRefresh: true
          // scrub: 1, // 想让动画立即执行，所以先不用 scrub
        }
      })

      // 裁剪视频和缩小视频
      const t1 = gsap.timeline({
        scrollTrigger: {
          trigger: '.section-container', // 触发器对外层元素，总的有 100vh + 1200
          start: 'top top-=10',
          end: 'top top',
          markers: true,
          toggleActions: 'play none none reverse'
        }
      })

      t1.to('.video-container', {
        clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round 26px)`
      }).to(
        '.video',
        {
          scale: 0.5
        },
        '<'
      ) // 同时执行

      // 早上
      const t2 = gsap.timeline({
        scrollTrigger: {
          trigger: '.section-container', // 触发器对外层元素，总的有 100vh + 1200
          start: '37.5% center',
          end: '37.5% center',
          markers: true,
          toggleActions: 'play none none reverse'
        }
      })

      t2.to('.video-container', {
        opacity: 0
      })
        .to(
          '.morning-content',
          {
            opacity: 1
          },
          '<'
        )
        .to(
          ['.morning1', '.morning2'],
          {
            x: '-120%',
            opacity: 1
          },
          '<'
        )
        .to(
          '.morning3',
          {
            x: '120%',
            opacity: 1
          },
          '<'
        )

      const t3 = gsap.timeline({
        scrollTrigger: {
          trigger: '.section-container',
          start: '50% center',
          end: '50% center',
          // markers: true,
          toggleActions: 'play none none reverse'
        }
      })

      // noon
      t3.to('.morning-content', {
        opacity: 0
      }).addLabel('morning')

      t3.to(
        '.section-container',
        {
          background: 'linear-gradient(180deg,#a79dea 19.29%,#e1e0f4 99.02%)',
          duration: 0
        },
        'morning-=0.5'
      )

      t3.to(
        ['.morning1', '.morning2', '.morning3'],
        {
          opacity: 0
        },
        'morning-=0.5' // 早点会更好看
      )

      t3.to(
        '.noon-content',
        {
          opacity: 1
        },
        'morning-=0.5'
      )

      t3.to(
        ['.noon1', '.noon2'],
        {
          x: '-120%',
          opacity: 1
        },
        'morning-=0.5'
      )

      t3.to(
        '.noon3',
        {
          x: '120%',
          opacity: 1
        },
        'morning-=0.5'
      )

      // evening
      const t4 = gsap.timeline({
        scrollTrigger: {
          trigger: '.section-container',
          start: '62.5% center',
          end: '62.5% center',
          // markers: true,
          toggleActions: 'play none none reverse'
        }
      })
      t4.to('.noon-content', {
        opacity: 0
      }).addLabel('noon')

      t4.to(
        '.section-container',
        {
          background: 'linear-gradient(180deg,#91b0f4 19.29%,#d8def5 99.02%)',
          duration: 0
        },
        'morning-=0.5'
      )

      t4.to(
        ['.noon1', '.noon2', '.noon3'],
        {
          opacity: 0
        },
        'noon-=0.5'
      )

      t4.to(
        '.evening-content',
        {
          opacity: 1
        },
        'noon-=0.5'
      )

      t4.to(
        ['.evening1', '.evening2'],
        {
          x: '-120%',
          opacity: 1
        },
        'noon-=0.5'
      )

      t4.to(
        ['.evening3', '.evening4'],
        {
          x: '120%',
          opacity: 1
        },
        'noon-=0.5'
      )
    }
  })
  return (
    <div className="section-container relative h-[calc(100vh+3000px)] w-full overflow-hidden">
      <AnimationSourceStatic pageCode={PAGE_CODE} pageFilename="page.tsx" componentCodes={[]} />

      <div className="inner-container relative h-screen">
        {/* 视频 */}
        <div className="video-container relative z-10 h-full bg-white">
          <div className="mx-auto h-full max-w-[1200px]">
            <video
              autoPlay
              className="video h-screen w-full"
              muted
              src={`${ANIMATION_BASE_PATH}/multipart-scrollTrigger/1.mp4`}
            ></video>
          </div>
          <div className="colorful"></div>
        </div>

        {/* 中间容器 */}
        <div className="phone-container absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute top-[-200px] left-1/2 w-[1280px] -translate-x-1/2 text-center">
            <h2 className="mb-2 text-6xl leading-[1.41] font-bold">随场景智能变化</h2>
            <div className="text-lg">聚合多应用信息与服务，以细致入微的洞察为你提供温暖周到的建议</div>
          </div>

          {/* 手机框 */}
          <div className="h-[656px] w-[300px]">
            <Image
              unoptimized
              alt="image"
              height={656}
              src={`${ANIMATION_BASE_PATH}/multipart-scrollTrigger/phone.png`}
              width={300}
            />
          </div>

          {/* morning */}
          <div className="morning-content absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 overflow-hidden p-3 opacity-0">
            <Image
              unoptimized
              alt="image"
              className="h-full w-full rounded-[26px] object-cover"
              height={656}
              src={`${ANIMATION_BASE_PATH}/multipart-scrollTrigger/morning-content.webp`}
              width={300}
            />
          </div>
          <div className="morning1 absolute top-0 left-1/2 h-[306px] w-[340px] -translate-x-1/2 opacity-0">
            <Image
              unoptimized
              alt=""
              className="h-full w-full object-contain"
              height={306}
              src={`${ANIMATION_BASE_PATH}/multipart-scrollTrigger/morning1.webp`}
              width={340}
            />
          </div>
          <div className="morning2 absolute bottom-0 left-1/2 h-[286px] w-[340px] -translate-x-1/2 opacity-0">
            <Image
              unoptimized
              alt=""
              className="h-full w-full object-contain"
              height={286}
              src={`${ANIMATION_BASE_PATH}/multipart-scrollTrigger/morning2.webp`}
              width={340}
            />
          </div>
          <div className="morning3 absolute top-0 left-1/2 h-[627px] w-[377px] -translate-x-1/2 opacity-0">
            <Image
              unoptimized
              alt=""
              className="h-full w-full object-contain"
              height={627}
              src={`${ANIMATION_BASE_PATH}/multipart-scrollTrigger/morning3.webp`}
              width={377}
            />
          </div>

          {/* noon */}
          <div className="noon-content absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 overflow-hidden p-3 opacity-0">
            <Image
              unoptimized
              alt="image"
              className="h-full w-full rounded-[26px] object-cover"
              height={656}
              src={`${ANIMATION_BASE_PATH}/multipart-scrollTrigger/noon-content.webp`}
              width={300}
            />
          </div>
          <div className="noon1 absolute top-0 left-1/2 h-[306px] w-[340px] -translate-x-1/2 opacity-0">
            <Image
              unoptimized
              alt=""
              className="h-full w-full object-contain"
              height={306}
              src={`${ANIMATION_BASE_PATH}/multipart-scrollTrigger/noon1.webp`}
              width={340}
            />
          </div>
          <div className="noon2 absolute bottom-0 left-1/2 h-[286px] w-[340px] -translate-x-1/2 opacity-0">
            <Image
              unoptimized
              alt=""
              className="h-full w-full object-contain"
              height={286}
              src={`${ANIMATION_BASE_PATH}/multipart-scrollTrigger/noon2.webp`}
              width={340}
            />
          </div>
          <div className="noon3 absolute top-0 left-1/2 h-[627px] w-[377px] -translate-x-1/2 opacity-0">
            <Image
              unoptimized
              alt=""
              className="h-full w-full object-contain"
              height={627}
              src={`${ANIMATION_BASE_PATH}/multipart-scrollTrigger/noon3.webp`}
              width={377}
            />
          </div>

          {/* evening */}
          <div className="evening-content absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 overflow-hidden p-3 opacity-0">
            <Image
              unoptimized
              alt="image"
              className="h-full w-full rounded-[26px] object-cover"
              height={656}
              src={`${ANIMATION_BASE_PATH}/multipart-scrollTrigger/evening-content.webp`}
              width={300}
            />
          </div>
          <div className="evening1 absolute top-0 left-1/2 h-[306px] w-[340px] -translate-x-1/2 opacity-0">
            <Image
              unoptimized
              alt=""
              className="h-full w-full object-contain"
              height={306}
              src={`${ANIMATION_BASE_PATH}/multipart-scrollTrigger/evening1.webp`}
              width={340}
            />
          </div>
          <div className="evening2 absolute bottom-0 left-1/2 h-[286px] w-[340px] -translate-x-1/2 opacity-0">
            <Image
              unoptimized
              alt=""
              className="h-full w-full object-contain"
              height={286}
              src={`${ANIMATION_BASE_PATH}/multipart-scrollTrigger/evening2.webp`}
              width={340}
            />
          </div>
          <div className="evening3 absolute top-0 left-1/2 h-[368px] w-[340px] -translate-x-1/2 opacity-0">
            <Image
              unoptimized
              alt=""
              className="h-full w-full object-contain"
              height={368}
              src={`${ANIMATION_BASE_PATH}/multipart-scrollTrigger/evening3.webp`}
              width={340}
            />
          </div>
          <div className="evening4 absolute bottom-0 left-1/2 h-[171px] w-[340px] -translate-x-1/2 opacity-0">
            <Image
              unoptimized
              alt=""
              className="h-full w-full object-contain"
              height={171}
              src={`${ANIMATION_BASE_PATH}/multipart-scrollTrigger/evening4.webp`}
              width={340}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Section
