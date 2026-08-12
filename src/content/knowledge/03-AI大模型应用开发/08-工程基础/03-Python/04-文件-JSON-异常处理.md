# 工程基础（7）- 文件、JSON 与异常处理

> 读完你能：读取本地配置和文档、解析模型吐回来的 JSON（包括被代码块包裹和格式损坏的情况），并用统一的 `{ok, data, error}` 形态把所有失败路径兜住，让脚本从「能跑」变成「能交付」。

# 一、一个真实场景

你的助手要做意图识别：让模型把用户问题归类，要求它「只返回 JSON」。上线第一天就翻车——模型有时返回 ` ```json {...} ``` ` 带 Markdown 代码块，有时多个逗号变成非法 JSON，有时配置文件路径在同事机器上根本不存在。

这些都不是模型「坏了」，而是真实输入本来就不稳定。AI 应用的输入大量来自外部：配置文件、企业文档、模型输出、工具返回。专业和业余的差距，往往不在成功路径写得多漂亮，而在失败时程序是稳稳兜住，还是直接抛栈崩给用户。这一篇讲的就是这层护栏。

# 二、三块内容

## 2.1 读文件：编码和存在性是两个高频坑

```python
from pathlib import Path

path = Path("config.json")
if not path.exists():                       # 先判断存在，错误信息更明确
    return {"ok": False, "error": "文件不存在"}
text = path.read_text(encoding="utf-8")     # 显式 utf-8，否则中文可能乱码
```

两件事必须做对：一是**显式指定 `encoding="utf-8"`**，不同系统默认编码不同，中文文档不指定就乱码；二是**先判断文件存在**再读，给出「文件不存在」这种人能看懂的错误，而不是一个原始的 `FileNotFoundError` 堆栈。

## 2.2 解析 JSON：try-except 是标配

`json.loads` 解析失败会抛 `json.JSONDecodeError`。不接住，整个请求就 500 了。

```python
import json

try:
    data = json.loads(text)
except json.JSONDecodeError as e:
    return {"ok": False, "error": f"不是合法 JSON：{e}", "raw": text}
```

注意 `except` 要**接具体的异常类型**，不要图省事写 `except Exception`。接具体类型，你才能对「文件读不了（OSError）」和「内容不是 JSON（JSONDecodeError）」给出不同的提示和处理。

## 2.3 模型输出：先清洗，再解析，留原文

模型最爱干的事，就是把 JSON 塞进 Markdown 代码块：

```
```json
{"intent": "报销", "confidence": 0.9}
```
```

直接 `json.loads` 必然失败，但它其实「格式没错，只是裹了层壳」。正确做法是先剥壳再解析：

```python
cleaned = text.strip()
if cleaned.startswith("```"):
    cleaned = cleaned.split("\n", 1)[-1]   # 去掉开头 ```json 那行
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]             # 去掉结尾 ```
    cleaned = cleaned.strip()
data = json.loads(cleaned)
```

解析失败时，**把原始文本 `raw` 一起返回**。上层才能据此决定是重试、是让模型修复，还是降级处理——光有一句「解析失败」没法排查。

## 2.4 统一返回形态：调用方只学一种判断

上面三段都返回同一种结构：

```python
{"ok": True,  "data": {...}, "error": None}     # 成功
{"ok": False, "data": None,  "error": "原因"}    # 失败
```

调用方永远 `if result["ok"]` 一招判断，不用记每个函数失败时返回 None 还是抛异常还是返回空串。这和前端约定接口统一返回 `{ code, data, message }` 是同一个道理。

# 四、工程上真正会踩的坑

- **只测正常文件**：不测空文件、不存在的路径、没权限的文件。失败路径恰恰是线上最常触发的。
- **`except Exception` 一把抓**：把所有错误压成一句话，丢了类型信息，排查时完全不知道是文件问题还是格式问题。接具体异常。
- **吞掉异常假装成功**：`except: pass` 后返回空结果，坏 case 静默消失，是最难查的 bug。要么处理、要么记录、要么往上抛，别假装没发生。
- **直接把堆栈返回给用户**：`Traceback ... JSONDecodeError` 用户看不懂也不该看到。给「内容解析失败，请重试」这类可读文案，堆栈写进日志。
- **日志没上下文**：只记「解析失败」，不记是哪个请求、原始输入是什么，等于没记。失败时把 `raw` 和请求标识一起记下来。
- **以为模型一定返回合法 JSON**：再怎么在提示词里强调「只返回 JSON」，也必须有解析失败的兜底。把这当成必然会发生的事来设计。

# 五、一句话面试答法

**问：模型让它返回 JSON，结果格式不对，你怎么处理？**

> 分三层：先清洗，剥掉模型爱加的 ```json 代码块包裹再 json.loads；解析失败接住 JSONDecodeError，保留原始输出，按场景重试、让模型修复或降级；全程统一返回 {ok, data, error}，调用方一种判断走通。核心是把「模型偶尔返回非法 JSON」当成必然事件来设计兜底，而不是指望提示词能根治。

# 七、总结

- **工程上真正会踩的坑**：只测正常文件：不测空文件、不存在的路径、没权限的文件。
- **三块内容**：两件事必须做对：一是显式指定 encoding="utf-8"，不同系统默认编码不同，中文文档不指定就乱码；
- **一个真实场景**：你的助手要做意图识别：让模型把用户问题归类，要求它「只返回 JSON」。
- **配套 demo：跑起来看**：main.py 演示三段，配套一个真实的 config.json：

<!-- knowledge-lab-merged -->

# 动手实践：07 文件、JSON 与异常处理

把 AI 应用「不靠谱的外部输入」处理干净：读配置文件（可能不存在）、解析模型输出的 JSON（可能被代码块包裹、可能根本不合法），全程不让程序崩，统一返回 `{ok, data, error}`。

## 运行

```bash
python3 main.py
```

零依赖，纯标准库。同目录的 `config.json` 是配套的示例配置。

## 预期输出

```
== 1. 读取正常配置 ==
ok=True, app_name=知识库助手
回答示例：报销需在费用产生后 30 天内提交，附发票和审批单。

== 2. 读取不存在的配置（兜底）==
ok=False, error=配置文件不存在：/.../07-file-json-exception/nope.json

== 3. 解析模型 JSON ==
[干净 JSON] 解析成功 -> {'intent': '报销', 'confidence': 0.9}
[带 ```json 包裹] 解析成功 -> {'intent': '请假', 'confidence': 0.8}
[坏掉的 JSON] 解析失败 -> 模型输出不是合法 JSON：Expecting property name enclosed in double quotes: line 1 column 18 (char 17)
```

第 2 项里的 `nope.json` 绝对路径会随你的机器变化，这是正常的。

## 代码对应文章的哪些点

| 概念 | 在 main.py 哪里 |
|---|---|
| 读文件 + 指定 utf-8 编码 | `load_config` 里 `read_text(encoding="utf-8")` |
| 先判断文件存在再读 | `load_config` 里 `config_path.exists()` |
| try-except 区分不同失败 | `load_config` 分别接 `JSONDecodeError` / `OSError` |
| 清洗模型输出再解析 | `parse_model_json` 剥 ```` ```json ```` 包裹 |
| 失败保留 raw 原文 | `parse_model_json` 返回里的 `raw` |
| 统一 `{ok, data, error}` 形态 | 两个函数的返回值 |
| `dict.get` 防 KeyError | `answer_with_config` 里 `config.get("knowledge", {})` |

## 动手改

- 把 `config.json` 里某个逗号删掉，重跑，看第 1 项怎么从成功变成「不是合法 JSON」。
- 在 `samples` 里加一条你见过的模型脏输出，验证 `parse_model_json` 能不能救回来。
- 把 `answer_with_config` 里的 `.get("knowledge", {})` 改成 `["knowledge"]`，再读一个没有该字段的配置，体会 KeyError 崩溃和兜底的区别。
