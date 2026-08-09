# Python 学习 Demo

这个项目包含了 Python 学习小册的所有配套示例代码。

## 📚 项目结构

每个目录对应小册中的一章内容：

```
python-demo/
├── 01-Python环境配置/           # 环境配置相关
├── 02-第一个Python程序/         # Hello World 和基础语法
├── 03-Python与JavaScript对比/   # 两种语言的异同
├── 04-数据类型与变量/           # 基础数据类型
├── 05-控制流与函数/             # if/for/while/函数
├── 06-列表推导式与生成器/       # Python 特色语法
├── 07-面向对象/                 # 类和对象
├── 08-模块与包管理/             # import 和 pip
├── 09-异常处理与上下文管理/     # try/except/with
├── 10-装饰器与高阶函数/         # 装饰器模式
├── 11-类型注解/                 # Type Hints
├── 12-虚拟环境与依赖管理/       # venv/pip
├── 13-Web后端概览/              # Web 框架介绍
├── 14-FastAPI入门/              # FastAPI 基础
├── 15-请求参数与数据校验/       # Pydantic 校验
├── 16-数据库操作/               # SQLAlchemy/Tortoise
├── 17-异步与并发/               # async/await
├── 18-中间件与依赖注入/         # FastAPI 高级特性
├── 19-文件与IO操作/             # 文件读写
├── 20-NumPy基础/                # 数组计算
├── 21-Pandas数据分析/           # 数据处理
├── 22-数据可视化/               # Matplotlib/Seaborn
├── 23-调用大模型API/            # OpenAI/Claude API
├── 24-Prompt工程基础/           # Prompt 设计
├── 25-向量与Embedding/          # 向量数据库
├── 26-RAG入门/                  # 检索增强生成
├── 27-Agent与工具调用/          # AI Agent 开发
├── 28-爬虫入门/                 # requests/BeautifulSoup
├── 29-自动化脚本/               # 自动化任务
├── 30-项目结构与规范/           # 代码规范
├── 31-测试/                     # pytest
├── 32-打包与部署/               # Docker/部署
├── 33-实战-AI生成一个接口demo/  # 实战项目
├── 34-实战-AI生成一个数据脚本/  # 实战项目
└── venv/                        # 虚拟环境（自动生成）
```

## 🚀 使用方式

### 1. 激活虚拟环境（命令行）
```bash
source venv/bin/activate  # macOS/Linux
```

### 2. 运行某章节的示例
```bash
# 方式 1：直接运行
python 02-第一个Python程序/demo.py

# 方式 2：在 PyCharm 中右键运行
```

### 3. 安装依赖（需要时）
```bash
pip install -r requirements.txt
```

## 📖 学习建议

1. **按顺序学习**：从 01 开始，逐章推进
2. **动手实践**：每学完一章，在对应目录的 `demo.py` 中写代码验证
3. **对照教程**：配合 `python小册/` 目录下的 Markdown 文档一起看
4. **记录笔记**：可以在每个目录的 `README.md` 中记录学习心得

## 📦 环境准备

```bash
# 1. 创建并激活虚拟环境（PyCharm 会自动处理）
python3 -m venv venv
source venv/bin/activate          # macOS/Linux

# 2. 安装全部依赖
pip install -r requirements.txt
```

## ▶️ 运行任意一章 demo

```bash
# 每章 demo.py 都可独立运行，零外部依赖（无需联网/API key/数据库服务）
python 20-NumPy基础/demo.py

# 测试章节还可以用 pytest 跑
pytest 31-测试/demo.py
```

> 说明：Web 章节用 FastAPI `TestClient` 在进程内自测，不起常驻服务器；
> 数据库用 sqlite 内存库；大模型 API 用本地 FakeClient（真实 SDK 写法保留在注释/函数中）；
> 爬虫用本地 HTML 字符串解析。所以**所有 demo 都能直接 `python demo.py` 跑通**。

## 📝 当前进度（04~34 已全部补全并验证 `python demo.py` 零报错 ✅）

- [x] 01-Python环境配置
- [x] 02-第一个Python程序
- [x] 03-Python与JavaScript对比
- [x] 04-数据类型与变量
- [x] 05-控制流与函数
- [x] 06-列表推导式与生成器
- [x] 07-面向对象
- [x] 08-模块与包管理
- [x] 09-异常处理与上下文管理
- [x] 10-装饰器与高阶函数
- [x] 11-类型注解
- [x] 12-虚拟环境与依赖管理
- [x] 13-Web后端概览
- [x] 14-FastAPI入门
- [x] 15-请求参数与数据校验
- [x] 16-数据库操作
- [x] 17-异步与并发
- [x] 18-中间件与依赖注入
- [x] 19-文件与IO操作
- [x] 20-NumPy基础
- [x] 21-Pandas数据分析
- [x] 22-数据可视化
- [x] 23-调用大模型API
- [x] 24-Prompt工程基础
- [x] 25-向量与Embedding
- [x] 26-RAG入门
- [x] 27-Agent与工具调用
- [x] 28-爬虫入门
- [x] 29-自动化脚本
- [x] 30-项目结构与规范
- [x] 31-测试
- [x] 32-打包与部署
- [x] 33-实战-AI生成一个接口demo
- [x] 34-实战-AI生成一个数据脚本

---

**Happy Coding! 🐍**
