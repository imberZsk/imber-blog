# 11-demo：提示词模板渲染器（纯 Python 标准库）

一个把「带 `{变量名}` 占位符的模板 + 变量字典」渲染成最终提示词的小工具。
对应第 11 章：把好提示词抽成模板、用占位符参数化、自动填充。**只用标准库，不联网、不装包。**

## 运行

```bash
python3 template_engine.py
```

会依次演示：正常渲染、另一个模板渲染、缺失变量报错、非严格模式保留占位符。

## 核心 API

```python
from template_engine import render, find_variables, BUILTIN_TEMPLATES, MissingVariableError

# 1) 渲染：把 {变量} 替换成字典里的值
tpl = "请帮我把「{事件}」写成给{汇报对象}看的周报。"
print(render(tpl, {"事件": "服务器迁移完成", "汇报对象": "技术总监"}))

# 2) 扫描模板用到哪些变量（方便做表单/检查）
print(find_variables(tpl))   # ['事件', '汇报对象']

# 3) 直接用内置模板
print(render(BUILTIN_TEMPLATES["场景翻译"],
             {"目标语言": "英文", "场景": "商务邮件", "原文": "已收到款项。"}))
```

## 两种模式

- **严格模式（默认 `strict=True`）**：模板里有占位符却没在字典里给值，会抛 `MissingVariableError`，并列出缺了哪些变量。适合「一次性把提示词填完整」的场景，防止漏填。
- **非严格模式（`strict=False`）**：缺失的占位符原样保留，方便「分多次填充」（比如先填固定部分，运行时再填动态部分）。

```python
try:
    render(BUILTIN_TEMPLATES["反馈分类"], {})        # 缺「反馈内容」
except MissingVariableError as e:
    print(e)                                          # 会提示缺少：反馈内容

render(BUILTIN_TEMPLATES["反馈分类"], {}, strict=False)  # 不报错，{反馈内容} 原样保留
```

## 占位符规则

- 写法：`{变量名}`，变量名可用中文、字母、数字、下划线（如 `{反馈内容}`、`{user_name}`）。
- 同一个变量名出现多次，会被同一个值统一替换。
- 想输出字面的大括号文字（暂不支持转义），就避开占位符语法即可。

## 怎么扩展成你自己的模板库

把你调好的提示词加进 `BUILTIN_TEMPLATES` 字典，键是模板名、值是带 `{变量}` 的正文：

```python
BUILTIN_TEMPLATES["邮件回复"] = "请以{语气}的语气，回复下面这封邮件：\n{邮件正文}"
```

再大一点，可以把每个模板单独存成 `.md` 文件、按场景分目录（见第 11 章的库管理建议），用脚本读取后丢给 `render` 渲染。这就是从「文档型模板库」走向「工具型模板库」的起点。
