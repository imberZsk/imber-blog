# 运维与可观测性（02） - Docker 与 Kubernetes 部署边界

> 容器解决可重复运行，Kubernetes 解决多副本调度与恢复；它们都不能替代应用自身的超时、幂等和数据迁移设计。

## 学习目标

- 编写最小、可扫描、非 root 的生产镜像。
- 区分 Deployment、Service、探针、资源限制和持久化边界。
- 验证滚动发布、配置注入、故障恢复和数据库兼容迁移。

## 一、镜像原则

- 多阶段构建只把运行需要的产物放进最终镜像。
- 使用非 root 用户、固定基础镜像版本并扫描依赖漏洞。
- 配置和密钥在运行时注入，不打进镜像或前端产物。
- 容器写入视为临时数据，持久状态放数据库或受管存储。

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
USER node
COPY --from=build --chown=node:node /app/.next/standalone ./
CMD ["node", "server.js"]
```

## 二、Kubernetes 的关键控制面

Deployment 管理无状态副本和滚动更新，Service 提供稳定发现，Ingress/Gateway 接入流量。readiness 决定能否接流量，liveness 只处理无法自愈的卡死，startup 保护慢启动；三者不能都指向一个永远返回 200 的接口。

资源 requests 用于调度，limits 限制上限。没有 requests 会导致容量规划失真；限制过低则出现 OOMKill 或 CPU throttling。HPA 应根据可解释指标扩缩容，并与下游数据库和队列容量一致。

## 三、有状态与发布

数据库迁移在应用切换前后保持兼容，使用扩展-迁移-收缩流程。StatefulSet/PVC 只解决标识和卷挂载，不自动提供备份、复制和故障恢复。发布时记录镜像 digest、配置版本和迁移版本，回滚不能只回应用镜像。

## 四、验收

- 杀死一个 Pod，流量只进入 ready 副本且请求无异常放大。
- 发布期间新旧版本能同时处理数据，失败后可回滚。
- Secret 不出现在镜像历史、日志、前端 bundle 和普通 ConfigMap。

## 参考资料

- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Kubernetes Probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)
- [Kubernetes Resource Management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
