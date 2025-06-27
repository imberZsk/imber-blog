'use client'
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

const client = ({ friends }: { friends: any[] }) => {
  return (
    <>
      {/* 紧凑网格布局 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <AnimatePresence>
          {friends.map((friend, index) => (
            <motion.div
              key={friend.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="group cursor-pointer"
              onClick={() => friend.link && window.open(friend.link, '_blank')}
            >
              <div className="relative overflow-hidden rounded-md border border-zinc-800/50 bg-zinc-900/50 p-4 backdrop-blur-sm transition-all duration-300 hover:border-zinc-700/60 hover:bg-zinc-800/60 hover:shadow-lg hover:shadow-black/20">
                {/* 头像 */}
                <div className="relative mx-auto mb-3 h-12 w-12 overflow-hidden rounded-md">
                  <Image
                    src={friend.avatar[0].url}
                    alt={friend.description}
                    fill
                    sizes="100vw, (min-width: 768px) 50vw, (min-width: 1200px) 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                </div>

                {/* 名字 */}
                <h3 className="mb-1 text-center text-sm font-medium text-zinc-300 transition-colors duration-200 group-hover:text-white">
                  {friend.name}
                </h3>

                {/* 描述 */}
                <p className="line-clamp-2 text-center text-xs text-zinc-500 transition-colors duration-200 group-hover:text-zinc-400">
                  {friend.description}
                </p>

                {/* 悬浮效果 */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>

                {/* 链接指示器 */}
                {friend.link && (
                  <div className="absolute top-2 right-2 opacity-0 transition-opacity duration-200 group-hover:opacity-60">
                    <svg className="h-3 w-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 精致的空状态 */}
      {friends.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24"
        >
          <div className="mb-4 rounded-full bg-zinc-900/50 p-6">
            <svg className="h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="mb-1 text-sm font-medium text-zinc-400">暂无朋友</h3>
          <p className="text-xs text-zinc-600">还没有添加任何朋友</p>
        </motion.div>
      )}
    </>
  )
}

export default client
