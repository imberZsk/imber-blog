import { Github, Mail, Twitter, UserCircle2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import BlurText from '@/components/BlurText/BlurText'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[rgba(28,28,30)] text-zinc-100">
      {/* Navigation */}
      <header className="fixed top-0 z-10 w-full bg-[#1a1a1a]/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Image src="/avatar.jpg" alt="Logo" width={32} height={32} className="rounded-full" />
            </Link>

            {/* Center Navigation */}
            <nav className="absolute left-1/2 -translate-x-1/2">
              <div className="rounded-full bg-white/5 px-6 py-2 backdrop-blur-md">
                <ul className="flex items-center gap-6 text-sm">
                  <li>
                    <Link href="/articles" className="text-zinc-100 transition-colors hover:text-zinc-400">
                      文集
                    </Link>
                  </li>
                  <li>
                    <Link href="/notes" className="text-zinc-100 transition-colors hover:text-zinc-400">
                      手记
                    </Link>
                  </li>
                  <li>
                    <Link href="/friends" className="text-zinc-100 transition-colors hover:text-zinc-400">
                      朋友
                    </Link>
                  </li>
                  <li>
                    <Link href="/more" className="text-zinc-100 transition-colors hover:text-zinc-400">
                      更多
                    </Link>
                  </li>
                </ul>
              </div>
            </nav>

            {/* Login Button */}
            <button className="rounded-full p-2 text-zinc-300 transition-colors hover:bg-white/5 hover:text-zinc-100">
              <UserCircle2 className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex min-h-screen max-w-6xl px-4">
        <div className="flex w-full flex-col items-center justify-center lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          {/* Left Side - Text Content */}
          <div className="order-2 mt-8 text-center lg:order-1 lg:mt-0 lg:flex-1 lg:text-left">
            <h1 className="mb-4 text-4xl font-bold">
              <BlurText
                text="Hi, I'm Innei 👋"
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

          {/* Right Side - Avatar */}
          <div className="order-1 lg:order-2">
            <Image src="/avatar.jpg" alt="Avatar" width={300} height={300} className="rounded-full" priority />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-sm text-zinc-500">
        <BlurText
          text="我既无法了解宇宙，也无法看透未来，一个简单的自我"
          delay={200}
          direction="bottom"
          animateBy="words"
          className="inline-block"
        />
      </footer>
    </div>
  )
}
