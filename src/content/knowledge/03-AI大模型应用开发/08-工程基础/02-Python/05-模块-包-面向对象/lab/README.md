# 08 模块、包与面向对象 demo

把前几篇堆在单文件里的逻辑，拆成一个有职责边界的 `assistant` 包：检索、模型、记忆、编排各管一摊。入口 `main.py` 只负责组装和调用，真正的逻辑在模块里。

## 运行

```bash
python3 main.py
```

零依赖，纯标准库。

## 目录结构

```
08-module-oop/
├── main.py                 # 入口：组装组件 + 调用，自己几乎不写逻辑
└── assistant/              # 一个包（package）
    ├── __init__.py         # 对外只暴露 Assistant
    ├── knowledge.py        # 检索层：KnowledgeBase
    ├── model.py            # 模型适配层：Model 基类 + MockModel + 工厂
    ├── memory.py           # 会话状态层：Memory
    └── agent.py            # 编排层：Assistant，串起上面三层
```

## 预期输出

```
问：报销怎么弄？
答：（mock 回答）根据资料，结论如上，详情见引用来源。
----------------------------------------
问：公司班车几点？
答：（mock 回答）资料中没有依据，建议补充文档后再问。
----------------------------------------
问：(空输入)
答：请输入一个问题。
----------------------------------------
本次会话共 2 轮有效提问
```

「公司班车」没命中知识库，所以走兜底回答；空输入被提前拦掉，不计入提问轮数，所以是 2 轮而非 3 轮。

## 代码对应文章的哪些点

| 概念 | 在哪里 |
|---|---|
| 模块按职责拆分 | `knowledge` / `model` / `memory` / `agent` 四个文件 |
| 包对外收口 | `__init__.py` 只 `from .agent import Assistant` |
| 类封装有状态组件 | `KnowledgeBase`、`Memory`、`Assistant` |
| 基类定义统一接口 | `model.py` 的 `Model` + `MockModel` |
| 工厂决定具体实现 | `model.py` 的 `get_model()` |
| 依赖注入便于替换/测试 | `Assistant.__init__` 接收 `knowledge`、`model` |
| 私有方法 | `Assistant._build_prompt`（下划线前缀） |

## 动手改

- 在 `model.py` 加一个 `EchoModel(Model)`，构造 `Assistant(kb, model=EchoModel())` 传进去，体会模型层可替换。
- 给 `Memory` 加一个 `clear()` 方法清空会话，在 `main.py` 里调一次再看 `turns()`。
- 把 `knowledge.py` 的 `KnowledgeBase` 改成从 `config.json` 读资料，体会检索层换实现不影响 `agent.py`。

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“08 模块、包与面向对象 demo”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
