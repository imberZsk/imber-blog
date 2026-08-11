# 09 Python 与 JavaScript 对比 demo

同一段 AI 脚本逻辑（清洗消息 → 检索 → 拼提示词 → 异步调模型 → 解析 JSON）的 Python 写法，每个关键处都用注释标出 JS 里对应怎么写。拿前端经验一行行对照着读。

## 运行

```bash
python3 main.py
```

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

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“09 Python 与 JavaScript 对比 demo”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。
