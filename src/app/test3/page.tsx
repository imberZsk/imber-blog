import Image from 'next/image'
import { PADDING_TOP } from '../const'
import { cn } from '@/lib/utils'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '测试页面3 - 图片展示 | Imber的博客',
  description: 'Imber博客的第三个测试页面，展示Next.js图片优化效果，使用priority属性和响应式加载',
  keywords: ['测试页面', '图片优化', 'Next.js', 'Imber博客', '前端开发', '响应式图片'],
  openGraph: {
    title: '测试页面3 - 图片展示 | Imber的博客',
    description: '展示Next.js图片优化效果的测试页面',
    url: 'https://imber.netlify.app/test3',
    siteName: 'Imber的博客',
    images: [
      {
        url: 'https://ssm.res.meizu.com/admin/2025/06/06/1037623787/e99fHVovtI.png',
        width: 1200,
        height: 630,
        alt: '测试图片展示'
      }
    ],
    locale: 'zh_CN',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: '测试页面3 - 图片展示 | Imber的博客',
    description: '展示Next.js图片优化效果的测试页面',
    images: [
      {
        url: 'https://ssm.res.meizu.com/admin/2025/06/06/1037623787/e99fHVovtI.png',
        alt: '测试图片展示'
      }
    ]
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
    canonical: 'https://imber.netlify.app/test3'
  }
}

const Test = () => {
  // JSON-LD 结构化数据
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: '测试页面3 - 图片展示',
    description: 'Imber博客的测试页面，展示Next.js图片优化效果',
    url: 'https://imber.netlify.app/test3',
    mainEntity: {
      '@type': 'ImageObject',
      url: 'https://ssm.res.meizu.com/admin/2025/06/06/1037623787/e99fHVovtI.png',
      description: '测试图片展示'
    },
    author: {
      '@type': 'Person',
      name: 'Imber',
      jobTitle: 'NodeJS Full Stack Developer'
    },
    publisher: {
      '@type': 'Person',
      name: 'Imber'
    }
  }

  return (
    <>
      {/* JSON-LD 结构化数据 */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className={cn(PADDING_TOP)}>
        <div className="absolute h-40 w-40">
          <Image
            src="https://ssm.res.meizu.com/admin/2025/06/06/1037623787/e99fHVovtI.png"
            alt="测试图片展示 - Next.js图片优化示例"
            fill
            priority
            sizes="160px"
            style={{ objectFit: 'cover' }}
          />
        </div>
      </div>
    </>
  )
}

export default Test
