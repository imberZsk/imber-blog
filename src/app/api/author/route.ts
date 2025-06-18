export async function GET() {
  return Response.json({
    data: {
      name: '张三',
      age: 18,
      email: 'zhangsan@example.com'
    }
  })
}
