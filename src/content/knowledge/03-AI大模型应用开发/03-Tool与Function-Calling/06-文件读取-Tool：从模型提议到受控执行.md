# Tool 与 Function Calling（06） - 文件读取 Tool：从模型提议到受控执行

> 读完后，你应能完成以下任务：
> - 绘制“Tool 与 Function Calling（06） - 文件读取 Tool：从模型提议到受控执行 / 本篇定位”的关键对象与数据流，解释“这是工具系统的第一篇，目标不是炫技，而是把“模型提出调用，后端执行工具”的边界刻进脑子里。”，并用源码位置、日志或 Trace 标注证据。
> - 为“Tool 与 Function Calling（06） - 文件读取 Tool：从模型提议到受控执行 / 核心拆解”设计正常与异常输入，验证“Tool 的本质是一个带名字、描述和参数 schema 的后端函数。”，输出首个偏差位置与回归测试结果。
> - 实现“Tool 与 Function Calling（06） - 文件读取 Tool：从模型提议到受控执行 / 工程链路”的最小代码或配置，检验“模型输出面向用户的总结。”，输出命令、结果与 Diff，并说明不适用边界。

# 一、文件读取 Tool的学习定位与边界

这是工具系统的第一篇，目标不是炫技，而是把“模型提出调用，后端执行工具”的边界刻进脑子里。

# 二、文件读取 Tool的真实应用场景

用户说“帮我总结这个项目的 README”，模型本身不能直接访问你的磁盘。
如果你把文件读取能力封装成工具，
模型就可以先判断需要读哪个文件，
再让后端执行读取，
最后基于文件内容总结。
这个过程看似简单，却已经包含 Agent 工具系统的全部骨架。

# 三、文件读取 Tool的核心对象与机制

- Tool 的本质是一个带名字、描述和参数 schema 的后端函数。模型看到 schema 后，只能生成“我想调用 read_file，参数是 path=README.md”这样的调用意图。
- 真正的文件读取永远发生在后端。后端要校验路径是否在允许目录内、文件是否存在、大小是否超过限制、内容是否能安全返回。
- 工具结果要回填给模型，作为新的上下文。模型基于观察结果继续生成总结，而不是凭空猜文件内容。

# 四、文件读取 Tool的工程链路

- 定义工具：read_file(path)。
- 把工具名、用途、参数格式传给模型。
- 模型返回工具调用意图。
- 后端校验路径和权限后读取文件。
- 把读取结果作为 tool result 放回 messages。
- 模型输出面向用户的总结。

# 五、文件读取 Tool的落地建议

- 文件工具要默认只读，先别给写入和删除能力。
- 路径参数要做规范化，避免 ../../ 逃逸到项目外。
- 大文件要截断或分页读取，防止一次塞爆上下文。

# 六、文件读取 Tool的常见故障与误区

- 让模型直接决定真实路径并无校验执行。
- 工具描述太含糊，导致模型不知道什么时候该用。
- 把文件全文无脑塞给模型，既贵又容易淹没重点。

# 七、文件读取 Tool在学习路线中的位置

28 讲 Function Calling 基础；
54 用“读文件”把它落成可执行的最小 Agent 动作。

# 八、文件读取 Tool的核心结论

> Tool Calling 的关键边界是：模型只提出调用意图，后端负责校验和执行。读文件工具也要限制目录、限制大小、记录 trace，执行结果再回填给模型。这样模型才是真的基于文件回答，而不是假装看过文件。

# 九、可运行实验：模型提议与文件执行隔离

这个离线沙盒从工具调用提议开始，不需要 Base URL、API Key 或模型名。
真实模型只负责产生同形数据；
路径解析、白名单和文件读取始终由后端代码控制。

```python runnable file=main.py title="安全 read_file Tool" description="运行允许文件、目录穿越和不存在文件三组调用提议。"
"""验证文件工具只读取工作区白名单内的虚拟文件。"""

from __future__ import annotations

from pathlib import PurePosixPath


def read_file_tool(path_value: str, files: dict[str, str]) -> str:
    """读取白名单虚拟文件；path_value 是模型提议的相对路径。"""
    # 规范化前的纯 POSIX 路径。
    requested_path = PurePosixPath(path_value)
    if requested_path.is_absolute() or ".." in requested_path.parts:
        raise PermissionError("path 必须位于工作区且不能包含目录穿越")
    # 规范后的工作区相对路径。
    normalized_path = requested_path.as_posix()
    if normalized_path not in files:
        raise FileNotFoundError(normalized_path)
    # 工具结果大小上限，防止无界进入模型上下文。
    max_characters = 200
    return files[normalized_path][:max_characters]


def execute_tool_call(tool_call: dict[str, str], files: dict[str, str]) -> str:
    """校验并执行工具提议；tool_call 包含工具名和 path 参数。"""
    if tool_call.get("name") != "read_file":
        raise ValueError("工具不在白名单")
    # 模型参数在执行前必须经过类型与空值校验。
    path_value = tool_call.get("path", "")
    if not path_value:
        raise ValueError("path 不能为空")
    return read_file_tool(path_value, files)


def main() -> None:
    """回放合法、越权和不存在文件三类工具提议。"""
    # 浏览器沙盒中的虚拟工作区文件。
    files = {"README.md": "# Demo\n这是项目说明。", "docs/design.md": "只读设计文档"}
    # 待验证的模型工具调用提议。
    tool_calls = [
        {"name": "read_file", "path": "README.md"},
        {"name": "read_file", "path": "../secret.txt"},
        {"name": "read_file", "path": "missing.md"},
    ]
    for tool_call in tool_calls:
        try:
            print(f"call={tool_call} result={execute_tool_call(tool_call, files)!r}")
        except (ValueError, PermissionError, FileNotFoundError) as error:
            print(f"call={tool_call} rejected={type(error).__name__}:{error}")


if __name__ == "__main__":
    main()
```

预期只有 `README.md` 返回内容。
`../secret.txt` 必须在读取前触发 `PermissionError`，
`missing.md` 必须保留 `FileNotFoundError`，
不能被包装成空文件成功。

# 十、真实模型实验：只生成工具提议

只有这一段需要 Base URL、API Key 和模型名。
页面通过同源安全代理调用真实模型；
输出只是待校验的工具提议，不能直接访问文件。
把模型返回的 JSON 与上一个离线沙盒的三组 `tool_calls` 对照，
重点检查工具名和 `path` 是否满足 Schema。

```typescript runnable model-sandbox file=main.ts title="真实模型生成 read_file 提议" description="调用 OpenAI 兼容模型生成工具提议；返回值仍需交给后端白名单校验。" prompt="你只能提议调用 read_file 工具。请仅输出一个 JSON 对象，格式为 {\"name\":\"read_file\",\"path\":\"README.md\"}，不要输出 Markdown，不要声称已经读取文件。"
/** 页面临时提供且不持久化的模型连接。 */
interface ModelConnection {
  /** OpenAI 兼容接口根地址。 */
  baseUrl: string
  /** 只用于当前请求的 API Key。 */
  apiKey: string
  /** 供应商实际支持的模型标识。 */
  model: string
}

/** 模型只能返回工具调用提议，执行器仍由后端实现。 */
interface ReadFileProposal {
  /** 必须命中后端工具白名单的名称。 */
  name: 'read_file'
  /** 必须经过路径规范化与工作区检查的相对路径。 */
  path: string
}

/**
 * 生成固定 Schema 的工具提议。
 * @param connection 页面临时提供的模型连接。
 * @param userRequest 用户希望 Agent 完成的任务。
 * @returns 尚未执行的 read_file 调用提议。
 */
async function proposeReadFile(
  connection: ModelConnection,
  userRequest: string
): Promise<ReadFileProposal> {
  /** 只允许模型输出调用意图的系统约束。 */
  const systemInstruction = '只输出 JSON 工具提议，不执行文件操作，也不声称看过文件。'
  /** OpenAI 兼容 Chat Completions 请求地址。 */
  const endpoint = `${connection.baseUrl.replace(/\/$/, '')}/chat/completions`
  /** 真实模型响应。 */
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${connection.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: connection.model,
      temperature: 0,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userRequest }
      ]
    })
  })
  if (!response.ok) throw new Error(`模型请求失败：HTTP ${response.status}`)
  /** 兼容接口返回的原始 JSON。 */
  const responseBody = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }
  /** 模型输出仍是不可信文本。 */
  const rawProposal = responseBody.choices?.[0]?.message?.content || ''
  /** JSON 解析结果仍需由离线执行器校验工具名和路径。 */
  const proposal = JSON.parse(rawProposal) as ReadFileProposal
  return proposal
}

export { proposeReadFile }
```

真实模型返回正确 JSON 只证明“提议阶段”符合格式。
随后仍要把同一 `path` 放入离线沙盒，
证明目录穿越、未知文件和返回大小限制由代码强制执行。

# 十一、总结

- **本篇定位**：这是工具系统的第一篇，目标不是炫技，而是把“模型提出调用，后端执行工具”的边界刻进脑子里。
- **核心拆解**：Tool 的本质是一个带名字、描述和参数 schema 的后端函数。
- **落地建议**：路径参数要做规范化，避免 ../../ 逃逸到项目外。
- **常见坑**：让模型直接决定真实路径并无校验执行。
- **复述答法**：Tool Calling 的关键边界是：模型只提出调用意图，后端负责校验和执行。
- **可运行实验：模型提议与文件执行隔离**：真实模型只负责产生同形数据；

## 参考资料

- [LangChain Agents](https://docs.langchain.com/oss/python/langchain/agents)
- [LangChain tools](https://docs.langchain.com/oss/python/langchain/tools)
- [Python pathlib](https://docs.python.org/3/library/pathlib.html)
