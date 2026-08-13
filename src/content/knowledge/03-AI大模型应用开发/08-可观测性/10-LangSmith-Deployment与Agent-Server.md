# 可观测性（10） - LangSmith Deployment 与 Agent Server

> LangSmith Observability 负责记录和评测，Deployment 负责运行 Agent Server。使用前必须先区分“看见应用”和“托管应用”。

> 读完你能：理解 Assistant、Thread、Run、Studio 与 RemoteGraph，并设计可持久化、可流式和可横向扩展的 Agent 服务。

## 核心知识清单

- Observability、Evaluation 与 Deployment 的职责边界
- Graph、Assistant、Thread 与 Run
- Agent Server、LangGraph CLI 与 Studio
- RemoteGraph、实时流式与持久化执行
- Worker、队列、水平扩展与并发控制
- 配置、Secret、数据驻留、发布与回滚

## 运行对象

Graph 定义程序结构，Assistant 是 Graph 加配置形成的可运行版本，Thread 保存一条会话或工作流状态，Run 在 Thread 上执行一次输入。相同 Graph 可以通过不同 Prompt、模型或 Tool 配置形成多个 Assistant；生产 Trace 必须记录实际 Assistant 与版本。

LangGraph CLI 用于本地启动和构建 Agent Server，Studio 用于查看 Graph、State、节点输入输出和中断位置，RemoteGraph 让其他服务像调用图一样调用远程部署。Studio 是调试入口，不是生产授权边界。

## 持久化与流式

Agent Server 将 Checkpoint 与 Thread 关联，使审批等待和进程重启后可以恢复。流式接口可以输出 Token、State 更新和业务事件；客户端必须按 Run 和序号去重，并处理取消与断线重连。

## 容量与发布

Worker 数量根据运行并发、队列等待和节点耗时扩展。长时间 Tool 不应占用无限连接，外部副作用必须幂等。发布时固定 Graph、依赖、Prompt 和 Assistant 配置版本，先在测试 Thread 回归，再灰度真实流量；回滚不能让新旧 Worker 以不兼容 State 同时写入同一 Thread。

团队还需核对云托管或自托管的数据区域、保留期、加密、RBAC、网络出口和 Secret 管理。即便托管运行，业务资源权限仍由应用 Tool 和后端负责。

## 参考资料

- [LangSmith Deployment](https://docs.langchain.com/langsmith/deployment)
- [LangSmith Deployment Components](https://docs.langchain.com/langsmith/components)
- [LangGraph CLI](https://docs.langchain.com/langsmith/cli)
- [LangGraph Platform Streaming](https://docs.langchain.com/langsmith/streaming)

