import { cn } from '@/lib/utils'
import { PADDING_TOP } from '../const'
import { fetchTodos } from '@/services/todos'
import Client from './client'

interface Todo {
  id: string
  title: string
  taskStatus: 'todo' | 'doing' | 'done'
  priority: string
  createdAt: Date
}

const Page = async () => {
  const todosData = await fetchTodos()
  const todos: Todo[] = todosData?.data || []

  return (
    <div className={cn('mx-auto max-w-5xl px-4', PADDING_TOP)}>
      <Client todos={todos} />
    </div>
  )
}

export default Page
