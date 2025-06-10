'use client'

import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import { PADDING_TOP } from '@/app/const'

interface MDXContentProps {
  children: React.ReactNode
}

export function MDXContent({ children }: MDXContentProps) {
  return (
    <motion.article
      className={cn(
        // 'prose prose-headings:mt-8 prose-headings:font-semibold prose-headings:text-black prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-h4:text-xl prose-h5:text-lg prose-h6:text-base dark:prose-headings:text-white mx-auto max-w-3xl px-4',
        'prose mx-auto max-w-3xl px-4 pb-8',
        PADDING_TOP
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.article>
  )
}
