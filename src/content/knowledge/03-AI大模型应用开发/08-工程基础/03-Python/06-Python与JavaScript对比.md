# 工程基础（9）- Python 与 JavaScript 对比

> 读完你能：把前端的 JS 经验快速迁移到 Python，准确说出两边在语法、异步、类型、包管理上的对应和差异，能读懂也能写出 AI 工程里的 Python 代码，而不是把 Python 写成「带缩进的 JavaScript」。

# 一、一个真实场景

你接手一个 Python 写的 AI 服务，扫一眼代码，大部分能猜个八九不离十：变量、函数、if、循环都认识。但有几处让你卡住：`[f(x) for x in xs]` 这是啥？为什么调个异步函数要 `asyncio.run()` 包一层？`json.loads` 出来的 `true` 怎么变成 `True` 了？

好消息是，编程的核心思想两边相通，你的前端经验绝大部分能直接迁移。坏消息是，有几个地方思路不同，照搬 JS 写法会写出别扭甚至跑不了的代码。这一篇把「能直接迁移的」和「要换脑子的」分清楚，让迁移成本最小。

# 二、能直接迁移的：语法对照表

| 你在 JS 里 | Python 里 | 备注 |
|---|---|---|
| `const arr = []` | `arr = []` | 不写 const/let，直接赋值 |
| `function f(){}` | `def f():` | 冒号 + 缩进代替 `{}` |
| `arr.map(f)` | `[f(x) for x in arr]` | 列表推导式 |
| `arr.filter(p)` | `[x for x in arr if p(x)]` | 同上加 if |
| `obj.key` / `obj['key']` | `d["key"]` | 字典只有方括号，没点语法 |
| `` `${a}` `` | `f"{a}"` | 模板字符串 vs f-string |
| `arr.join("\n")` | `"\n".join(arr)` | **方向反了**：JS 是数组方法，Python 是字符串方法 |
| `JSON.parse(s)` | `json.loads(s)` | 需 `import json` |
| `try{}catch(e){}` | `try: ... except E:` | Python 鼓励接具体异常类型 |
| `===` | `==` | Python 的 `==` 不做隐式类型转换，没有 `===` 的烦恼 |

最容易写错的是缩进。JS 里缩进只是好看，Python 里缩进是语法——函数体、if 体、for 体都必须缩进且一致，错了直接 `IndentationError`。

# 三、要换脑子的：四个真正的差异

**1. 异步：JS 自带事件循环，Python 要手动启动**

JS 的运行时（浏览器、Node）天生带事件循环，写个 `async function` 直接 `await` 调就行。Python 不是：协程定义出来不会自己跑，得用 `asyncio.run()` 显式启动事件循环。

```python
import asyncio

async def fetch(): ...           # 定义协程，此时还没跑

asyncio.run(fetch())             # 必须显式启动，这是 JS 里没有的一步
```

`await` 用法两边几乎一样，但「谁来驱动这些协程」的心智不同。这是前端转 Python 最容易懵的点。

**2. 布尔和空值：大写、None**

```python
True, False, None        # Python：首字母大写，空值叫 None
// true, false, null      // JS：全小写，空值叫 null（还有 undefined）
```

`json.loads('{"x": true}')` 解析出来 `x` 是 Python 的 `True`。Python 也没有 `undefined`，缺失统一用 `None`。

**3. 类型标注：Python 更看重，但不强制**

```python
def build_prompt(question: str, chunks: list[str]) -> str: ...
```

`: str` 和 `-> str` 是类型标注，运行时不强制（不像 TS 编译期检查），但 AI 工程代码里 prompt、chunks、tool 结果传来传去，标上类型别人一眼能看懂。相当于「写在函数签名里的文档」。

**4. 包管理和环境：pip 默认装全局**

| JS | Python |
|---|---|
| `package.json` | `requirements.txt` |
| `npm install`（装进本地 node_modules） | `pip install`（**默认装全局**，得先建虚拟环境） |
| `node_modules/` 项目自动隔离 | `.venv/` 需手动建并激活 |

JS 的依赖天然按项目隔离，Python 必须自己先 `python3 -m venv .venv` 才隔离。详见 04 篇。

# 五、工程上真正会踩的坑

- **`join` 写反**：习惯性写 `chunks.join("\n")`，Python 里 list 没有 join 方法，要写 `"\n".join(chunks)`。
- **以为协程会自己跑**：定义了 `async def` 却直接调，得到的是一个协程对象而不是结果，必须 `await` 或 `asyncio.run`。
- **同步函数里 await**：`await` 只能用在 `async def` 函数内，在普通函数里写会语法错误。
- **把 JS 真值判断搬过来**：JS 里 `if (arr.length)`，Python 直接 `if arr`（空 list 为假），别写成 `if len(arr) > 0` 那么啰嗦，也别去找 `arr.length`（是 `len(arr)`）。
- **纠结「Agent 是不是只能用 Python」**：不是。核心是模型、RAG、Agent 的架构和协议，语言是工具。Python 生态在 AI 这块更全，是高性价比选择，但 Node 一样能写。
- **忘了建虚拟环境**：带着 JS「装包自动隔离」的惯性，`pip install` 直接污染全局。

# 六、一句话面试答法

**问：你前端出身，转 Python 做 AI 后端，最大的适应点是什么？**

> 语法层面迁移成本很低，变量、函数、条件、循环、JSON 处理都能对应上 JS。真正要换脑子的有几处：异步上 Python 要显式 asyncio.run 启动事件循环，不像 JS 运行时自带；包管理上 pip 默认装全局，必须先建虚拟环境隔离；还有布尔大写、空值用 None、join 方法挂在字符串上这些细节。把这几个差异点过一遍，剩下的精力就能放在 LLM API、RAG、Agent 这些真正的主线上。

# 八、总结

- **工程上真正会踩的坑**：join 写反：习惯性写 chunks.join("\n")，Python 里 list 没有 join 方法，要写 "\n".join(chunks)。
- **能直接迁移的：语法对照表**：最容易写错的是缩进。
- **要换脑子的：四个真正的差异**：1. 异步：JS 自带事件循环，Python 要手动启动
- **一个真实场景**：你接手一个 Python 写的 AI 服务，扫一眼代码，大部分能猜个八九不离十：变量、函数、if、循环都认识。

<!-- knowledge-lab-merged -->

# 动手实践：09 Python 与 JavaScript 对比

同一段 AI 脚本逻辑（清洗消息 → 检索 → 拼提示词 → 异步调模型 → 解析 JSON）的 Python 写法，每个关键处都用注释标出 JS 里对应怎么写。拿前端经验一行行对照着读。

## 在线运行

直接使用本文“可运行源码”中的沙盒执行；源码、复制内容和实际运行入口保持一致。

零依赖，纯标准库。

## 预期输出

```
清洗前 2 条，清洗后 1 条
命中场景结果：{'answer': '30 天内提交', 'has_source': True}
未命中场景结果：{'answer': '资料不足', 'has_source': False}
```

注意 `True`/`False` 是 Python 的大写写法，JSON 里的 `true` 被 `json.loads` 转成了 Python 的 `True`。

## 代码对应文章的哪些点

| 对照点 | Python | JS | 在 main.py 哪里 |
|---|---|---|---|
| 函数定义 | `def f():` | `function f(){}` | 每个函数 |
| 数组过滤/映射 | 列表推导式 | `.filter` / `.map` | `clean_messages`、`search` |
| 字符串拼接 | `"\n".join(list)` | `list.join("\n")` | `build_prompt` |
| 模板字符串 | `f"{x}"` | `` `${x}` `` | `build_prompt` |
| 异步函数 | `async def` + `await` | `async function` + `await` | `fake_model`、`handle` |
| 启动事件循环 | `asyncio.run()` | 运行时自带 | `main` |
| JSON 解析 | `json.loads` | `JSON.parse` | `parse_json` |
| 异常捕获 | `except 具体类型` | `catch(e)` | `parse_json` |

## 动手改

- 把 `clean_messages` 的列表推导式改成普通 `for` 循环 + `append`，对照哪种更接近 JS 的 `.filter`。
- 把两次 `asyncio.run` 合并成一次，体会 Python 必须显式管理事件循环，而 JS 不用。
- 给 `parse_json` 喂一段非法 JSON，看 `except` 分支怎么兜底。

## 可运行源码：Python 与 JavaScript 对比

下方代码就是在线沙盒实际执行的完整源码。可直接运行、查看输出或复制到本地，页面不再依赖文章外的重复脚本。

### `main.py`

```python
"""用 Python 实现前端开发者熟悉的异步 AI 调用链。"""

from __future__ import annotations

import asyncio
import json


def retrieve(question: str) -> list[str]:
    """返回命中资料；question 对应 JavaScript 函数参数。"""
    # 离线实验使用的固定知识列表。
    documents = ["报销应在费用发生后 30 天内提交。", "年假需提前 3 天申请。"]
    return [document for document in documents if any(word in document for word in question if word.strip())][:1]


async def call_model(prompt: str) -> str:
    """模拟异步模型调用；prompt 是拼装后的完整提示词。"""
    await asyncio.sleep(0.01)
    # 模拟模型返回的结构化 JSON 字符串。
    return json.dumps({"answer": prompt.split("资料：", 1)[-1]}, ensure_ascii=False)


async def main() -> None:
    """执行清洗、检索、提示词拼装、异步调用和 JSON 解析。"""
    # Python strip 对应 JavaScript trim。
    question = "  报销什么时候提交？  ".strip()
    # Python 列表对应 JavaScript Array。
    evidence = retrieve(question)
    # Python f-string 对应 JavaScript 模板字符串。
    prompt = f"问题：{question}\n资料：{' '.join(evidence) or '无'}"
    # Python await 与 JavaScript await 语义一致。
    raw_response = await call_model(prompt)
    # Python dict 对应 JavaScript object。
    parsed_response = json.loads(raw_response)
    print(parsed_response)


if __name__ == "__main__":
    asyncio.run(main())
```
