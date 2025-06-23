'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { PADDING_TOP } from '../../const'

interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: Date
}

const AdminTodoPage = () => {
  const [todos, setTodos] = useState<Todo[]>([])
  const [inputValue, setInputValue] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  // 从 localStorage 加载数据
  useEffect(() => {
    const savedTodos = localStorage.getItem('todos')
    if (savedTodos) {
      const parsedTodos = JSON.parse(savedTodos).map((todo: any) => ({
        ...todo,
        createdAt: new Date(todo.createdAt)
      }))
      setTodos(parsedTodos)
    }
  }, [])

  // 保存到 localStorage
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos))
  }, [todos])

  const addTodo = () => {
    if (inputValue.trim()) {
      const newTodo: Todo = {
        id: crypto.randomUUID(),
        text: inputValue.trim(),
        completed: false,
        createdAt: new Date()
      }
      setTodos((prev) => [newTodo, ...prev])
      setInputValue('')
    }
  }

  const toggleTodo = (id: string) => {
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)))
  }

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id))
  }

  const clearCompleted = () => {
    setTodos((prev) => prev.filter((todo) => !todo.completed))
  }

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  const activeTodosCount = todos.filter((todo) => !todo.completed).length
  const completedTodosCount = todos.filter((todo) => todo.completed).length

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
              onKeyPress={(e) => e.key === 'Enter' && addTodo()}
              placeholder="添加新任务..."
              className="flex-1 border-none bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
            />
            <button
              onClick={addTodo}
              className="rounded-lg bg-white px-4 py-2 text-sm text-black transition-all duration-200 hover:bg-zinc-200"
            >
              添加
            </button>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="mb-1 text-xl font-semibold text-white">{activeTodosCount}</div>
            <div className="text-xs tracking-wider text-zinc-400 uppercase">待完成</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center">
            <div className="mb-1 text-xl font-semibold text-white">{completedTodosCount}</div>
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
          {completedTodosCount > 0 && (
            <button
              onClick={clearCompleted}
              className="ml-auto rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white transition-all duration-200 hover:bg-zinc-600"
            >
              清除已完成
            </button>
          )}
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
                  todo.completed && 'opacity-60'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={cn(
                    'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all duration-200',
                    todo.completed ? 'border-white bg-white' : 'border-zinc-600 hover:border-zinc-400 hover:bg-zinc-800'
                  )}
                >
                  {todo.completed && (
                    <svg className="h-3 w-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <polyline points="20,6 9,17 4,12" strokeWidth={3}></polyline>
                    </svg>
                  )}
                </button>
                <span
                  className={cn(
                    'flex-1 text-sm transition-all duration-200',
                    todo.completed ? 'text-zinc-500 line-through' : 'text-white'
                  )}
                >
                  {todo.text}
                </span>
                <button
                  onClick={() => deleteTodo(todo.id)}
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
