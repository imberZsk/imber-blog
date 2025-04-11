'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, X, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Message = {
  id: string
  content: string
  isUser: boolean
  timestamp: string
}

// 本地存储键
const CHAT_HISTORY_KEY = 'blog-chat-history'

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messageEndRef = useRef<HTMLDivElement>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  // 加载聊天历史
  useEffect(() => {
    // 仅在客户端执行
    if (typeof window === 'undefined') return

    try {
      const savedMessages = localStorage.getItem(CHAT_HISTORY_KEY)
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages) as Message[]
        setMessages(parsedMessages)
      } else {
        // 初始欢迎消息
        const welcomeMessage: Message = {
          id: '1',
          content: '你好！我是博客的通义千问助手，有什么我可以帮你的吗？',
          isUser: false,
          timestamp: new Date().toISOString()
        }
        setMessages([welcomeMessage])
      }
    } catch (error) {
      console.error('加载聊天历史失败:', error)
      // 如果加载失败，设置默认欢迎消息
      const welcomeMessage: Message = {
        id: '1',
        content: '你好！我是博客的通义千问助手，有什么我可以帮你的吗？',
        isUser: false,
        timestamp: new Date().toISOString()
      }
      setMessages([welcomeMessage])
    }
  }, [])

  // 保存聊天历史到本地存储
  useEffect(() => {
    // 仅在客户端执行且消息不为空时保存
    if (typeof window === 'undefined' || messages.length === 0) return

    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages))
    } catch (error) {
      console.error('保存聊天历史失败:', error)
    }
  }, [messages])

  // 自动滚动到最新消息
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // 更新未读消息计数
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      // 获取最后一条非用户消息
      const lastBotMessage = [...messages].reverse().find((msg) => !msg.isUser)

      if (lastBotMessage) {
        // 检查这条消息是否是新的（在关闭聊天窗口后收到的）
        const isNewMessage = new Date(lastBotMessage.timestamp) > new Date(Date.now() - 30000) // 30秒内

        if (isNewMessage) {
          setUnreadCount((prevCount) => prevCount + 1)
        }
      }
    } else if (isOpen) {
      // 聊天窗口打开时重置未读消息
      setUnreadCount(0)
    }
  }, [isOpen, messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      isUser: true,
      timestamp: new Date().toISOString()
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          history: messages // 传递聊天历史
        })
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || '请求失败')

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.reply,
        isUser: false,
        timestamp: data.timestamp || new Date().toISOString()
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      console.error('聊天请求失败:', error)

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: '抱歉，发生了错误。请稍后再试。',
          isUser: false,
          timestamp: new Date().toISOString()
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // 清除聊天历史
  const clearChatHistory = () => {
    // 保留默认的欢迎消息
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      content: '聊天历史已清除。有什么我可以帮你的吗？',
      isUser: false,
      timestamp: new Date().toISOString()
    }

    setMessages([welcomeMessage])
  }

  return (
    <>
      {/* 聊天按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-5 bottom-5 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        aria-label="打开聊天"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>

        {/* 未读消息计数 */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* 聊天窗口 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed right-5 bottom-20 z-50 flex h-96 w-80 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl sm:w-96"
          >
            {/* 聊天头部 */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-blue-600 px-4 py-2 text-white">
              <h3 className="font-medium">通义千问助手</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={clearChatHistory}
                  className="rounded p-1 hover:bg-blue-700"
                  aria-label="清除聊天历史"
                  title="清除聊天历史"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded p-1 hover:bg-blue-700"
                  aria-label="关闭聊天"
                  title="关闭聊天"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* 消息区域 */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
              {messages.map((message) => (
                <div key={message.id} className={`mb-3 flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.isUser ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 shadow'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-opacity-70 mt-1 text-right text-xs">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="mb-3 flex justify-start">
                  <div className="flex max-w-[80%] items-center rounded-lg bg-white px-4 py-2 text-gray-800 shadow">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <p className="text-sm">思考中...</p>
                  </div>
                </div>
              )}
              <div ref={messageEndRef} />
            </div>

            {/* 输入区域 */}
            <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white p-2">
              <div className="flex rounded-md">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="输入您的问题..."
                  className="flex-1 rounded-l-md border border-r-0 border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (input.trim() && !isLoading) {
                        handleSubmit(e)
                      }
                    }
                  }}
                />
                <button
                  type="submit"
                  className="flex items-center justify-center rounded-r-md border border-blue-600 bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading || !input.trim()}
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
