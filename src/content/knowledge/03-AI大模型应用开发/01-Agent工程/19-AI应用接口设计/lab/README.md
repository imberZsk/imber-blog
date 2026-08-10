# 19 AI 应用接口设计 demo

一个 AI 接口除了业务逻辑，还得有三层「门卫」：**requestId 追踪、鉴权头校验、限流**。这里用一组中间件函数模拟请求依次过关，离线可跑。

## 运行

```bash
python3 main.py
```

零依赖，纯标准库。

## 预期输出

```
=== 场景 1：没带 Authorization（鉴权失败 401）===
匿名请求
  -> {'request_id': 'req_61ae6ab9', 'code': 401, 'error': '缺少或格式错误的 Authorization 头'}

=== 场景 2：错误的 API Key（鉴权失败 401）===
乱填 key
  -> {'request_id': 'req_3eb67923', 'code': 401, 'error': '无效的 API Key'}

=== 场景 3：合法用户连续请求，第 4 次触发限流（429）===
alice 第 1 次请求
  -> {'request_id': 'req_f2f79080', 'code': 200, 'data': {'answer': '（回答给 alice）你的问题「问题1」已收到。'}}

alice 第 2 次请求
  -> {'request_id': 'req_c8f04d45', 'code': 200, 'data': {'answer': '（回答给 alice）你的问题「问题2」已收到。'}}

alice 第 3 次请求
  -> {'request_id': 'req_48cf4f23', 'code': 200, 'data': {'answer': '（回答给 alice）你的问题「问题3」已收到。'}}

alice 第 4 次请求
  -> {'request_id': 'req_7af3b55d', 'code': 429, 'error': '触发限流，请 10.0s 后重试'}

=== 场景 4：合法但参数为空（400）===
bob 空消息
  -> {'request_id': 'req_7307f7b8', 'code': 400, 'error': 'message 不能为空'}

要点：每个请求都有 requestId；先鉴权再限流再业务；不同失败对应不同 code。
```

每个响应都带 `request_id`（每次运行的随机值不同）；alice 连发 3 次正常、第 4 次被限流返回 429；不同失败对应不同状态码（401/429/400），前端据此区别处理。

## 代码↔概念对应

| 概念 | 在 main.py 哪里 |
|---|---|
| 每个请求分配 requestId | `gen_request_id` |
| 鉴权：校验 Authorization 头 + Key 白名单 | `check_auth` |
| 限流：滑动窗口算法 | `check_rate_limit` |
| 门卫顺序：requestId → 鉴权 → 限流 → 业务 | `handle_request` |
| 统一响应结构（request_id + code + data/error） | `handle_request` 的返回值 |

## 动手改

- 把 `MAX_REQUESTS` 改成 5，看 alice 要发到第 6 次才被限流。
- 把鉴权和限流的顺序对调，思考为什么应该先鉴权（非法请求不该消耗限流配额，也不该进任何后续逻辑）。
- 真实项目里 `request_history` 存内存只适合单机，多实例部署要换成 Redis；`API_KEYS` 白名单也应存数据库。
