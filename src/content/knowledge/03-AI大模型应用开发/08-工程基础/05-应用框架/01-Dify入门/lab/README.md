# 33 Dify 入门 demo

用纯 Python 标准库模拟 Dify 工作流（Workflow）的节点串联，让你看清平台拖拽的每个节点底下在做什么。

## 运行

```bash
python3 main.py
```

零依赖，纯标准库，离线可跑。

## 预期输出

```
=== 场景 1：问报销（知识库命中）===
用户：报销发票几天内提交？
  [节点] start_node     -> hit=None answer=—
  [节点] knowledge_node -> hit=True answer=—
  [节点] llm_node       -> hit=True answer=已生成
  [节点] end_node       -> hit=True answer=已生成
输出：根据《报销制度.md》：员工报销需在消费后 7 天内提交发票，超过 30 天不予受理。

=== 场景 2：问年假（知识库没有，拒答）===
用户：年假有几天？
  [节点] start_node     -> hit=None answer=—
  [节点] knowledge_node -> hit=False answer=—
  [节点] llm_node       -> hit=False answer=已生成
  [节点] end_node       -> hit=False answer=已生成
输出：抱歉，知识库里没有相关资料，无法回答。
```

同一条工作流，问能命中的走「检索 → 基于资料回答」，问不能命中的走「拒答」。这就是 Dify 画布上一条连线两个走向的本质。

## 代码 ↔ 概念对应

| Dify 概念 | 在 main.py 哪里 |
|---|---|
| 开始节点（接收输入变量） | `start_node` |
| 知识库节点（检索 topK） | `knowledge_node` |
| LLM 节点（Prompt + 模型） | `llm_node` |
| 结束节点（输出变量） | `end_node` |
| 画布上的节点连线 | `run_workflow`（节点共享 state 依次加工） |
| 检索为空时拒答 | `llm_node` 里 `if not state["hit"]` 分支 |

## 真实 Dify 怎么用

这个 demo 是「代码版的最小 Dify」，帮你理解原理。真实使用时：

1. 浏览器打开 Dify（云端 cloud.dify.ai 或自建 Docker 部署）。
2. 新建应用，选「工作流」类型。
3. 在画布上拖出「开始 → 知识检索 → LLM → 结束」四个节点并连线，等价于本 demo 的 `workflow` 列表。
4. 知识库节点里上传文档，Dify 自动切 chunk + embedding（对应 `KNOWLEDGE_BASE`）。
5. LLM 节点里写 Prompt，用 `{{#context#}}` 引用上游检索结果（对应 `llm_node` 拼装回答）。
6. 发布后得到一个 API endpoint，前端用 HTTP 调用即可。

平台帮你省掉了切分、向量化、检索这些代码，但每个节点对应的原理就是本 demo 这些函数。

## 动手改

- 给 `KNOWLEDGE_BASE` 加一篇文档，看检索节点能不能命中。
- 把命中阈值 `best_score >= 3` 调高，观察更多问题落到拒答分支。
- 在 `workflow` 列表里插入一个「问题分类」节点，体会节点串联的可组合性。

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“33 Dify 入门 demo”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
