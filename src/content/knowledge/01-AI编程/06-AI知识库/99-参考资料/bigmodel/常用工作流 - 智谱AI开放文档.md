---
title: "常用工作流 - 智谱AI开放文档"
source: "https://docs.bigmodel.cn/cn/coding-plan/learning-resources/common-workflow"
author:
published:
created: 2026-04-23
description: "介绍了日常开发中的一些实用工作流，可以根据自己的项目进行调整使用。"
tags:
  - "clippings"
---
## 理解新的代码库

- 快速获取代码库概览
- 查找相关代码

**提示：**

- 从广泛的问题开始，然后缩小到特定领域
- 询问项目中使用的编码约定和模式
- 请求项目特定术语的词汇表

## 修复 bug

**提示：**

- 告诉 Claude 重现问题的命令并获取堆栈跟踪
- 提及重现错误的任何步骤
- 让 Claude 知道错误是间歇性的还是持续的

## 重构代码

**提示：**

- 要求 Coding Agent 解释现代方法的优势
- 请求在需要时保持向后兼容性的更改
- 以小的、可测试的增量进行重构

## 使用专门的 subagents

**提示：**

- 在 `.coding agent/agents/` 中创建项目特定的 subagents 以供团队共享
- 使用描述性的 `description` 字段来启用自动委派
- 限制工具访问权限为每个 subagent 实际需要的内容

## 使用 Plan Mode 进行安全的代码分析

**Plan Mode** 是一种工作模式，它会限制 Coding Agent 只使用 **只读操作（read-only tools）** 来分析代码库，从而先制定执行计划，而不会直接修改代码。这种模式适用于 **探索代码结构、规划复杂修改或进行安全的代码审查** 等场景。

以 **Claude Code** 为例，在 Plan Mode 下，Claude 会通过 `AskUserQuestion` 工具主动向用户提问，以进一步澄清需求。在充分理解目标之后，才会生成一份具体的执行计划。

### 什么时候应该使用 Plan Mode

- **复杂功能开发** ：当一个任务涉及多个文件或多步修改时
- **代码库分析** ：在动手修改代码之前，希望先系统地理解项目结构
- **方案讨论** ：希望先与 Claude 反复确认需求和实现思路，再开始执行

### 如何使用 Plan Mode —— 以 Claude Code 为例

- 在会话中切换到 Plan Mode
- 以 Plan Mode 启动新会话
- 在 Plan Mode 中运行无头模式查询

在当前会话中，可以通过 **Shift + Tab** 在不同权限模式之间循环切换。

如果当前处于 **Normal Mode** ，按一次 **Shift + Tab** 会切换到 **Auto-Accept Mode** ，终端底部会显示： `⏵⏵ accept edits on`

再按一次 **Shift + Tab** ，即可进入 **Plan Mode** ，终端会显示： `⏸ plan mode on`

### 示例：规划复杂的重构

```shellscript
claude --permission-mode plan
```

```shellscript
I need to refactor our authentication system to use OAuth2. Create a detailed migration plan.
```

Claude Code 将分析当前实现方法并创建全面的计划。通过后续问题进行细化：

```shellscript
What about backward compatibility?
How should we handle database migration?
```

按 `Ctrl+G` 在默认文本编辑器中打开计划，您可以在 Claude 继续之前直接编辑它。

### 将 Plan Mode 配置为默认值

```shellscript
// .claude/settings.json
{
  "permissions": {
    "defaultMode": "plan"
  }
}
```

## 编写测试用例

## 创建拉取请求

可以通过直接要求 Coding Agent 创建拉取请求（“create a pr for my changes”），或逐步指导 Coding Agent：

## 处理文档

**提示：**

- 指定您想要的文档样式（JSDoc、docstrings 等）
- 请求文档中的示例
- 请求公共 API、接口和复杂逻辑的文档

## 添加图像

如果你需要在对话中提供图像，并希望 Coding Agent 帮助分析图像内容，可以按照以下步骤操作。

## 引用文件和目录

使用 `@` 快速包含文件或目录，无需等待 Coding Agent 读取它们。