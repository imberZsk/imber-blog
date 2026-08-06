# AI Agent 学习路线

> 前端 → AI 应用工程师，主攻大模型应用开发、RAG、Agent、工作流与工程化
> 开始日期：2026/06/09

## 本次资料建设状态

| 交付项 | 状态 | 说明 |
|---|---|---|
| 小册正文 | 已重写 | 01-52 篇全部为干货内容，删除了旧版的模板套壳段落，每篇都是本主题独有的真实场景、核心概念、工程坑和面试答法 |
| 进阶正文 | 已补齐 | 53-91 篇按 `吃透 AI Agent 开发` 截图目录重写为进阶工程实战线，覆盖 Tool、MCP、RAG、LangChain、LangGraph、数据底座、多模态知识库 |
| 附录 | 已补齐 | 包含术语表、常用命令、常用库和框架、学习资料链接、问题排查清单 |
| 分篇 demo | 已完成 | 每篇文章配一个独立可跑 demo，路径 `/Users/imber/Desktop/imber/Agent/demos/NN-slug/`，共 47 个 |
| 整合 demo | 已保留 | `/Users/imber/Desktop/imber/Agent/agent-demo`，作为 43-47 项目篇的整合参考（前端+SSE+测试） |
| demo 验证 | 已通过 | 47 个分篇 demo 全部 `python3 main.py`（或 quiz.py）跑通；整合 demo 通过 `npm test` |

## 分篇 demo 说明

每篇文章（认知篇 01-03、简历篇 48、话术篇 52 除外）都配了一个**独立、可跑、离线**的最小 demo，做到「读 NN 篇 → 跑 demos/NN-* → 把知识压到可运行代码上」。

- **语言**：Python 基础和 AI 主线用纯 Python 标准库；16/46 前端篇用原生 HTML+JS；38 含 Dockerfile。
- **零依赖离线**：不需要任何模型 API Key，用本地 mock 模拟模型输出；检索/embedding 用「词袋/关键词加权打分」模拟语义相似度。
- **运行**：进任意 demo 目录，`python3 main.py`（面试篇是 `python3 quiz.py`），README 第一行就是运行命令，并附预期输出。

```bash
# 例：跑 Function Calling 工具调用的 demo
cd /Users/imber/Desktop/imber/Agent/demos/28-function-calling
python3 main.py
```

整合 demo（项目篇 43-47 的完整参考，带前端页面和 SSE 流式）：

```bash
cd /Users/imber/Desktop/imber/Agent/agent-demo
npm test && npm start   # 访问 http://localhost:5177
```

## 推荐使用方式

1. 先读 01-03，建立 AI 应用工程师、RAG、Agent 的整体地图（这三篇无 demo，是认知铺垫）。
2. 读 04-09 补 Python，每篇跑一遍 `demos/0N-*` 把语法压到 AI 场景上。
3. 读 10-19 理解模型 API、结构化输出、流式响应和前后端联调。
4. 读 20-32，把 RAG 和 Agent 作为主线重点突破，对照 demo 看检索/工具调用/ReAct/安全怎么落地。
5. 读 33-42 了解框架平台和工程化。
6. 读 43-47 做项目，43 的 demo 是最小 RAG 闭环，整合版在 `agent-demo`。
7. 读 48-52 把项目整理成简历、话术和面试回答，49-51 配 `quiz.py` 抽题自测。
8. 主线读完后进入 53-91：这是一条进阶工程实战线，按 Tool/MCP → RAG 深化 → LangChain/LangGraph → Agent UI/语音/任务 → 数据底座 → 企业级项目的顺序阅读。

## 进阶专题阅读顺序

主线 01-52 读完或做到 43 项目后，再读这些专题：

1. `appendices/进阶-企业级RAG项目拆解.md`：把基础 RAG 升级成企业项目。
2. `appendices/进阶-混合检索与RAG调优实战.md`：学会定位召回、排序、拒答和生成问题。
3. `appendices/进阶-GraphRAG与知识图谱增强.md`：判断什么时候需要 KG/GraphRAG。
4. `appendices/进阶-多Agent与MCP工程化.md`：理解多 Agent 平台和共享服务。
5. `appendices/进阶-垂直行业Agent项目案例.md`：把知识迁移到合同、法律、客服、教育等行业项目。

## 第二主线：吃透 AI Agent 开发

2026/07/07 已根据截图目录把 `吃透 AI Agent 开发` 重规划为第二主线，共 39 篇，编号 53-91。01-52 继续作为基础主线；53-91 作为进阶工程实战主线。重复主题采用“旧篇讲基础，新篇讲进阶”的分工，相关旧篇已补充「与进阶篇的分工」说明。

- 章节目录：`53-AI-Agent-开发要学什么` 至 `91-企业级知识库项目-多模态-RAG-流程梳理`
- 截图归档：`assets/吃透-ai-agent-开发-目录-01-10.png`、`assets/吃透-ai-agent-开发-目录-10-20.png`、`assets/吃透-ai-agent-开发-目录-21-30.png`、`assets/吃透-ai-agent-开发-目录-31-39.png`
- 详细索引：`assets/吃透 AI Agent 开发.md`
- 当前状态：已重写为完整学习文章，每篇包含定位、真实场景、核心拆解、工程链路、落地建议、常见坑、与已有主线关系和复述答法

### 53-91 进阶阅读分组

| 范围 | 主题 | 阅读目标 |
|---|---|---|
| 53-57 | Tool 与 MCP | 从工具调用、命令执行到跨进程工具复用 |
| 58-62 | RAG 入库与向量检索 | 从文档向量化、loader/splitter 到 Milvus 实战 |
| 63-69 | Memory 与 LangChain | 管理记忆、结构化输出、Prompt Template、Runnable、LCEL |
| 70-76 | Agent 产品能力 | Nest 流式接口、定时任务、语音、AGUI、LangGraph、Agentic RAG |
| 77-81 | 检索与观测工程化 | Docker Compose、ES、混合检索、GraphRAG、LangSmith |
| 82-88 | 多 Agent 与数据底座 | DeepAgents、PostgreSQL、Redis、Mem0、Nest、对象存储 |
| 89-91 | 模型原理与企业级项目 | Transformer、训练/推理、多模态企业知识库 |

## 学习方式

- 以“能做出可演示项目、能讲清楚面试问题”为目标
- Python 只学 AI 应用开发需要的部分，不走纯算法路线
- 每个概念尽量用前端视角类比，降低理解成本
- 学到一个网页、视频或项目，就沉淀一篇短笔记
- 每个阶段都保留一个可落地的小项目或简历表达

## 学习主线

1. Python 应用开发基础
2. 大模型 API 调用与 Prompt 工程
3. FastAPI 后端接口与前端联调
4. RAG 企业知识库
5. Agent 与工具调用
6. Dify、Coze、LangChain、LangGraph
7. AI 应用工程化、部署与成本控制
8. 求职项目、面试题与简历沉淀

## 目录（tree）

```
Agent学习/
├── 学习路线和目录.md                         # 本文件：学习路线总览
│
├── # 阶段一：认知与路线
├── 01-AI应用工程师是什么.md                  # 岗位能力、和前端/后端/算法的区别
├── 02-前端转AI应用工程师路线.md              # 前端优势、补齐点、学习边界
├── 03-大模型应用开发全景图.md                # LLM、RAG、Agent、工作流、微调
│
├── # 阶段二：Python 快速入门
├── 04-Python环境配置.md                      # Python、pip、venv、VS Code
├── 05-Python基础语法.md                      # 变量、条件、循环、函数
├── 06-Python数据结构.md                      # list、dict、tuple、set
├── 07-文件-JSON-异常处理.md                  # 文件读写、JSON、try-except
├── 08-模块-包-面向对象.md                    # import、class、工程组织
├── 09-Python与JavaScript对比.md              # 前端视角理解 Python
│
├── # 阶段三：LLM API 与 Prompt
├── 10-大模型API基础.md                       # Chat API、模型、token、上下文
├── 11-Prompt工程基础.md                      # 角色、约束、示例、结构化提示
├── 12-结构化输出与JSON.md                    # JSON 输出、schema、解析与兜底
├── 13-流式响应.md                            # SSE、stream、前端打字机效果
├── 14-多轮对话与上下文管理.md                # history、summary、memory
│
├── # 阶段四：AI 应用后端
├── 15-FastAPI入门.md                         # 路由、请求、响应、Pydantic
├── 16-前端调用AI接口.md                      # fetch、SSE、错误态、加载态
├── 17-文件上传与文档解析.md                  # PDF、Word、Markdown、网页
├── 18-异步任务与队列基础.md                  # 长任务、进度、重试
├── 19-AI应用接口设计.md                      # API 设计、鉴权、限流、日志
│
├── # 阶段五：RAG 企业知识库
├── 20-RAG是什么.md                           # RAG 原理、适用场景、局限
├── 21-文档切分Chunk.md                       # chunk size、overlap、元数据
├── 22-Embedding向量化.md                     # embedding、相似度、召回
├── 23-向量数据库.md                          # Chroma、Milvus、pgvector
├── 24-检索与重排Rerank.md                    # topK、rerank、混合检索
├── 25-RAG回答生成与引用来源.md               # grounding、citation、幻觉控制
├── 26-RAG评测与调优.md                       # 命中率、准确率、坏 case 分析
│
├── # 阶段六：Agent 与工具调用
├── 27-Agent是什么.md                         # Agent、Workflow、Chatbot 区别
├── 28-Function-Calling工具调用.md            # 工具定义、参数、结果回填
├── 29-ReAct模式.md                           # 思考、行动、观察
├── 30-多工具Agent.md                         # 搜索、数据库、文件、业务接口
├── 31-Agent记忆与状态.md                     # short-term、long-term、session
├── 32-Agent安全边界.md                       # 权限、注入、工具误调用
│
├── # 阶段七：框架与平台
├── 33-Dify入门.md                            # 应用、知识库、工作流、API
├── 34-Coze入门.md                            # Bot、插件、工作流、发布
├── 35-LangChain入门.md                       # chain、prompt、retriever、tool
├── 36-LangGraph入门.md                       # graph、node、edge、state
├── 37-框架选型对比.md                        # Dify vs Coze vs LangChain vs LangGraph
│
├── # 阶段八：部署与工程化
├── 38-Docker基础.md                          # 镜像、容器、compose
├── 39-模型部署与本地调用.md                  # Ollama、Xinference、OpenAI兼容接口
├── 40-AI应用日志与可观测性.md                # prompt日志、调用链、耗时、token
├── 41-成本控制与缓存.md                      # token 成本、缓存、限流
├── 42-生产问题排查清单.md                    # 超时、空回答、幻觉、召回失败
│
├── # 阶段九：项目实战
├── 43-项目-企业知识库RAG.md                  # 文档上传、检索问答、引用来源
├── 44-项目-AI客服助手.md                     # 知识库 + 工单工具调用
├── 45-项目-AI数据分析助手.md                 # Text2SQL、图表、权限校验
├── 46-项目-前端AI-Copilot组件.md             # 嵌入现有后台的 AI 助手
├── 47-项目-个人Agent工作台.md                # 多工具、多任务、工作流
│
├── # 阶段十：面试与求职
├── 48-AI应用工程师简历.md                    # 简历写法、项目描述
├── 49-高频面试题-RAG.md                      # RAG 原理、调优、评测
├── 50-高频面试题-Agent.md                    # Agent、工具调用、工作流
├── 51-高频面试题-工程化.md                   # 部署、并发、稳定性、成本
├── 52-项目讲解话术.md                        # 如何讲项目、亮点和难点
│
└── # 附录
    ├── 附录-术语表.md
    ├── 附录-常用命令.md
    ├── 附录-常用库和框架.md
    ├── 附录-学习资料链接.md
    ├── 附录-问题排查清单.md
    ├── 进阶-企业级RAG项目拆解.md
    ├── 进阶-混合检索与RAG调优实战.md
    ├── 进阶-GraphRAG与知识图谱增强.md
    ├── 进阶-多Agent与MCP工程化.md
    └── 进阶-垂直行业Agent项目案例.md
```

## 进度追踪

| 阶段 | 内容 | 状态 |
|------|------|------|
| 一 | 认知与路线 | 🚀 进行中 |
| 二 | Python 快速入门 | ⏳ |
| 三 | LLM API 与 Prompt | ⏳ |
| 四 | AI 应用后端 | ⏳ |
| 五 | RAG 企业知识库 | ⏳ |
| 六 | Agent 与工具调用 | ⏳ |
| 七 | 框架与平台 | ⏳ |
| 八 | 部署与工程化 | ⏳ |
| 九 | 项目实战 | ⏳ |
| 十 | 面试与求职 | ⏳ |

## 当前学习资料

- Python 入门视频：先跟随 04-09 章节和配套 demo 打基础，不依赖单一视频来源
- 主路线：尚硅谷人工智能（大模型方向）学习路线
- 项目补充：AI 大模型应用开发视频合集
- 查漏补缺：黑马程序员 AI 大模型学习路线

## 阶段目标

### 第一阶段目标

- 知道 AI 应用工程师具体做什么
- 知道哪些内容必须学，哪些内容先跳过
- 确定第一条学习视频和记录方式

### 第二阶段目标

- 能写 Python 脚本调用大模型 API
- 能读取本地文件并生成总结
- 能处理 JSON、异常和简单模块拆分

### 第三到五阶段目标

- 做出一个最小版 AI 知识库问答系统
- 支持文件导入、向量检索、流式回答、引用来源

### 第六到九阶段目标

- 做出一个可放进简历的 AI 应用项目
- 能讲清楚 RAG、Agent、工具调用、部署和调优

## 参考目录

- 学习笔记目录：`/Users/imber/Desktop/imber/learn/Agent学习`
- 全栈学习路线：`/Users/imber/Desktop/imber/learn/全栈开发总结/学习路线和目录.md`
