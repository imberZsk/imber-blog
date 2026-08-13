# 生产工程（24） - Kubernetes 部署、弹性与灰度回滚

> Kubernetes 能维持副本和发布状态，但不会自动解决模型加载慢、流式长连接、队列积压和 GPU 容量等 AI 工作负载问题。

> 读完你能：部署 API、Embedding Worker 和推理服务，配置探针、资源、弹性、灰度和回滚，并用 SLO 验证发布。

## 核心知识清单

- Pod、Deployment、Service 与 Ingress
- ConfigMap、Secret、ServiceAccount 与 NetworkPolicy
- requests、limits、GPU 与临时存储
- Startup、Readiness 与 Liveness Probe
- HPA、队列长度、自定义指标与预热容量
- Rolling Update、灰度、回滚与数据库迁移
- CI/CD、安全扫描、SLO 与故障演练

## 拆分工作负载

无状态 AI API 负责鉴权、协议和编排；Embedding 或文档解析 Worker 从队列消费任务；自托管模型服务独立管理 GPU、批处理和模型版本。三者的扩容指标、启动时间和故障边界不同，不应塞进同一个 Pod。

Service 提供稳定发现，Ingress 终止 TLS 并管理入口限制。ConfigMap 保存非敏感配置，Secret 保存凭据但仍要开启静态加密和最小 RBAC。NetworkPolicy 限制 Worker、模型和数据库之间的可达范围。

## 资源与健康检查

requests 决定调度保证，limits 约束最大资源；Embedding 大批任务还要限制临时磁盘和单文件大小。Startup Probe 保护模型加载期，Readiness 在模型、依赖或预热未完成时阻止流量，Liveness 只处理进程失活，不能把短暂供应商故障变成重启风暴。

HPA 不应只看 CPU。API 可参考并发、P95 延迟和请求率，Worker 参考队列长度与最老任务年龄，GPU 服务参考排队请求、KV Cache 和 Token 吞吐。扩容速度要覆盖模型加载时间，并保留最小预热副本。

## 发布顺序

1. CI 完成静态检查、测试、评测、镜像扫描和签名。
2. 向前兼容地执行数据库迁移，再部署可同时读写新旧 Schema 的应用。
3. 新版本先接少量流量，比较错误率、延迟、质量、Token 与成本。
4. 指标越界立即停止扩大并回滚 Deployment、Prompt、模型或索引 Alias。
5. 发布后验证流式、取消、队列、告警和故障恢复，而不只检查首页。

## 参考资料

- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes Probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)
- [Kubernetes HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
