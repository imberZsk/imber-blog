# 后端架构与安全（02） - 分层架构、API 契约与统一错误模型

> 分层不是把文件放进 controller/service/repository 三个目录，而是让业务规则、协议和基础设施依赖方向清晰。

> 读完你能：设计 DTO、领域对象、事务边界、API 版本和统一错误，并避免控制器膨胀与跨层泄漏。

## 核心知识清单

- Controller/Router、Service 与 Repository/Mapper
- DTO、领域对象、持久化对象与映射
- 参数校验、统一异常与错误码
- OpenAPI、Swagger UI 与契约兼容
- 同步、异步、Background Job 与 gRPC
- API 版本、幂等键与事务边界

## 依赖方向

Controller 解析协议、身份和输入，调用应用服务后映射响应；Service 编排业务规则和事务；Repository 隐藏数据访问。领域对象不应直接依赖 HTTP 或 ORM 注解，控制器也不应直接拼 SQL。

DTO 表达接口契约，持久化对象适配表结构，领域对象表达业务不变量。三者合并看似省代码，却会让数据库字段变化直接破坏外部 API。

## 错误模型

统一响应至少包含稳定错误码、面向用户的消息和 trace_id，开发细节写日志而不是返回堆栈。参数错误、未认证、无权限、冲突、限流和服务错误使用正确 HTTP 状态码。业务失败不能一律返回 `200`。

## API 演进

优先采用向后兼容新增字段，删除或改变语义需要版本策略。OpenAPI 是契约来源，可生成客户端并在 CI 检查破坏性变化。写请求使用幂等键；事务只覆盖一个业务原子边界，不要持有数据库事务等待远程调用。

同步 HTTP 适合短请求，异步任务适合耗时或可排队工作，gRPC 适合内部高性能强契约通信。选择前先明确调用方、延迟、重试和调试能力。

## 参考资料

- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [gRPC Concepts](https://grpc.io/docs/what-is-grpc/core-concepts/)

