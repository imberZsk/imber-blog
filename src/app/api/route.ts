export async function GET(request: Request) {
  // 获取 URL 中的时间参数
  const { searchParams } = new URL(request.url)
  const delay = parseInt(searchParams.get('time') || '0') * 1000 // 转换为毫秒

  // 如果有延迟参数，等待指定时间
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  // 设置 CORS 头部
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }

  return Response.json({ data: 'Hello World' }, { headers })
}

// 添加 OPTIONS 方法支持 CORS 预检请求
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
