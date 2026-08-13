# Python（39） - FastAPI 生产架构、迁移与后台任务

> FastAPI 的 async 语法只是入口。生产系统还要管理生命周期、连接池、数据库迁移、后台任务、配置和接口测试。

> 读完你能：拆分 APIRouter、Pydantic、依赖和 Service，选择 BackgroundTasks 或 Celery，并用 Alembic 和 TestClient 验证发布。

## 核心知识清单

- APIRouter、依赖注入、Service 与 Repository
- 路径、查询、Header、Body 与响应模型
- Pydantic Settings、环境变量与 Secret
- Lifespan、连接池、async 与阻塞隔离
- Alembic 数据库迁移与兼容发布
- BackgroundTasks、Celery、幂等与重试
- TestClient、依赖覆盖与 Testcontainers

## 应用边界

Router 处理 HTTP 和身份，Service 执行业务，Repository 访问数据。请求模型和响应模型分离，避免把数据库字段全部暴露。依赖注入适合会话、身份和可替换适配器，不要把复杂业务塞进 Dependency。

Pydantic Settings 从环境读取配置，启动时校验必填项。Lifespan 创建并关闭数据库、HTTP 客户端等共享资源。`async def` 中调用阻塞数据库或 CPU 任务仍会卡住事件循环，应使用异步驱动、线程池或独立 Worker。

## 迁移与任务

Alembic 迁移脚本纳入版本控制，发布采用“先兼容新增 → 部署新代码 → 回填 → 收紧约束”。破坏性迁移不能和应用切换假设同时完成。

BackgroundTasks 适合进程内、短小、允许随实例失败而丢失的工作；Celery 等队列适合耗时、需重试和跨实例任务。任务携带业务幂等键，区分临时错误与永久失败，并记录状态和 trace_id。

## 测试

TestClient 验证状态码、响应 Schema 和错误；依赖覆盖替换身份或外部服务；数据库方言与事务重要时使用 Testcontainers。测试要覆盖启动失败、下游超时、重复任务和迁移兼容，而不只覆盖成功接口。

## 参考资料

- [FastAPI Bigger Applications](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [FastAPI Lifespan](https://fastapi.tiangolo.com/advanced/events/)
- [Alembic Tutorial](https://alembic.sqlalchemy.org/en/latest/tutorial.html)
- [Celery Documentation](https://docs.celeryq.dev/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)

