# Web 与浏览器（07） - 浏览器存储、Service Worker 与离线同步

> 浏览器存储不是“找个地方放数据”。容量、同步阻塞、事务、生命周期和敏感性决定该用 Cookie、Web Storage、IndexedDB 还是 Cache Storage。

> 读完你能：设计离线表单、资源缓存和断网同步，并避免把认证凭据或过期业务数据错误留在浏览器。

## 核心知识清单

- Cookie、localStorage 与 sessionStorage
- IndexedDB 事务、索引与版本升级
- Cache Storage 与 HTTP 缓存边界
- Service Worker 生命周期与 Fetch 拦截
- Cache First、Network First 与 Stale-While-Revalidate
- 离线队列、幂等同步与冲突处理
- XSS、存储清理与隐私边界

## 存储选型

Cookie 会随匹配请求发送，适合短小会话标识，并使用 `HttpOnly`、`Secure` 和合适的 `SameSite`；Web Storage 是同步字符串键值存储，适合少量非敏感偏好；IndexedDB 是异步事务数据库，适合较大结构化数据、离线表单和文件元数据；Cache Storage 保存 Request/Response，主要服务资源和网络响应缓存。

长期访问令牌不能因为“读取方便”就放 localStorage。发生 XSS 时脚本可直接读取它。敏感认证优先使用后端 Session 和 HttpOnly Cookie，并配合 CSRF 防护。

## Service Worker 生命周期

Service Worker 经 install、activate 后才能控制页面。新版本可能等待旧页面释放控制，缓存 Schema 变化应使用版本化缓存名，并在 activate 清理旧缓存。Fetch Handler 必须限定请求范围，不能把所有 API 永久缓存。

## 离线同步

离线提交先生成客户端请求 ID，把请求正文、创建时间和状态写入 IndexedDB；恢复网络后按顺序发送。服务端依据幂等键去重，成功后删除本地任务。版本冲突不能静默覆盖，应返回当前服务端版本并要求合并或重新确认。

## 缓存策略

- Cache First：版本化静态资源。
- Network First：订单、权限等时效数据，并设置短超时和明确离线提示。
- Stale-While-Revalidate：允许短暂旧数据的低风险内容。
- Network Only：支付、审批等必须实时确认的操作。

## 参考资料

- [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [MDN Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [OWASP HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)

