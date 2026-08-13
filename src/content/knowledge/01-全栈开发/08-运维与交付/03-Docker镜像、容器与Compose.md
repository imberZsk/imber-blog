# 运维与交付（03） - Docker 镜像、容器与 Compose

> 镜像是不可变制品，容器是带运行配置的进程；Compose 解决多服务本地编排，不等于生产高可用。

> 读完你能：构建不含密钥的最小生产镜像，并解释容器配置、持久化和健康检查边界。

## 核心知识清单

- 镜像分层、构建上下文与多阶段构建
- 容器进程、文件系统与信号处理
- 环境变量、Secret、Volume 与网络
- 健康检查、依赖就绪与优雅退出
- Compose 的开发边界与可复现性

## 最小可运行配置

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
USER node
CMD ["node", "server.js"]
```

构建阶段安装依赖并生成制品，运行阶段只保留必需文件并使用非 root 用户。密钥不能写入 Dockerfile 或镜像层；通过部署平台 Secret 在运行时注入。数据库 `depends_on` 只表示启动顺序，不证明数据库已经接受连接，应用仍要做有界重试和健康检查。

## 验收

- `docker build` 在干净环境可重复完成，镜像不包含源码密钥。
- 收到 SIGTERM 后停止接流量、完成在途请求并退出。
- 健康检查验证真实依赖，而不是固定返回 200。
- 数据 Volume 可备份、恢复，容器删除不会丢业务数据。

## 参考资料

- [Docker Build](https://docs.docker.com/build/)
- [Docker Compose](https://docs.docker.com/compose/)
