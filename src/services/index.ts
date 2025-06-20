// 简化的请求配置
interface RequestConfig {
  params?: Record<string, string>
  headers?: Record<string, string>
}

// 简化的HTTP客户端
class Http {
  private baseURL: string

  constructor(baseURL: string = '') {
    this.baseURL = baseURL
  }

  private async request(url: string, method: string = 'GET', data?: any, config: RequestConfig = {}) {
    const target: {
      data: any
      error: Error | null
    } = {
      data: null,
      error: null as unknown as Error
    }

    const { params, headers = {} } = config

    // 构建URL
    const queryString = params ? `?${new URLSearchParams(params)}` : ''
    const fullUrl = `${this.baseURL}${url}${queryString}`

    // 构建headers
    const finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    }

    try {
      const response = await fetch(fullUrl, {
        method,
        headers: finalHeaders,
        body: data ? JSON.stringify(data) : null
      })

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`)
      }

      target.data = await response.json()
      target.error = null
    } catch (error) {
      console.error('请求失败:', error)
      target.error = error instanceof Error ? error : new Error(String(error))
    }
    return target
  }

  get(url: string, config?: RequestConfig) {
    return this.request(url, 'GET', null, config)
  }

  post(url: string, data?: any, config?: RequestConfig) {
    return this.request(url, 'POST', data, config)
  }

  put(url: string, data?: any, config?: RequestConfig) {
    return this.request(url, 'PUT', data, config)
  }

  delete(url: string, config?: RequestConfig) {
    return this.request(url, 'DELETE', null, config)
  }
}

// 创建实例
export const gitHubService = new Http(process.env.NEXT_PUBLIC_API_BASE_URL)

// 使用示例:
/*
// GET 请求
const getUser = async (id: string) => {
  return await http.get(`/users/${id}`)
}

// POST 请求
const createUser = async (userData: any) => {
  return await http.post('/users', userData)
}

// 带参数的GET请求
const getUsers = async (page: number) => {
  return await http.get('/users', { params: { page: page.toString() } })
}
*/
