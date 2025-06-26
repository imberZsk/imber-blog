'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PADDING_TOP } from '../../const'
import { fetchTodos, addTodo, updateTodo, deleteTodo } from '@/services/todos'

interface Todo {
  id: string
  documentId: string
  title: string
  taskStatus: 'todo' | 'doing' | 'done'
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
  updatedAt: Date
  publishedAt: Date
}

const AdminTodoPage = () => {
  const [inputValue, setInputValue] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const { data, isLoading } = useSWR('admin-todos', fetchTodos, {
    onError: (err) => {
      toast.error(err?.message || '获取任务失败')
    }
  })

  const todos: Todo[] = data?.data || []

  const addTodoHandler = async () => {
    if (inputValue.trim()) {
      try {
        await addTodo({
          title: inputValue.trim(),
          taskStatus: 'todo',
          priority: 'low'
        })
        setInputValue('')
        mutate('admin-todos')
      } catch (e: any) {
        toast.error(e?.message || '添加失败')
      }
    }
  }

  const toggleTodo = async (id: string) => {
    const todo = todos.find((t) => t.id === id)
    if (!todo) return

    let nextStatus: Todo['taskStatus']
    if (todo.taskStatus === 'todo') nextStatus = 'doing'
    else if (todo.taskStatus === 'doing') nextStatus = 'done'
    else nextStatus = 'todo'

    try {
      await updateTodo(todo.documentId, {
        taskStatus: nextStatus
      })
      mutate('admin-todos')
    } catch (e: any) {
      toast.error(e?.message || '更新失败')
    }
  }

  const deleteTodoHandler = async (documentId: string) => {
    try {
      await deleteTodo(documentId)
      mutate('admin-todos')
    } catch (e: any) {
      toast.error(e?.message || '删除失败')
    }
  }

  // const clearCompleted = async () => {
  //   const completed = todos.filter((todo) => todo.taskStatus === 'done')
  //   try {
  //     await Promise.all(completed.map((todo) => deleteTodo(todo.documentId)))
  //     mutate('admin-todos')
  //   } catch (e: any) {
  //     toast.error(e?.message || '清除失败')
  //   }
  // }

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return todo.taskStatus === 'todo'
    if (filter === 'completed') return todo.taskStatus === 'done'
    return true
  })

  const notStartedCount = todos.filter((todo) => todo.taskStatus === 'todo').length
  const doingCount = todos.filter((todo) => todo.taskStatus === 'doing').length
  const doneCount = todos.filter((todo) => todo.taskStatus === 'done').length

  if (isLoading) {
    return (
      <div className={cn('mx-auto max-w-4xl px-4', PADDING_TOP)}>
        <div className="py-20 text-center text-zinc-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className={cn('mx-auto max-w-4xl px-4', PADDING_TOP)}>
      <div className="rounded-xl border border-zinc-800 bg-black/90 p-6">
        {/* 标题 */}
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-light text-white">
            Todo <span className="font-medium text-zinc-400">管理</span>
          </h1>
          <div className="flex justify-center gap-4 text-sm text-zinc-400">
            <a href="/todos" className="transition-colors hover:text-white">
              查看展示页面 →
            </a>
          </div>
        </div>

        {/* 输入框 */}
        <div className="mb-6">
          <div className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTodoHandler()}
              placeholder="添加新任务..."
              className="flex-1 border-none bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
            />
            <button
              onClick={addTodoHandler}
              className="rounded-lg bg-white px-4 py-2 text-sm text-black transition-all duration-200 hover:bg-zinc-200"
            >
              添加
            </button>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="mb-1 text-xl font-semibold text-white">{notStartedCount}</div>
            <div className="text-xs tracking-wider text-zinc-400 uppercase">未开始</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="mb-1 text-xl font-semibold text-white">{doingCount}</div>
            <div className="text-xs tracking-wider text-zinc-400 uppercase">进行中</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="mb-1 text-xl font-semibold text-white">{doneCount}</div>
            <div className="text-xs tracking-wider text-zinc-400 uppercase">已完成</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="mb-1 text-xl font-semibold text-white">{todos.length}</div>
            <div className="text-xs tracking-wider text-zinc-400 uppercase">总计</div>
          </div>
        </div>

        {/* 过滤器 */}
        <div className="mb-6 flex items-center gap-2">
          {(['all', 'active', 'completed'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
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
          {/* {doneCount > 0 && (
            <button
              onClick={clearCompleted}
              className="ml-auto rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white transition-all duration-200 hover:bg-zinc-600"
            >
              清除已完成
            </button>
          )} */}
        </div>

        {/* 任务列表 */}
        <div className="space-y-2">
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
                {filter === 'active' && '没有待完成的任务'}
                {filter === 'completed' && '没有已完成的任务'}
                {filter === 'all' && '还没有任务，开始添加吧！'}
              </p>
            </div>
          ) : (
            filteredTodos.map((todo, index) => (
              <div
                key={todo.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 transition-all duration-200',
                  'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800/50',
                  todo.taskStatus === 'done' && 'opacity-60'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={cn(
                    'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
                    todo.taskStatus === 'done'
                      ? 'border-zinc-700 bg-zinc-900'
                      : todo.taskStatus === 'doing'
                        ? 'border-zinc-700 bg-zinc-800'
                        : 'border-zinc-700 bg-black',
                    'hover:border-zinc-400'
                  )}
                >
                  {todo.taskStatus === 'done' && (
                    <svg className="h-3 w-3 text-white" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  )}
                  {todo.taskStatus === 'doing' && <span className="block h-3 w-3 rounded-full bg-white"></span>}
                  {todo.taskStatus === 'todo' && (
                    <span className="block h-3 w-3 rounded-full border border-zinc-500"></span>
                  )}
                </button>
                <span
                  className={cn(
                    'flex-1 text-sm transition-all duration-200',
                    todo.taskStatus === 'done' ? 'text-zinc-400 line-through' : 'text-white'
                  )}
                >
                  {todo.title}
                </span>
                <button
                  onClick={() => deleteTodoHandler(todo.documentId)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-2 text-zinc-400 transition-all duration-200 hover:border-zinc-600 hover:bg-zinc-700/50 hover:text-zinc-300"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <polyline points="3,6 5,6 21,6"></polyline>
                    <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminTodoPage
