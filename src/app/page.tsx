import { ArrowRight, BookOpen, Github } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Metadata } from 'next'
import { JuejinSvg } from '@/components/icons'
import { Button } from '@/components/ui'
import { HomeHero } from './home-hero'

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
  /** 首页对应的作者结构化数据。 */
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

  /** 首页对应的网站结构化数据。 */
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />

      <main className="bg-background text-foreground pt-16">
        <HomeHero>
          <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-10 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-24 lg:py-16">
            <div className="max-w-2xl">
              <div
                data-hero-accent
                className="text-mint mb-5 flex origin-left items-center gap-3 text-xs font-semibold"
              >
                <span className="bg-mint h-px w-10" aria-hidden="true" />
                ENGINEERING NOTES / 2026
              </div>
              <h1 data-hero-reveal className="text-foreground text-4xl font-semibold sm:text-6xl">
                Imber 的开发笔记
              </h1>
              <p data-hero-reveal className="text-muted-foreground mt-5 max-w-lg text-base leading-7">
                记录全栈开发、AI 编程与大模型应用实践，把复杂问题沉淀成可复用的工程经验。
              </p>
              <div data-hero-reveal className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/knowledge">
                    浏览知识库
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/posts">
                    <BookOpen aria-hidden="true" />
                    阅读文集
                  </Link>
                </Button>
              </div>
              <div data-hero-reveal className="mt-7 flex items-center gap-2">
                <Button asChild variant="outline" size="icon">
                  <Link
                    href="https://github.com/imberZsk"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="访问 Imber 的 GitHub 主页"
                    title="GitHub"
                  >
                    <Github aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="icon">
                  <Link
                    href="https://juejin.cn/user/3378167164966920/posts"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="访问 Imber 的掘金主页"
                    title="掘金"
                  >
                    <JuejinSvg className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>

            <div data-hero-visual className="justify-self-center lg:justify-self-end">
              <Image
                src="/avatar.jpg"
                alt="Imber，AI 应用开发工程师"
                width={360}
                height={360}
                className="border-border aspect-square w-52 rounded-lg border object-cover transition-transform duration-500 ease-out hover:-translate-y-1 sm:w-64 lg:w-80"
                priority
              />
            </div>
          </div>
        </HomeHero>
      </main>
    </>
  )
}
