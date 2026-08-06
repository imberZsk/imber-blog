# 07 文件、JSON 与异常处理 demo

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
