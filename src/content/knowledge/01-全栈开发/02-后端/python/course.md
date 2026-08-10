# Python 学习路线

> 前端 → Python，全面覆盖、中度深入，边学边让 AI 生成 demo 对照
> 开始日期：2026/06/11

## 学习方式

- 每个概念配**前端类比**（你已会 JS/TS，用熟悉的心智模型迁移）
- 全面铺开但不钻牛角尖：语法、Web、数据、AI、自动化都过一遍，单点中度深入即可
- 实战章节由 **AI 生成 demo**，对照真实代码理解，而非死记语法
- 文档按需记录，学到该记的再写

## 与 Java 学习的区别

| 维度 | Java 主线 | Python 主线 |
|------|-----------|-------------|
| 定位 | 重型企业后端、微服务 | 胶水语言，AI/数据/脚本无处不在 |
| 类型 | 强类型、编译检查 | 动态类型（可选 type hint，像 TS 的渐进式） |
| 重点 | Spring Boot 生态 | 语法简洁 + 三大方向（Web/数据/AI） |
| 参考 | 对照通用后端示例 | 对照 AI 生成的 demo |

---

## 目录（tree）

```
python/
├── 学习路线和目录.md                  # 本文件：学习路线总览
│
├── # 阶段一：环境与语法速成（前端视角）
├── 01-Python环境配置.md               # Python、pip、venv、IDE（对比 node/npm）
├── 02-第一个Python程序.md             # HelloWorld、运行方式、缩进即代码块
├── 03-Python与JavaScript对比.md       # 语法对照表（变量/函数/类型）
├── 04-数据类型与变量.md               # int/str/list/dict/tuple/set（对比 JS）
├── 05-控制流与函数.md                 # if/for/while、def、默认参数、*args/**kwargs
│
├── # 阶段二：Python 进阶特性
├── 06-列表推导式与生成器.md           # 比 map/filter 更优雅的写法
├── 07-面向对象.md                     # class、self、继承、魔术方法
├── 08-模块与包管理.md                 # import、__init__、pip、requirements
├── 09-异常处理与上下文管理.md         # try/except、with 语句
├── 10-装饰器与高阶函数.md             # 装饰器 ≈ 高阶组件/中间件
├── 11-类型注解.md                     # type hint（像 TS 的渐进类型）
├── 12-虚拟环境与依赖管理.md           # venv/poetry/uv（对比 node_modules）
│
├── # 阶段三：Web 后端（FastAPI 为主）
├── 13-Web后端概览.md                  # WSGI/ASGI、框架选型（Flask/Django/FastAPI）
├── 14-FastAPI入门.md                  # 路由、请求响应（对比 Express）
├── 15-请求参数与数据校验.md           # Pydantic 模型（像 zod/TS interface）
├── 16-数据库操作.md                   # SQLAlchemy ORM、增删改查
├── 17-异步与并发.md                   # async/await（语法像 JS，机制不同）
├── 18-中间件与依赖注入.md             # Depends、认证、CORS
│
├── # 阶段四：数据处理
├── 19-文件与IO操作.md                 # 读写文件、JSON、CSV
├── 20-NumPy基础.md                    # 数组运算（科学计算地基）
├── 21-Pandas数据分析.md               # DataFrame（像加强版 Excel/SQL）
├── 22-数据可视化.md                   # matplotlib 画图入门
│
├── # 阶段五：AI 编程（重点方向）
├── 23-调用大模型API.md                # OpenAI/Claude SDK、流式输出
├── 24-Prompt工程基础.md               # 提示词、结构化输出、函数调用
├── 25-向量与Embedding.md              # 文本向量化、相似度检索
├── 26-RAG入门.md                      # 检索增强生成、向量库
├── 27-Agent与工具调用.md              # ReAct、tool use、多步推理
│
├── # 阶段六：自动化与爬虫
├── 28-爬虫入门.md                     # requests + BeautifulSoup
├── 29-自动化脚本.md                   # 文件批处理、定时任务
│
├── # 阶段七：工程化与实战
├── 30-项目结构与规范.md               # 目录组织、配置管理、日志
├── 31-测试.md                         # pytest 单元测试
├── 32-打包与部署.md                   # Docker、环境变量
├── 33-实战-AI生成一个接口demo.md      # 需求→FastAPI接口→数据库→联调
├── 34-实战-AI生成一个数据脚本.md      # 抓数据→清洗→分析→出图
│
└── # 附录
    ├── 附录-Python陷阱对照.md         # 易踩坑点（可变默认参数、闭包等）
    ├── 附录-常用命令.md               # pip/venv/python 速查
    └── 附录-JS到Python速查表.md       # 高频语法双向对照
```

## 进度追踪

| 阶段 | 内容 | 状态 |
|------|------|------|
| 一 | 环境与语法速成 | ⏳ |
| 二 | 进阶特性 | ⏳ |
| 三 | Web 后端（FastAPI） | ⏳ |
| 四 | 数据处理 | ⏳ |
| 五 | AI 编程 | ⏳ |
| 六 | 自动化与爬虫 | ⏳ |
| 七 | 工程化与实战 | ⏳ |

## 阶段目标

- **阶段一~二**：能读懂、能写出符合 Python 习惯的代码（不写成「Python 味的 JS」）
- **阶段三**：能用 FastAPI 独立撸一个带数据库的 CRUD 接口
- **阶段四**：能用 Pandas 处理表格数据、出基本图表
- **阶段五**：能调大模型 API，搭一个最小 RAG / Agent demo（核心诉求）
- **阶段六~七**：能写自动化脚本，把项目规范地组织、测试、部署

## 参考

- 真实代码：让 AI 按章节主题生成 demo，对照阅读
- 官方文档：[docs.python.org](https://docs.python.org/zh-cn/3/)、[FastAPI](https://fastapi.tiangolo.com/zh/)
- 对照 Java 学习：`temp/learn/java学习/学习路线和目录.md`
