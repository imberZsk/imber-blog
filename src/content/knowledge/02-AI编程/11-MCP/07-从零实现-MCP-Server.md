# MCP（07） - 从零实现 MCP Server

> 读完后，你应能完成以下任务：
> - 绘制“MCP（07） - 从零实现 MCP Server / 主题拆解：从零实现 MCP Server的关键机制”的关键对象与数据流，解释“Tool handler 只接收通过 Schema 的参数。”，并用源码位置、日志或 Trace 标注证据。
> - 为“MCP（07） - 从零实现 MCP Server / 核心机制：输入、状态、输出和失败”设计正常与异常输入，验证“从零实现 MCP Server判断 1：先把“从零实现 MCP Server”写成输入、处理状态、输出和失败信号四部分，避免只停留在名词解释。”，输出首个偏差位置与回归测试结果。
> - 实现“MCP（07） - 从零实现 MCP Server / 最小实践：实现并检查一个 MCP Server”的最小代码或配置，检验“前者返回截断文本，后者必须被拒绝；”，输出命令、结果与 Diff，并说明不适用边界。

<!-- article-progressive-block:start -->
# 一、先建立全局：从零实现 MCP Server 是什么？

理解“从零实现 MCP Server”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。

“从零实现 MCP Server”的第一个核心判断是：Tool handler 只接收通过 Schema 的参数。。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。

| 顺序 | 章节 | 读完本节应抓住的结论 |
| --- | --- | --- |
| 1 | 主题拆解：从零实现 MCP Server的关键机制 | Tool handler 只接收通过 Schema 的参数。 |
| 2 | 核心机制：输入、状态、输出和失败 | 从零实现 MCP Server判断 1：先把“从零实现 MCP Server”写成输入、处理状态、输出和失败信号四部分，避免只停留在名词解释。 |
| 3 | 最小实践：实现并检查一个 MCP Server | 前者返回截断文本，后者必须被拒绝； |
| 4 | 从零实现 MCP Server | 从零实现 MCP Server：Server 启动后先响应 initialize，再公开能力清单； |
| 5 | 从零实现 MCP Server判断 2 | 从零实现 MCP Server判断 2：实现时围绕“Client、Server、能力清单、Schema 与传输”建立确定性契约，模型只负责需要推理的部分。 |
| 6 | 从零实现 MCP Server判断 3 | 从零实现 MCP Server判断 3：最终用“经过授权和校验的 Tool、Resource 或 Prompt 结果”验收，并保存足够证据供复现和回滚。 |

## 1.1 核心对象之间怎样衔接

```mermaid
flowchart LR
  S1["主题拆解：从零实现 MCP Server的关键机制"] --> S2
  S2["核心机制：输入、状态、输出和失败"] --> S3
  S3["最小实践：实现并检查一个 MCP Server"] --> S4
  S4["从零实现 MCP Server"] --> S5
  S5["从零实现 MCP Server判断 2"]
```

这张图只表达本文的讲解顺序，不替代正文机制。判断“从零实现 MCP Server”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。

## 1.2 再看失败：问题最早会出现在哪一步？

在“从零实现 MCP Server”的对象和顺序已经明确后，再看可观察的失败：文本直通执行、状态不可重放或重试重复写入。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。
<!-- article-progressive-block:end -->

# 二、主题拆解：从零实现 MCP Server的关键机制

- **从零实现 MCP Server**：Server 启动后先响应 initialize，再公开能力清单；Tool handler 只接收通过 Schema 的参数。
- **从零实现 MCP Server**：业务凭据保留在 Server 端，返回值限制大小并移除密钥和内部堆栈。
- **从零实现 MCP Server**：连接先完成 initialize 和能力协商，再进行 Tool、Resource 或 Prompt 的发现与调用。
- **从零实现 MCP Server**：Tool 输入由 JSON Schema 描述，但宿主仍要做身份、资源级权限和业务不变量校验。
- **从零实现 MCP Server**：stdio 连接绑定本地子进程；远程 Streamable HTTP 需要认证、会话、超时和网络边界。

# 三、核心机制：输入、状态、输出和失败


- **从零实现 MCP Server判断 1**：先把“从零实现 MCP Server”写成输入、处理状态、输出和失败信号四部分，避免只停留在名词解释。
- **从零实现 MCP Server判断 2**：实现时围绕“Client、Server、能力清单、Schema 与传输”建立确定性契约，模型只负责需要推理的部分。
- **从零实现 MCP Server判断 3**：最终用“经过授权和校验的 Tool、Resource 或 Prompt 结果”验收，并保存足够证据供复现和回滚。

# 四、最小实践：实现并检查一个 MCP Server

环境：Python 3.10+。
安装 `python -m pip install "mcp[cli]>=2,
<3"`，
保存为 `server.py`，
再运行 `mcp dev server.py` 打开 MCP Inspector。

```python
from pathlib import Path

from mcp.server import MCPServer


# 保存 MCP Server 实例和对外显示名称。
mcp = MCPServer("repository-tools")
# 保存工具允许读取的演示工作区。
WORKSPACE = Path.cwd().resolve()


@mcp.tool()
def read_text(relative_path: str) -> dict[str, str]:
    """读取工作区内的 UTF-8 文本；relative_path 是相对工作区的路径。"""
    # 保存经过规范化的候选文件路径。
    candidate_path = (WORKSPACE / relative_path).resolve()
    if WORKSPACE not in candidate_path.parents or not candidate_path.is_file():
        raise ValueError("path is outside workspace or not a file")
    return {"path": relative_path, "content": candidate_path.read_text(encoding="utf8")[:4000]}
```

在 Inspector 中先执行 `tools/list`，
再用合法文件和 `../secret.txt` 各调用一次。
前者返回截断文本，后者必须被拒绝；
这同时验证能力发现、Schema 和目录权限。

<!-- article-progressive-block:start -->
# 五、动手验证：先跑通 从零实现 MCP Server，再改变一个变量

前面的章节已经建立问题、概念和机制。现在把“从零实现 MCP Server”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。

## 5.1 基线与候选只允许一个变量不同

验证“从零实现 MCP Server”时，先固定工具 Schema、身份、畸形参数、超时和重复请求。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。

执行“从零实现 MCP Server”时，动作是：回放决策到执行链路，覆盖失败、重试、暂停和恢复。原始结果不能只保留截图或汇总分数，必须同步保存：模型提议、校验、授权、幂等键、状态迁移、Trace，使下一次复查可以在同一输入上重放。

| 实验要素 | 本文要求 |
| --- | --- |
| 固定条件 | 工具 Schema、身份、畸形参数、超时和重复请求 |
| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |
| 原始证据 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 通过阈值 | 模型只提议；执行受代码约束；失败不重复副作用 |
| 立即停止 | 文本直通执行、状态不可重放或重试重复写入 |

## 5.2 执行前先排除不可比较条件

“从零实现 MCP Server”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。

- 基线能够在“从零实现 MCP Server”的当前环境重复运行。
- 候选只改变一个与“从零实现 MCP Server”结论直接相关的条件。
- “从零实现 MCP Server”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。
- “从零实现 MCP Server”的原始输出和失败现场不会被重试、格式化或汇总覆盖。

## 5.3 执行后先核对证据完整性

结果出来后先检查证据，再讨论“从零实现 MCP Server”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。

| 检查项 | 当前文章的判定 |
| --- | --- |
| 输入可追溯 | 工具 Schema、身份、畸形参数、超时和重复请求 |
| 过程可回放 | 回放决策到执行链路，覆盖失败、重试、暂停和恢复 |
| 结果可审计 | 模型提议、校验、授权、幂等键、状态迁移、Trace |

“从零实现 MCP Server”的一次合格基线对照按以下顺序执行：

1. 保存“从零实现 MCP Server”基线版本及输入摘要，确认基线本身可以重复运行。
2. 写下“从零实现 MCP Server”候选方案唯一变化的变量，以及它预期影响的指标。
3. 在同一环境执行“从零实现 MCP Server”：回放决策到执行链路，覆盖失败、重试、暂停和恢复。
4. 为“从零实现 MCP Server”保存：模型提议、校验、授权、幂等键、状态迁移、Trace。
5. 使用“从零实现 MCP Server”预登记条件判断：模型只提议；执行受代码约束；失败不重复副作用。
6. 如果“从零实现 MCP Server”未通过，不修改第二个变量，先恢复基线并保留失败现场。

# 六、用一张矩阵验证 从零实现 MCP Server 的关键结论

矩阵按正文顺序列出“从零实现 MCP Server”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。

| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |
| --- | --- | --- | --- |
| 主题拆解：从零实现 MCP Server的关键机制 | Tool handler 只接收通过 Schema 的参数。 | 只改变与“主题拆解：从零实现 MCP Server的关键机制”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 核心机制：输入、状态、输出和失败 | 从零实现 MCP Server判断 1：先把“从零实现 MCP Server”写成输入、处理状态、输出和失败信号四部分，避免只停留在名词解释。 | 只改变与“核心机制：输入、状态、输出和失败”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 最小实践：实现并检查一个 MCP Server | 前者返回截断文本，后者必须被拒绝； | 只改变与“最小实践：实现并检查一个 MCP Server”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 从零实现 MCP Server | 从零实现 MCP Server：Server 启动后先响应 initialize，再公开能力清单； | 只改变与“从零实现 MCP Server”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 从零实现 MCP Server判断 2 | 从零实现 MCP Server判断 2：实现时围绕“Client、Server、能力清单、Schema 与传输”建立确定性契约，模型只负责需要推理的部分。 | 只改变与“从零实现 MCP Server判断 2”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 从零实现 MCP Server判断 3 | 从零实现 MCP Server判断 3：最终用“经过授权和校验的 Tool、Resource 或 Prompt 结果”验收，并保存足够证据供复现和回滚。 | 只改变与“从零实现 MCP Server判断 3”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |

## 6.1 记录本次实际实验

下面的记录用于“从零实现 MCP Server”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。

```yaml
topic: "从零实现 MCP Server"
selected_chapter: required
claim_from_article: required
baseline_version: required
changed_condition: exactly_one
execution: "回放决策到执行链路，覆盖失败、重试、暂停和恢复"
evidence: "模型提议、校验、授权、幂等键、状态迁移、Trace"
pass_when: "模型只提议；执行受代码约束；失败不重复副作用"
stop_when: "文本直通执行、状态不可重放或重试重复写入"
observed_result: required
first_deviation: null_or_evidence
recovery_replay: required_after_failure
```

## 6.2 边界实验必须证明能够停止和恢复

成功路径只能证明“从零实现 MCP Server”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：文本直通执行、状态不可重放或重试重复写入，并观察系统是否在产生不可逆副作用前停止。

| 场景 | 只改变什么 | 应保存什么 | 通过标准 |
| --- | --- | --- | --- |
| 正常路径 | 使用已知有效输入 | 模型提议、校验、授权、幂等键、状态迁移、Trace | 模型只提议；执行受代码约束；失败不重复副作用 |
| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |
| 明确失败 | 注入：文本直通执行、状态不可重放或重试重复写入 | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |
| 恢复重放 | 执行：关闭副作用入口，恢复检查点，补充失败契约测试 | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |

恢复动作不是简单重启。对于“从零实现 MCP Server”，第一步是：关闭副作用入口，恢复检查点，补充失败契约测试。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。

“从零实现 MCP Server”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。

# 七、从零实现 MCP Server 的结果解释

解释“从零实现 MCP Server”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。

| 观察结果 | 可以支持的判断 | 下一步 |
| --- | --- | --- |
| 主链路没有达到预期 | 文本直通执行、状态不可重放或重试重复写入 | 先执行：关闭副作用入口，恢复检查点，补充失败契约测试 |
| 异常链路无法恢复 | 文本直通执行、状态不可重放或重试重复写入 | 先执行：关闭副作用入口，恢复检查点，补充失败契约测试 |
| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |
| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |

“从零实现 MCP Server”只有同时满足“模型只提议；执行受代码约束；失败不重复副作用”，并且没有出现“文本直通执行、状态不可重放或重试重复写入”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。

如果“从零实现 MCP Server”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。

“从零实现 MCP Server”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。

# 八、从零实现 MCP Server 的发布判断

发布判断需要把“从零实现 MCP Server”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。

- [ ] “从零实现 MCP Server”的基线与候选只存在一个计划内变量。
- [ ] “从零实现 MCP Server”的输入、代码、依赖、配置和数据版本可以追溯。
- [ ] “从零实现 MCP Server”的正常、临界、失败和恢复样本使用同一套断言。
- [ ] “从零实现 MCP Server”的原始输出、中间状态和失败现场已经保留。
- [ ] “从零实现 MCP Server”的日志、Trace、截图和测试数据已经脱敏。
- [ ] “从零实现 MCP Server”的停止条件、负责人和回滚入口已经演练。
- [ ] “从零实现 MCP Server”尚未覆盖的输入、权限、容量和外部依赖已经登记。

最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“从零实现 MCP Server”的判断，就不能发布。
<!-- article-progressive-block:end -->

# 九、总结

- **主题拆解：从零实现 MCP Server的关键机制**：Tool handler 只接收通过 Schema 的参数。
- **核心机制：输入、状态、输出和失败**：从零实现 MCP Server判断 1：先把“从零实现 MCP Server”写成输入、处理状态、输出和失败信号四部分，避免只停留在名词解释。

- **验证方式**：从零实现 MCP Server判断 3：最终用“经过授权和校验的 Tool、Resource 或 Prompt 结果”验收，并保存足够证据供复现和回滚。
- **实现机制**：从零实现 MCP Server判断 2：实现时围绕“Client、Server、能力清单、Schema 与传输”建立确定性契约，模型只负责需要推理的部分。

## 参考资料

- [MCP Specification](https://modelcontextprotocol.io/specification/latest)
- [MCP Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
