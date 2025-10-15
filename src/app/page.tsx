import { Github } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Metadata } from 'next'
// import Aurora from '@/components/Aurora/Aurora'
import { JuejinSvg } from '@/components/icons'
import { BlurText } from '@/components/content'

export const metadata: Metadata = {
  title: 'Imber | NodeJS Full Stack Developer',
  description:
    "Hi, I'm Imber 👋 - 一位热爱编程的独立开发者，专注于NodeJS全栈开发。分享前端、后端技术文章，记录编程之路的点点滴滴。",
  keywords: [
    'Imber',
    'NodeJS',
    'Full Stack Developer',
    '全栈开发者',
    '前端开发',
    '后端开发',
    'JavaScript',
    'TypeScript',
    'React',
    'Next.js',
    '独立开发者',
    '个人博客',
    '技术分享',
    '编程'
  ],
  authors: [{ name: 'Imber', url: 'https://imber.netlify.app' }],
  creator: 'Imber',
  publisher: 'Imber',
  openGraph: {
    title: 'Imber | NodeJS Full Stack Developer',
    description: "Hi, I'm Imber 👋 - 一位热爱编程的独立开发者，专注于NodeJS全栈开发",
    url: 'https://imber.netlify.app',
    siteName: 'Imber的博客',
    images: [
      {
        url: 'https://imber.netlify.app/avatar.jpg',
        width: 1200,
        height: 630,
        alt: 'Imber - NodeJS Full Stack Developer'
      }
    ],
    locale: 'zh_CN',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Imber | NodeJS Full Stack Developer',
    description: "Hi, I'm Imber 👋 - 一位热爱编程的独立开发者，专注于NodeJS全栈开发",
    images: ['https://imber.netlify.app/avatar.jpg']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  alternates: {
    canonical: 'https://imber.netlify.app'
  },
  verification: {
    // 可以在这里添加Google Search Console验证码
    // google: 'your-google-verification-code'
  }
}

export default function HomePage() {
  // JSON-LD 结构化数据
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Imber',
    jobTitle: 'NodeJS Full Stack Developer',
    description: '一位热爱编程的独立开发者，专注于NodeJS全栈开发',
    url: 'https://imber.netlify.app',
    image: 'https://imber.netlify.app/avatar.jpg',
    sameAs: ['https://github.com/imberZsk', 'https://juejin.cn/user/3378167164966920/posts'],
    worksFor: {
      '@type': 'Organization',
      name: '独立开发者'
    },
    knowsAbout: [
      'NodeJS',
      'JavaScript',
      'TypeScript',
      'React',
      'Next.js',
      'Full Stack Development',
      'Frontend Development',
      'Backend Development'
    ],
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': 'https://imber.netlify.app'
    }
  }

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Imber的博客',
    alternateName: 'Imber Blog',
    url: 'https://imber.netlify.app',
    description: 'Imber的个人博客 - NodeJS全栈开发者，分享技术文章和开发经验',
    inLanguage: 'zh-CN',
    author: {
      '@type': 'Person',
      name: 'Imber'
    },
    publisher: {
      '@type': 'Person',
      name: 'Imber'
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://imber.netlify.app/search?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  }

  return (
    <>
      {/* JSON-LD 结构化数据 */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />

      <div className="min-h-screen text-zinc-900 dark:text-zinc-100">
        <section className="relative h-screen">
          {/* <Aurora /> */}

          {/* Main Content */}
          <main className="mx-auto flex min-h-screen max-w-6xl px-4">
            <div className="flex w-full flex-col items-center justify-center lg:flex-row lg:items-center lg:justify-between lg:gap-12">
              {/* Text Content */}
              <div className="mt-20 text-center lg:mt-0 lg:flex-1 lg:text-left">
                <h1 className="mb-4 text-4xl font-bold">
                  <BlurText text="Hi, I'm Imber 👋" delay={50} animateBy="chars" ease="none" className="inline-block" />
                </h1>
                <div className="mb-8 space-y-2">
                  <div className="text-xl">
                    <BlurText delay={50} animateBy="chars" ease="none" className="inline-block">
                      A NodeJS Full Stack{' '}
                      <span className="font-mono text-yellow-600 dark:text-yellow-500">&lt;Developer /&gt;</span>
                    </BlurText>
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    <BlurText
                      text="An independent developer coding with love"
                      delay={50}
                      animateBy="chars"
                      ease="none"
                      className="inline-block"
                    />
                  </div>
                </div>

                {/* Social Links */}
                <div className="flex justify-center gap-2 lg:justify-start">
                  <Link
                    href="https://github.com/imberZsk"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="访问Imber的GitHub主页"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-zinc-900 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                  >
                    <Github className="h-5 w-5" />
                  </Link>
                  <Link
                    href="https://juejin.cn/user/3378167164966920/posts"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="访问Imber的掘金主页"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-zinc-900 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                  >
                    <JuejinSvg className="h-5 w-5" />
                  </Link>
                </div>
              </div>

              {/* Avatar - Moved below text on mobile */}
              <div className="mt-8 w-48 lg:mt-0 lg:w-72">
                <Image
                  src="/avatar.jpg"
                  alt="Imber的头像 - NodeJS全栈开发者"
                  width={300}
                  height={300}
                  className="rounded-full"
                  priority
                />
              </div>
            </div>
          </main>

          {/* Footer */}
          <div className="absolute bottom-0 left-1/2 mx-auto w-full -translate-x-1/2 px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-500">
            <BlurText
              text="我既无法了解宇宙，也无法看透未来，一个简单的自我"
              delay={200}
              animateBy="words"
              ease="none"
              className="inline-block"
            />
          </div>
        </section>
      </div>
    </>
  )
}
