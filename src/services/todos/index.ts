import { strapiService } from '@/services'

export async function fetchTodos() {
  return await strapiService.request('/api/todo-items', {
    cache: 'no-store',
    params: { sort: 'taskStatus:asc,createdAt:desc' } // 先按状态，后按时间
    // GET 不用带Token
  })
}

export async function addTodo(data: { title: string; taskStatus?: string; priority?: string; createdAt?: string }) {
  return await strapiService.request('/api/todo-items', {
    method: 'POST',
    body: JSON.stringify({ data }),
    headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}` }
  })
}

export async function updateTodo(id: string, data: any) {
  return await strapiService.request(`/api/todo-items/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
    headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}` }
  })
}

export async function deleteTodo(id: string) {
  return await strapiService.request(`/api/todo-items/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}` }
  })
}
