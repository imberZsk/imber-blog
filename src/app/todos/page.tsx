'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { PADDING_TOP } from '../const'

interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: Date
}

const TodoDisplay = () => {
  const [todos, setTodos] = useState<Todo[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  // 从 localStorage 加载数据
  useEffect(() => {
    const loadTodos = () => {
      const savedTodos = localStorage.getItem('todos')
      if (savedTodos) {
        try {
          const parsedTodos = JSON.parse(savedTodos).map((todo: any) => ({
            ...todo,
            createdAt: new Date(todo.createdAt)
          }))
          setTodos(parsedTodos)
        } catch (error) {
          console.error('Error loading todos:', error)
        }
      }
    }

    loadTodos()

    // 定期更新数据以反映管理端的变化
    const interval = setInterval(loadTodos, 1000)

    return () => clearInterval(interval)
  }, [])

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  const activeTodosCount = todos.filter((todo) => !todo.completed).length
  const completedTodosCount = todos.filter((todo) => todo.completed).length
  const completionRate = todos.length > 0 ? Math.round((completedTodosCount / todos.length) * 100) : 0

  return (
    <div className={cn('mx-auto max-w-4xl px-4', PADDING_TOP)}>
      <div className="rounded-xl border border-zinc-800 bg-black/90 p-6 backdrop-blur-sm">
        {/* 头部信息 */}
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-light text-white">
            Todo <span className="font-medium text-zinc-400">展示</span>
          </h1>
          <p className="text-sm text-zinc-500">实时展示任务完成情况</p>
        </div>

        {/* 统计概览 */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="mb-1 text-2xl font-semibold text-white">{todos.length}</div>
            <div className="text-xs tracking-wider text-zinc-400 uppercase">总任务</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="mb-1 text-2xl font-semibold text-white">{activeTodosCount}</div>
            <div className="text-xs tracking-wider text-zinc-400 uppercase">待完成</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="mb-1 text-2xl font-semibold text-white">{completedTodosCount}</div>
            <div className="text-xs tracking-wider text-zinc-400 uppercase">已完成</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="mb-1 text-2xl font-semibold text-white">{completionRate}%</div>
            <div className="text-xs tracking-wider text-zinc-400 uppercase">完成率</div>
          </div>
        </div>

        {/* 完成度进度条 */}
        {todos.length > 0 && (
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-zinc-400">整体进度</span>
              <span className="text-sm text-zinc-400">{completionRate}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-white transition-all duration-500 ease-out"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        )}

        {/* 过滤器 */}
        <div className="mb-6 flex justify-center gap-2">
          {(['all', 'active', 'completed'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                filter === filterType
                  ? 'bg-white text-black'
                  : 'border border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              )}
            >
              {filterType === 'all' && '全部'}
              {filterType === 'active' && '待完成'}
              {filterType === 'completed' && '已完成'}
            </button>
          ))}
        </div>

        {/* 任务列表 */}
        <div className="space-y-3">
          {filteredTodos.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-4 text-zinc-600">
                <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-sm text-zinc-500">
                {filter === 'active' && '暂无待完成任务'}
                {filter === 'completed' && '暂无已完成任务'}
                {filter === 'all' && '暂无任务数据'}
              </p>
            </div>
          ) : (
            filteredTodos.map((todo, index) => (
              <div
                key={todo.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-4 transition-all duration-200',
                  'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800/50',
                  todo.completed && 'opacity-60'
                )}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 0.3s ease forwards'
                }}
              >
                {/* 状态指示器 */}
                <div
                  className={cn(
                    'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2',
                    todo.completed ? 'border-white bg-white' : 'border-zinc-600'
                  )}
                >
                  {todo.completed && (
                    <svg className="h-3 w-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <polyline points="20,6 9,17 4,12" strokeWidth={3}></polyline>
                    </svg>
                  )}
                </div>

                {/* 任务文本 */}
                <span
                  className={cn(
                    'flex-1 text-sm transition-all duration-200',
                    todo.completed ? 'text-zinc-500 line-through' : 'text-white'
                  )}
                >
                  {todo.text}
                </span>

                {/* 创建时间 */}
                <span className="flex-shrink-0 text-xs text-zinc-500">
                  {new Date(todo.createdAt).toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>

                {/* 状态标签 */}
                <div
                  className={cn(
                    'flex-shrink-0 rounded-full px-2 py-1 text-xs font-medium',
                    todo.completed
                      ? 'border border-zinc-600 bg-zinc-800 text-zinc-300'
                      : 'border border-zinc-700 bg-zinc-800 text-zinc-300'
                  )}
                >
                  {todo.completed ? '已完成' : '进行中'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部链接 */}
        {/* <div className="mt-8 border-t border-zinc-800 pt-6 text-center">
          <a
            href="/admin/todos"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-all duration-200 hover:bg-zinc-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            管理任务
          </a>
        </div> */}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default TodoDisplay
