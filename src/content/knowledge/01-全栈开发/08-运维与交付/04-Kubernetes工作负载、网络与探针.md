# 运维与交付（04） - Kubernetes 工作负载、网络与探针

> Kubernetes 负责声明期望状态并持续协调；它不能替应用补上幂等、数据迁移和优雅关闭。

> 读完你能：为 Web 服务配置工作负载、网络、三类探针和资源边界，并验证滚动发布不中断流量。

## 核心知识清单

- Pod、Deployment、ReplicaSet 与滚动发布
- Service、Ingress 与集群内服务发现
- ConfigMap、Secret 与配置版本
- startup、readiness、liveness 三类探针
- requests、limits、HPA 与容量边界
- PodDisruptionBudget 与优雅终止

## 探针职责

`startupProbe` 给慢启动应用足够时间；`readinessProbe` 决定是否接收流量；`livenessProbe` 只判断进程是否已无法自愈。把数据库短暂抖动写进 liveness 会触发重启风暴，应优先让 readiness 摘除流量并由应用重试。

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 5
livenessProbe:
  httpGet:
    path: /live
    port: 8080
  periodSeconds: 10
resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    memory: 512Mi
```

## 发布验收

滚动发布期间持续压测，确认就绪前不接流量、终止时先摘流量、至少保留一个可用副本。通过 Deployment revision 回滚代码；数据库 Schema 采用向前兼容的 expand/migrate/contract 顺序，不能指望回滚镜像自动回滚数据。

## 参考资料

- [Kubernetes Workloads](https://kubernetes.io/docs/concepts/workloads/)
- [Kubernetes Probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)
