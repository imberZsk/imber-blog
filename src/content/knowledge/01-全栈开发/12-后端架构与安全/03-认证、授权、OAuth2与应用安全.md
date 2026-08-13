# 后端架构与安全（03） - 认证、授权、OAuth 2.0 与应用安全

> 认证回答“你是谁”，授权回答“你能对哪个资源做什么”。登录成功绝不等于拥有全部数据权限。

> 读完你能：选择 Session、JWT、OAuth 2.0 和 OpenID Connect，并设计密码、Cookie、CSRF、XSS、TLS 与密钥治理。

## 核心知识清单

- 密码哈希、盐、速率限制与多因素认证
- Session、Cookie、JWT 与撤销
- OAuth 2.0、OpenID Connect 与 PKCE
- RBAC、ABAC 与资源级授权
- CSRF、XSS、CORS 与安全 Header
- HTTPS、TLS、密钥管理与轮换
- 最小权限、审计与敏感数据保留

## 认证方案

密码使用专用慢哈希算法和唯一盐，登录接口限速并记录风险事件。传统 Web 应用常用服务端 Session + HttpOnly Cookie，便于撤销；JWT 适合跨服务声明，但仍需短有效期、签名校验、受众检查和撤销策略，不能把敏感正文写入 Token。

OAuth 2.0 是授权框架，OIDC 在其上提供身份层。浏览器或移动公开客户端使用 Authorization Code + PKCE，不能保存客户端密钥。Access Token 只发给目标 Resource Server。

## 授权位置

入口验证身份，Service 或策略层检查动作权限，Repository 查询加入租户和资源过滤，返回前再防止字段越权。RBAC 管角色，ABAC 可结合部门、资源所有者、时间和环境。前端隐藏按钮只改善体验，不是安全措施。

## 浏览器安全

Cookie 认证的写请求需要 SameSite 和 CSRF Token；XSS 通过输出编码、可信模板和 CSP 缓解；CORS 仅控制浏览器跨域读取，不代替认证授权。所有生产通信使用 TLS，HSTS 防止降级。

密钥进入 Secret Manager，不提交仓库、不放镜像、不输出日志；按用途和环境拆分，定期轮换并记录读取审计。

## 参考资料

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700.html)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)

