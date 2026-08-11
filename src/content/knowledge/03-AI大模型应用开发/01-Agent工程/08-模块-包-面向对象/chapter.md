# 模块、包与面向对象

> 读完你能：把一个堆在单文件里的 AI 脚本，拆成检索、模型、记忆、编排四个有清晰职责的模块，用类封装有状态的组件，并通过基类和工厂让模型实现可替换。

## 一个真实场景

前几篇的代码都堆在一个 `main.py` 里：检索、拼提示词、调模型、记历史全混在一起。功能能跑，但你想给「检索」单独写个测试，发现没法只测它，得把整个流程跑一遍；你想把 mock 模型换成真实 API，发现调用代码散落在好几处。

这就是单文件脚本的天花板。AI 项目会快速长出模型、检索、工具、记忆、日志、接口——没有边界，三周后它就变成谁都不敢改的「祖传脚本」。这一篇讲怎么从一开始就划好边界。好消息是：你在前端早就干过这件事——`components`、`hooks`、`services`、`stores` 各管一摊，就是模块化。

## 模块和包：按职责切，不按技术名词切

**模块**就是一个 `.py` 文件，**包**就是一个含 `__init__.py` 的目录（一组相关模块）。对照前端：

| Python | 前端 | 职责 |
|---|---|---|
| `knowledge.py` | `services/` | 数据和检索，别人通过它拿资料 |
| `model.py` | `api/` 适配层 | 模型调用，mock 和真实可换 |
| `memory.py` | `stores/` | 会话状态 |
| `agent.py` | 容器组件 | 编排：调度上面几层，自己不实现细节 |
| `main.py` | 入口 | 组装 + 启动 |

切分的原则是**按职责，不按技术名词**。每个文件能用一句话说清「它负责什么」，结构就不会差。`import` 用相对导入连接模块：

```python
# agent.py 里
from .knowledge import KnowledgeBase   # 同包内用 . 前缀
from .model import get_model
```

包的 `__init__.py` 负责「对外收口」——只暴露调用方真正要用的东西：

```python
# assistant/__init__.py
from .agent import Assistant
__all__ = ["Assistant"]    # 外部 from assistant import Assistant 即可，不用关心内部怎么拆
```

## 面向对象：给「有状态」的东西用

不是所有逻辑都要写成类。判断标准很简单：**这个东西要不要记住状态？**

- 知识库要记住「存了哪些资料」→ 用类 `KnowledgeBase`
- 会话要记住「聊过哪些消息」→ 用类 `Memory`
- 纯计算（拼提示词、清洗 JSON）没有状态 → 普通函数就够，别硬包成类

```python
class Memory:
    def __init__(self) -> None:
        self._messages = []                    # 实例状态，下划线前缀约定为内部

    def add(self, role: str, content: str) -> None:
        self._messages.append({"role": role, "content": content})

    def history(self) -> list[dict]:
        return self._messages[:]               # 返回拷贝，外部改不动内部
```

`_messages` 前面的下划线是约定：告诉别人「这是内部状态，别从外面直接动」，类似前端组件的私有 state。

## 基类 + 工厂：让模型实现可替换

AI 项目几乎一定会经历「先 mock，后接真实 API」。如果调用代码到处写死 `MockModel()`，换的时候要改一片。正确做法是定义一个统一接口，让所有实现都遵守：

```python
class Model:                                   # 基类：约定契约
    def generate(self, prompt: str) -> str:
        raise NotImplementedError              # 强制子类实现

class MockModel(Model):                        # 离线实现
    def generate(self, prompt: str) -> str:
        return "（mock 回答）..."

def get_model() -> Model:                      # 工厂：把「选哪个」收拢到一处
    if os.getenv("OPENAI_API_KEY"):
        return MockModel()                     # 真实项目这里 return OpenAIModel()
    return MockModel()
```

业务层只依赖 `Model` 这个抽象和 `get_model()` 这个工厂，永远不直接 new 具体实现。将来接真实 API，只改工厂一处，调用方一行不动。这就是「面向接口编程」。

再配合**依赖注入**——`Assistant` 的组件从外部传进来，而不是自己 new：

```python
class Assistant:
    def __init__(self, knowledge, model=None):
        self._kb = knowledge
        self._model = model or get_model()     # 不传就用工厂默认
```

测试时就能塞一个假的 `model` 进去，单独验证编排逻辑，不碰真实模型。

## 配套 demo：跑起来看

```bash
cd demos/08-module-oop
python3 main.py
```

`assistant/` 包就是上面这套结构的落地：

- `knowledge.py` 的 `KnowledgeBase` —— 检索层
- `model.py` 的 `Model` / `MockModel` / `get_model()` —— 模型适配 + 工厂
- `memory.py` 的 `Memory` —— 会话状态
- `agent.py` 的 `Assistant` —— 编排，`_build_prompt` 是私有方法
- `main.py` —— 只组装和调用，自己几乎不写逻辑

注意 `main.py` 有多薄：它只是 new 了组件、传进去、调 `ask`。逻辑都在模块里，这就是「入口薄、模块厚」。

## 工程上真正会踩的坑

- **过早抽象**：项目才两百行就拆出十个文件，每个文件三行，找代码比写代码还累。先单文件，长到一个文件说不清职责了再拆。
- **循环 import**：`agent.py` 导入 `model.py`，`model.py` 又回头导入 `agent.py`，直接报错。靠清晰的分层（上层依赖下层，下层不反向依赖）避免。
- **什么都写成类**：纯函数硬包成只有一个方法的类，徒增样板。无状态就用函数。
- **业务层写死具体实现**：到处 `MockModel()`，换 API 时改一片。用工厂 + 基类收口。
- **`__init__.py` 暴露一切**：把所有内部模块都 `import` 出来，调用方看到一堆本不该碰的东西。只暴露对外契约。
- **测试结构和源码不对应**：源码拆了模块，测试还是一个大文件，定位失败要全跑。`tests/` 按模块对应着拆。

## 一句话面试答法

**问：AI 后端项目你会怎么组织代码结构？**

> 按职责分层：检索、模型适配、会话状态、业务编排各一个模块，入口只做组装。模型这种一定会从 mock 换成真实 API 的，用基类定义统一 generate 接口加工厂决定实现，业务层只依赖抽象，换 API 改工厂一处。有状态的组件（知识库、记忆）用类封装，无状态的纯逻辑用函数。组件通过依赖注入传入，测试时好替换。

## 下一篇

`09-Python与JavaScript对比.md` —— 你已经能用 Python 写出有结构的 AI 脚本了，下一篇把 Python 和你熟悉的 JavaScript 系统对照一遍，帮你把前端经验快速迁移过来，也讲清两边真正的差异在哪。
