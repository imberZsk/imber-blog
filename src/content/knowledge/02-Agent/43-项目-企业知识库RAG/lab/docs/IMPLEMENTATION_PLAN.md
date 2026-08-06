# 43 企业知识库 RAG 实施计划

**目标：** 把原来的单文件命令行 demo 升级为可演示的本地 Web 项目，支持文档入库、RAG 问答、引用来源、检索日志和友好的前端界面。

**方案：** 使用 Python 标准库提供 HTTP 服务与静态文件服务，核心 RAG 逻辑拆到 `rag_core.py`。检索用本地 TF-IDF + 余弦相似度实现，避免外部 API Key 和向量库依赖。

**文件结构：**

- `rag_core.py`：文档模型、chunk 切分、TF-IDF 检索、grounded 回答、请求日志。
- `main.py`：HTTP API、静态页面服务、示例数据加载、启动入口。
- `static/index.html`、`static/styles.css`、`static/app.js`：企业知识库工作台前端。
- `data/sample-docs/*.md`：开箱即用的企业制度样例。
- `tests/test_rag_core.py`、`tests/test_api.py`：核心逻辑和 API 测试。
- `README.md`：运行、测试、演示脚本和升级方向。

**验收：**

1. `python3 -m unittest discover -s tests -v` 通过。
2. `python3 main.py` 能启动服务。
3. `GET /health` 返回 ok。
4. `POST /api/rag/chat` 对“报销多久内提交”返回答案、引用和 trace。
5. 前端页面能加载文档列表、提问、展示引用和检索过程。
