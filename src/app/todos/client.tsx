'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'

interface Todo {
  id: string
  title: string
  taskStatus: 'todo' | 'doing' | 'done'
  priority: string
  createdAt: Date
}

interface ClientProps {
  todos: Todo[]
}

const Client = ({ todos }: ClientProps) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'doing' | 'completed'>('all')

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return todo.taskStatus === 'todo'
    if (filter === 'doing') return todo.taskStatus === 'doing'
    if (filter === 'completed') return todo.taskStatus === 'done'
    return true
  })

  const todoCount = todos.length
  const notStartedCount = todos.filter((todo) => todo.taskStatus === 'todo').length
  const doingCount = todos.filter((todo) => todo.taskStatus === 'doing').length
  const doneCount = todos.filter((todo) => todo.taskStatus === 'done').length
  const completionRate = todoCount > 0 ? Math.round((doneCount / todoCount) * 100) : 0

  return (
    <div className="rounded-xl border border-zinc-200 bg-white/90 p-6 backdrop-blur-sm dark:border-zinc-800 dark:bg-black/90">
      {/* 头部信息 */}
      <div className="mb-6 text-center">
        <h1 className="mb-2 text-2xl font-light text-zinc-800 dark:text-white">
          Todo <span className="font-medium text-zinc-600 dark:text-zinc-400">展示</span>
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-500">实时展示任务完成情况</p>
      </div>

      {/* 统计概览 */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mb-1 text-2xl font-semibold text-zinc-800 dark:text-white">{todoCount}</div>
          <div className="text-xs tracking-wider text-zinc-600 uppercase dark:text-zinc-400">总任务</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mb-1 text-2xl font-semibold text-zinc-800 dark:text-white">{notStartedCount}</div>
          <div className="text-xs tracking-wider text-zinc-600 uppercase dark:text-zinc-400">未开始</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mb-1 text-2xl font-semibold text-zinc-800 dark:text-white">{doingCount}</div>
          <div className="text-xs tracking-wider text-zinc-600 uppercase dark:text-zinc-400">进行中</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mb-1 text-2xl font-semibold text-zinc-800 dark:text-white">{doneCount}</div>
          <div className="text-xs tracking-wider text-zinc-600 uppercase dark:text-zinc-400">已完成</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mb-1 text-2xl font-semibold text-zinc-800 dark:text-white">{completionRate}%</div>
          <div className="text-xs tracking-wider text-zinc-600 uppercase dark:text-zinc-400">完成率</div>
        </div>
      </div>

      {/* 完成度进度条 */}
      {todos.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">整体进度</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{completionRate}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full bg-zinc-800 transition-all duration-500 ease-out dark:bg-white"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* 过滤器 */}
      <div className="mb-6 flex justify-center gap-2">
        {(['all', 'active', 'doing', 'completed'] as const).map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType)}
            className={cn(
              'cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
              filter === filterType
                ? 'bg-zinc-800 text-white dark:bg-white dark:text-black'
                : 'border border-zinc-300 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white'
            )}
          >
            {filterType === 'all' && '全部'}
            {filterType === 'active' && '未开始'}
            {filterType === 'doing' && '进行中'}
            {filterType === 'completed' && '已完成'}
          </button>
        ))}
      </div>

      {/* 任务列表 */}
      <div className="space-y-3">
        {filteredTodos.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-4 text-zinc-500 dark:text-zinc-600">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-500">
              {filter === 'active' && '暂无待完成任务'}
              {filter === 'completed' && '暂无已完成任务'}
              {filter === 'all' && '暂无任务数据'}
            </p>
          </div>
        ) : (
          filteredTodos.map((todo) => (
            <div
              key={todo.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-4 transition-all duration-200',
                'border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-900/30 dark:hover:bg-zinc-800/50',
                todo.taskStatus === 'done' && 'opacity-60'
              )}
            >
              {/* 状态指示器 */}
              <div
                className={cn(
                  'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2',
                  todo.taskStatus === 'done'
                    ? 'border-zinc-800 bg-zinc-800 dark:border-white dark:bg-white'
                    : 'border-zinc-400 dark:border-zinc-600'
                )}
              >
                {todo.taskStatus === 'done' && (
                  <svg
                    className="h-3 w-3 text-white dark:text-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <polyline points="20,6 9,17 4,12" strokeWidth={3}></polyline>
                  </svg>
                )}
              </div>

              {/* 任务文本 */}
              <span
                className={cn(
                  'flex-1 text-sm transition-all duration-200',
                  todo.taskStatus === 'done'
                    ? 'text-zinc-500 line-through dark:text-zinc-400'
                    : 'text-zinc-800 dark:text-white'
                )}
              >
                {todo.title}
              </span>

              {/* 创建时间 */}
              <span className="flex-shrink-0 text-xs text-zinc-600 dark:text-zinc-500">
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
                  todo.taskStatus === 'done'
                    ? 'border border-zinc-400 bg-zinc-200 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                    : 'border border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                )}
              >
                {todo.taskStatus === 'done' ? '已完成' : todo.taskStatus === 'doing' ? '进行中' : '未开始'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Client
