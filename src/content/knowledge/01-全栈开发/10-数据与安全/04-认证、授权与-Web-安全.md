# 数据与安全（04） - 认证、授权与 Web 安全

> 认证回答“你是谁”，授权回答“你能对这个资源做什么”；两者都必须在服务端、数据访问前执行。

## 学习目标

- 区分认证、租户隔离、RBAC/ABAC 和资源级授权。
- 为 Cookie、JWT、密钥和审计设计可验证的安全边界。
- 识别并测试 SQL 注入、XSS、CSRF 和 SSRF 等常见攻击面。

## 一、身份链路

密码使用专门的自适应哈希算法并加唯一盐；登录成功后签发服务端 Session 或短期访问令牌。Cookie 会话启用 Secure、HttpOnly、SameSite，并有 CSRF 策略。JWT 不是加密容器，服务端仍要校验签名算法、issuer、audience、过期和撤销策略。

## 二、授权顺序

```text
请求 -> 认证身份 -> 租户过滤 -> 资源查询 -> 动作权限 -> 业务约束 -> 审计
```

RBAC 适合角色到权限的稳定映射，资源所有权和属性条件需要 ABAC/策略判断。任何列表、导出、搜索、缓存和对象存储路径都必须带相同租户与 ACL 过滤，不能只保护详情接口。

## 三、常见攻击面

- SQL 注入：参数化查询，不拼接用户输入；动态排序字段用 allowlist。
- XSS：按输出上下文编码，不可信 HTML 使用成熟消毒器。
- CSRF：Cookie 身份请求使用 SameSite、Token 或 Origin 校验。
- SSRF：服务端抓取 URL 时限制协议、域名、解析后 IP、重定向和响应大小。
- 密钥泄露：密钥放专用 Secret 系统，日志脱敏，定期轮换。

## 四、失败设计

对外错误不泄露用户是否存在、权限规则或内部堆栈；对内日志包含 request_id、主体、资源、动作、决策和策略版本，但不记录密码、Token 和完整敏感正文。高风险动作增加二次确认、幂等键和不可抵赖审计。

## 五、验收

- 使用两个租户对列表、详情、搜索、导出和缓存逐一做越权测试。
- 对 Token 过期、签名错误、错误 audience 和账户禁用做回归。
- 对 SQLi、XSS、CSRF、SSRF 建立自动化负例，而不是只做人工检查。

## 参考资料

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
