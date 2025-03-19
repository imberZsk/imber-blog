import { Github, Mail, Twitter } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import BlurText from '@/components/BlurText/BlurText'
import Aurora from '@/components/Aurora/Aurora'

export default function HomePage() {
  return (
    <div className="min-h-screen text-zinc-100">
      <section className="relative h-screen">
        <Aurora />

        {/* Main Content */}
        <main className="mx-auto flex min-h-screen max-w-6xl px-4">
          <div className="flex w-full flex-col items-center justify-center lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            {/* Text Content */}
            <div className="mt-20 text-center lg:mt-0 lg:flex-1 lg:text-left">
              <h1 className="mb-4 text-4xl font-bold">
                <BlurText
                  text="Hi, I'm Imber 👋"
                  delay={50}
                  direction="bottom"
                  animateBy="words"
                  className="inline-block"
                />{' '}
              </h1>
              <div className="mb-8 space-y-2">
                <div className="text-xl">
                  <BlurText
                    text="A NodeJS Full Stack"
                    delay={100}
                    direction="bottom"
                    animateBy="words"
                    className="inline-block"
                  />{' '}
                  <BlurText
                    text="<Developer />"
                    delay={150}
                    direction="bottom"
                    animateBy="letters"
                    className="inline-block font-mono text-yellow-500"
                  />
                </div>
                <div className="text-sm text-zinc-400">
                  <BlurText
                    text="An independent developer coding with love"
                    delay={200}
                    direction="bottom"
                    animateBy="words"
                    className="inline-block"
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="flex justify-center gap-2 lg:justify-start">
                <Link
                  href="https://innei.in"
                  target="_blank"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 transition-colors hover:bg-blue-500/20"
                >
                  <Mail className="h-5 w-5" />
                </Link>
                <Link
                  href="https://github.com"
                  target="_blank"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-500 transition-colors hover:bg-red-500/20"
                >
                  <Github className="h-5 w-5" />
                </Link>
                <Link
                  href="https://github.com"
                  target="_blank"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/10 text-white transition-colors hover:bg-black/20"
                >
                  <Github className="h-5 w-5" />
                </Link>
                <Link
                  href="https://github.com"
                  target="_blank"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10 text-orange-500 transition-colors hover:bg-orange-500/20"
                >
                  <Github className="h-5 w-5" />
                </Link>
                <Link
                  href="https://github.com"
                  target="_blank"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 transition-colors hover:bg-blue-500/20"
                >
                  <Twitter className="h-5 w-5" />
                </Link>
              </div>
            </div>

            {/* Avatar - Moved below text on mobile */}
            <div className="mt-8 w-48 lg:mt-0 lg:w-72">
              <Image src="/avatar.jpg" alt="Avatar" width={300} height={300} className="rounded-full" priority />
            </div>
          </div>
        </main>

        {/* Footer */}
        <div className="absolute bottom-0 left-1/2 mx-auto w-full -translate-x-1/2 px-4 py-8 text-center text-sm text-zinc-500">
          <BlurText
            text="我既无法了解宇宙，也无法看透未来，一个简单的自我"
            delay={200}
            direction="bottom"
            animateBy="words"
            className="inline-block"
          />
        </div>
      </section>
    </div>
  )
}
