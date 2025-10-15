'use client'

import React, { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { navItems } from '@/app/posts/config'

const menuVariants: Variants = {
  closed: {
    opacity: 0,
    y: -4,
    transition: {
      duration: 0.2,
      when: 'beforeChildren'
    }
  },
  open: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      when: 'beforeChildren',
      staggerChildren: 0.06
    }
  }
}

const itemVariants: Variants = {
  closed: {
    opacity: 0,
    x: -16
  },
  open: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.23, 1, 0.32, 1] as const
    }
  }
}

const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="lg:hidden">
      <motion.button
        className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-zinc-100"
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 top-[72px] z-50"
            initial="closed"
            animate="open"
            exit="closed"
            variants={menuVariants}
          >
            <motion.div
              className="h-[calc(100vh-72px)] border-b border-zinc-200/50 bg-white/95 backdrop-blur-xl dark:border-zinc-800/50 dark:bg-[#1a1a1a]/95"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <nav className="mx-auto max-w-6xl px-4 py-8">
                <div className="space-y-3">
                  {navItems.map((item) => (
                    <motion.div key={item.path} variants={itemVariants}>
                      <Link
                        href={item.path}
                        className={`block rounded-lg px-3 py-2 text-base font-medium transition-colors ${
                          pathname === item.path
                            ? 'bg-zinc-100 text-zinc-800 dark:bg-white/10 dark:text-zinc-100'
                            : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100'
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        {item.name}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MobileNav
