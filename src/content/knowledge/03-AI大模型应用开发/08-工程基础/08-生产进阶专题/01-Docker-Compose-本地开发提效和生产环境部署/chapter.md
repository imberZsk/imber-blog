# 工程基础（77）- 基于 Docker Compose 的本地开发提效和生产环境部署

> 读完你能：从单个 Dockerfile 升级到多服务编排，理解 AI 应用本地和生产环境怎么拉齐。
> 来源：`吃透 AI Agent 开发` 截图目录第 25 篇，2026/04/25，可试读 4%
> 导入与重写日期：2026/07/07

# 一、本篇定位

这是 38 Docker 基础的进阶篇，聚焦 RAG/Agent 常见的多服务依赖。

# 二、一个真实场景

一个 Agent 项目不只有后端。它可能还需要 PostgreSQL、Redis、Milvus、Elasticsearch、对象存储。每次新人启动项目都手装一遍服务，必然出问题。Docker Compose 用一份配置把这些服务一起拉起来。

# 三、核心拆解

- Dockerfile 描述单个服务怎么构建，Compose 描述多个服务如何一起运行、互相联网、挂载数据和注入环境变量。
- 本地开发用 Compose 的价值是环境可复现：数据库、缓存、向量库版本固定，启动命令统一。
- 生产环境可以参考 Compose 的服务边界，但要额外考虑镜像仓库、密钥、监控、备份和弹性伸缩。

# 四、工程链路

- 为应用写 Dockerfile。
- 在 compose.yml 定义 app、db、redis、vector-db 等服务。
- 配置 depends_on、ports、volumes、env_file。
- 本地一条命令启动。
- 生产按同样边界拆部署单元。

# 五、落地建议

- 数据库和向量库必须挂 volume，避免容器删掉数据丢失。
- 密钥放 env_file 或密钥系统，不写进镜像。
- 为每个服务加 healthcheck，别只靠启动顺序。

# 六、常见坑

- 把 Compose 当生产高可用方案。
- 没有 volume，重启后数据全没。
- 服务间连接仍用 localhost，容器网络里连不上。

# 七、和已有主线的关系

38 讲 Dockerfile；77 讲多服务编排，是 84-88 数据存储和对象存储篇的部署基础。

# 八、复述答法

> Docker Compose 用来编排多服务：app、PostgreSQL、Redis、Milvus、ES、对象存储可以一套配置拉起。本地重点是可复现，生产要补密钥、监控、备份和高可用。

# 九、总结

- **核心拆解**：Dockerfile 描述单个服务怎么构建，Compose 描述多个服务如何一起运行、互相联网、挂载数据和注入环境变量。
- **工程链路**：为应用写 Dockerfile。
- **常见坑**：把 Compose 当生产高可用方案。
- **本篇定位**：这是 38 Docker 基础的进阶篇，聚焦 RAG/Agent 常见的多服务依赖。

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“Agent 工程（77）- 基于 Docker Compose 的本地开发提效和生产环境部署”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。

## 十、最小可运行示例：带健康检查的 Compose

~~~yaml
# compose.yaml
services:
  api:
    build: .
    environment:
      REDIS_URL: redis://redis:6379/0
    depends_on:
      redis:
        condition: service_healthy
    ports:
      - "8000:8000"
  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 2s
      retries: 12
volumes:
  redis-data:
~~~

~~~text
# requirements.txt
fastapi
uvicorn
redis
~~~

~~~python
from __future__ import annotations

import os

from fastapi import FastAPI, Response, status
from redis import Redis


# 应用内使用服务名 redis，不使用容器自身 localhost。
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
# 健康检查应用只暴露可用性，不返回连接密钥。
app = FastAPI()
redis_client = Redis.from_url(REDIS_URL)


@app.get("/health")
def health(response: Response) -> dict[str, str]:
    """检查关键依赖；response 用于设置失败状态码。"""

    if not redis_client.ping():
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "degraded"}
    return {"status": "ok"}
~~~

Compose 解决本地复现，不等于生产高可用。生产还需 Secret、备份恢复、监控、资源限制、滚动升级和跨节点故障演练。
