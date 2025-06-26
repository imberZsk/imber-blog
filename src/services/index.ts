// 简化的HTTP客户端
class Http {
  private baseURL: string

  constructor(baseURL: string = '') {
    this.baseURL = baseURL
  }

  // 只保留 request 方法，直接抛异常，返回 response.json()
  async request(resource: string, options: RequestInit & { params?: Record<string, string> } = {}) {
    const { params, headers, method, ...restOptions } = options
    const queryString = params ? `?${new URLSearchParams(params)}` : ''
    const fullUrl = `${this.baseURL}${resource}${queryString}`

    // 设置默认 method 和 headers，用户传入的优先生效
    const finalMethod = method || 'GET'
    const finalHeaders = {
      'Content-Type': 'application/json',
      ...(headers || {})
    }

    const response = await fetch(fullUrl, {
      ...restOptions,
      method: finalMethod,
      headers: finalHeaders
    })

    // 先判断 response.ok
    if (!response.ok) {
      let errorMsg = `HTTP错误: ${response.status}`
      try {
        const errorBody = await response.json()
        if (errorBody?.message) {
          errorMsg += ` - ${errorBody.message}`
        } else if (errorBody?.error) {
          errorMsg += ` - ${errorBody.error}`
        }
      } catch {}
      throw new Error(errorMsg)
    }

    // 正常返回
    try {
      return await response.json()
    } catch {
      return response
    }
  }

  // 移除 get/post/put/delete 快捷方法，只保留 request
}

// 创建实例
export const gitHubService = new Http(process.env.NEXT_PUBLIC_API_BASE_URL)

export const strapiService = new Http('https://grounded-crystal-d6a5ec67a5.strapiapp.com')

// 使用示例:
/*
// GET 请求
const getUser = async (id: string) => {
  return await gitHubService.request(`/users/${id}`, {
    method: 'GET'
  })
}

// POST 请求
const createUser = async (userData: any) => {
  return await gitHubService.request('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  })
}

// 带参数的GET请求
const getUsers = async (page: number) => {
  return await gitHubService.request('/users', {
    method: 'GET',
    params: { page: page.toString() }
  })
}
*/
