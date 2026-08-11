# 43 企业知识库 RAG 项目 demo

一个本地可运行的真实企业 RAG 工作台：文档入库、Markdown 批量导入、chunk 切分、本地 embedding、Qdrant 向量数据库检索、基于资料回答、引用来源和检索 Trace。

当前版本不依赖 OpenAI Key。embedding 使用本地 hashing 向量模型，向量存储使用 Docker 中的 Qdrant，适合先讲清企业 RAG 工程闭环；后续可把 `LocalEmbeddingModel` 换成 OpenAI / bge / m3e 等真实 embedding 模型。

## 环境

- Python 3.10+
- Docker Desktop
- Qdrant：通过 `docker compose` 启动，无需手动安装

## 启动

```bash
cd /Users/imber/Desktop/ai-lab/worktrees/knowledge-categories/imber-blog/src/content/knowledge/03-AI大模型应用开发/02-企业级知识库/03-企业知识库项目/01-项目-企业知识库RAG/lab
docker compose up -d qdrant
python3 main.py
```

浏览器打开：

```text
http://127.0.0.1:8043
```

Qdrant REST：

```text
http://127.0.0.1:6333
```

## 导入 agent 小册

页面点击 `导入 AI 应用手册`，会从当前仓库位置自动解析并读取完整的 AI 大模型应用开发目录：

```text
03-AI大模型应用开发
```

导入规则兼容新版目录结构：

- `**/chapter.md`
- `**/appendices/*.md`
- 排除当前项目的 `lab/`

导入后会重建 Qdrant collection：

```text
agent_manual_chunks
```

本次验证导入结果：

```text
导入数量会根据当前 `knowledge/Agent` 目录中的文章实时变化。
```

## 测试

```bash
python3 -m unittest discover -s tests -v
python3 -m py_compile main.py rag_core.py
node --check static/app.js
```

## 演示问题

导入 `agent小册` 后可以问：

```text
语义相近的文本为什么向量也相近？
引用来源为什么不能让模型自己报？
RAG 回答为什么要引用来源？
检索与重排 Rerank 有什么区别？
```

验证结果示例：

- `语义相近的文本为什么向量也相近？` 命中 `22-Embedding向量化.md`
- `引用来源为什么不能让模型自己报？` 命中 `25-RAG回答生成与引用来源.md`

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 服务健康检查，返回文档数、chunk 数、Qdrant 状态 |
| GET | `/api/knowledge/documents` | 文档列表 |
| POST | `/api/knowledge/documents` | 新增文档，JSON 字段：`title/source/text` |
| POST | `/api/knowledge/import-agent-manual` | 批量导入本地 AI 应用知识集（路径保留兼容） |
| POST | `/api/rag/chat` | 知识库问答，JSON 字段：`question/topK` |
| GET | `/api/rag/logs` | 最近问答日志 |
| GET | `/api/rag/logs/:requestId` | 单次问答日志 |

## 代码结构

| 文件 | 作用 |
|---|---|
| `docker-compose.yml` | 启动 Qdrant 向量数据库 |
| `rag_core.py` | RAG 核心：Markdown 清洗、切分、本地 embedding、Qdrant client、检索、拒答、引用、日志 |
| `main.py` | 标准库 HTTP 服务、API 路由、静态页面服务、agent 小册导入 |
| `static/` | 前端工作台 |
| `data/sample-docs/` | 首次启动时的样例企业文档 |
| `tests/` | 核心逻辑、API、向量导入测试 |

## 后续升级

- 把 `LocalEmbeddingModel` 换成真实 embedding 模型。
- 给 Markdown 解析增加标题层级、chunk overlap 和 chunk 预览。
- 加评测集，记录命中率、拒答率和坏 case。
- 接入真实 LLM，让 `_compose_answer` 从“拼接资料”升级为“基于资料生成自然语言回答”。

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“43 企业知识库 RAG 项目 demo”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
