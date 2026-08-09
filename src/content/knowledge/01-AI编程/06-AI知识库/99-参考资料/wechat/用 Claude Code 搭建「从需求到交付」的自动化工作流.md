---
title: "用 Claude Code 搭建「从需求到交付」的自动化工作流"
source: "https://mp.weixin.qq.com/s/IZbjurGve49WO72-RrVmWQ"
author:
  - "[[AI探路者]]"
published:
created: 2026-04-26
description: "feature-dev 规划特性，ralph-loop 长时间执行，这才是 AI 编程的完全体。"
tags:
  - "clippings"
---
*2026年3月10日 08:12*

## feature-dev 规划特性，ralph-loop 长时间执行，这才是 AI 编程的完全体

如果你已经在用 Claude Code 写代码，有两个插件能帮你改变工程效率和交付质量的，你应该充分利用一下。两个插件分别是：一个是会帮你把整个 Feature 拆成 7 个阶段、从需求到 Review 全程带着你走的 `/feature-dev` ；另一个是能在本地长时间死磕一个任务、反复尝试直到满足完成条件的 `/ralph-loop` 。把这俩组合起来，你等于给自己配了一个「负责规划的 Tech Lead」和一个「不知疲倦的执行工程师」，而且都住在你的终端里。

下面这篇文章，就用程序员能直接照抄的方式，讲清楚五件事：这两个插件各自是什么、单独解决什么问题、怎么用、为什么要结合，以及「今天就能在真实项目里跑起来」的组合方案和代码示例。

---

## 先认人：feature-dev 和 ralph-loop 各是谁

### feature-dev：能跑完 7 个阶段的「特性级工作流」

![七步工作流](https://mmbiz.qpic.cn/sz_mmbiz_jpg/5EZ1TshXkh5xhicwB5Lke6qEMicFDwepYn04p371t3NHkodPwbTujvDhIZq3UhhFgMhPUibLlVgrG4NrRxgyXKdXA/640?wx_fmt=jpeg&from=appmsg&tp=webp&wxfrom=5&wx_lazy=1#imgIndex=0)

七步工作流

`feature-dev` 是 Claude Code 的官方插件之一，核心命令就是：

```
> /feature-dev:feature-dev 增加电子机票的功能
```

安装步骤：

```
> /plugin marketplace add anthropics/claude-code 
  ⎿  Successfully added marketplace: claude-code-plugins
> /plugin install feature-dev 
  ⎿  ✓ Installed feature-dev. Restart Claude Code to load new plugins.
```

它做的事情不是「帮你写几段代码」，而是围绕一个 Feature 跑完整的 7 个阶段工作流：

1. Discovery：先确认你到底想做什么，而不是听到「加个缓存」就开写。
2. Codebase Exploration：起几个 `code-explorer` Agent 帮你读代码，梳理关键文件和调用链。
3. Clarifying Questions：把边界条件、错误处理、兼容性这些模糊点挖出来，让你回答清楚。
4. Architecture Design：起 `code-architect` 出几套方案，对比优缺点，帮你选一个落地的。
5. Implementation：按选定方案写代码，遵守现有风格和实践。
6. Quality Review：起 3 个 `code-reviewer` 从简洁性、正确性、规范抽象几个维度给你做 Review。
7. Summary：产出一份面向未来维护者的总结，写清楚改了啥、为啥这么改、下一步干嘛。

简单说：它把一个资深工程师「该做但经常被时间压缩掉」的那些步骤，都产品化成了流程。

### ralph-loop：能一直「自我循环」直到做完为止的执行引擎

![ralph-loop工作流](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)

ralph-loop工作流

`ralph-wiggum` 插件的核心命令是：

```
/ralph-loop "<任务描述>" --max-iterations N --completion-promise "完成短语"
```

它干的事，就是把「Ralph is a bash loop」这件事，变成一个有护栏的官方插件：

```
# 原始 Ralph 技法的精神内核
while :; do cat PROMPT.md | claude ; done
```

官方插件帮你做了几件事：

- 拦截 Claude 想「结束会话」的行为（Stop hook），把同一份任务 prompt 再喂回去。
- 每一轮循环，Claude 都会看到上一次改动后的文件和 git 历史，等于是「带记忆」地反复迭代。
- 你可以设 `--max-iterations` 和 `--completion-promise` ，控制最长跑多久、什么算完成。

典型用法示例：

```
/ralph-loop "Migrate all tests from Jest to Vitest" \
  --max-iterations 50 \
  --completion-promise "All tests migrated"
```

它就会一直迁移、跑测试、修错误、再跑，再迁移……直到输出那句「All tests migrated」或者到 50 轮上限。

---

## 单点能力：各自解决了哪些痛点

### feature-dev 解决的是：特性级工程质量失控

现实里的常见问题：

- 需求模糊，边界条件全靠脑补。
- 新人接手老项目完全不知道从哪看起。
- 架构设计全靠拍脑袋，方案没有系统对比。
- 写完代码匆匆过一眼，没时间做像样的 Review 和总结。

`/feature-dev` 的价值点在于：

- 强迫你在一开始把需求和问题问清楚。
- 帮你系统性读代码库，输出关键文件、调用路径，而不是你一个目录一个目录瞎翻。
- 多方案架构对比 + 带理由的推荐，减少「没想过其它可能」的遗憾。
- 内置多视角自动 Code Review + Summary，让每个 Feature 自带一份「mini 设计文档」。

### ralph-loop 解决的是：AI 一次性输出不靠谱、没人帮你死磕到「真的完成」

常见痛点：

- 一次 prompt 出来的代码，80% 情况下没法一把过，需要自己来回试错和补丁。
- 你没精力一直陪着 AI 改——它跑一次，你看一眼、改一眼，很累。
- 有些任务本质就是「重复尝试直到成功」（测试全绿、迁移完、覆盖率达标），非常适合机器干。

`/ralph-loop` 的价值点在于：

- 把「失败 –> 继续尝试」这个循环自动化了，人不用每一轮都手动点一下。
- 每一轮都会看新代码和 git 历史，相当于「记住上次哪错了」，再继续改。
- 搭配 `--max-iterations` 和「卡住就写 BLOCKERS/ATTEMPTS/ALTERNATIVES」这种模式，可以在安全边界内最大化尝试空间。

---

## 各自怎么用：从安装到命令示例

### feature-dev：一条命令带你跑完 7 阶段

前提：你已经装好了 Claude Code，并且项目是一个 Git 仓库。 `feature-dev` 插件在官方插件集中已经提供，一般新版 Claude Code 默认就带，或者在插件配置里启用即可。

典型用法：

```
> /feature-dev:feature-dev 增加电子机票的功能
```

在流程中你会看到类似这样的交互：

- Phase 1（Discovery）时问你：
	```
	- Which OAuth providers? (Google, GitHub, custom?)
	- Replace existing auth or add alongside?
	- How should failures be handled?
	```
- Phase 2（Codebase Exploration）给你列重点文件：
	```
	现在让我深入探索现有代码库，了解预订和航班功能的实现模式。我将启动多个代理来全面分析代码库。
	⏺ Task(探索预订流程实现)
	⎿  Done (25 tool uses · 47.2k tokens · 5m 4s)     
	⏺ Task(分析PDF生成和邮件功能)
	⎿  Done (12 tool uses · 36.0k tokens · 6m 16s)   
	⏺ Task(分析移动端响应式设计模式)
	⎿  Done (16 tool uses · 46.8k tokens · 1m 37s)
	```
- Phase 3（Clarify Issues）澄清问题：
	```
	发现的现状
	1. 已有基础：预订系统完整，有预订参考号、乘客信息、航班详情
	2. UI已准备：预订详情页面有"下载电子客票"和"发送至邮箱"按钮（占位）
	3. 邮件系统：已有基础的邮件发送功能（目前只支持纯文本）
	4. 缺失部分：PDF生成、二维码生成、电子票实体
	需要澄清的问题
	1. 电子票的格式和内容
	- 电子票是否应该包含所有乘客的信息，还是每个乘客一张票？
	- PDF电子票的版式是否有特殊要求（如航空公司Logo、条码、座位图等）？
	- 是否需要支持多语言（中英文）？
	```
- Phase 4（Architecture Design）时抛出多套方案：
	```
	⏺ Plan(设计最小改动方案)
	⎿  Done (9 tool uses · 33.5k tokens · 58s)       
	⏺ Plan(设计干净架构方案)
	⎿  Done (11 tool uses · 37.0k tokens · 50m 52s)   
	⏺ Plan(设计实用平衡方案)
	⎿  Done (11 tool uses · 35.8k tokens · 1h 10m 5s)                 
	⏺ 架构设计总结
	我已经为您设计了三种不同的电子机票实现方案：
	1. 最小改动方案 (推荐)
	特点：
	- 新增ElectronicTicket实体，与现有Booking和Passenger关联
	- 使用成熟的iText和ZXing库
	- 最小化对现有代码的修改
	- 在预订确认后自动生成电子机票
	```

往后就是 Implementation、自动 Review 和 Summary。

### ralph-loop：一条命令启动「自我循环工作线程」

典型可用命令：

```
/ralph-loop "<prompt>" --max-iterations N
/ralph-loop "<prompt>" --max-iterations N --completion-promise "exact text"
/cancel-ralph
```

例如迁移测试框架：

```
/ralph-loop "Migrate all tests from Jest to Vitest" \
  --max-iterations 50 \
  --completion-promise "All tests migrated"
```

它会：跑一次迁移 → 跑测试 → 失败 → 继续改 → 再跑……直到测试都过了，自己打印那句「All tests migrated」，或者顶到 50 轮上限。

---

## 为什么要把两者结合：一个会「想清楚」，一个会「干到真完成」

单用 feature-dev 的问题是：

- 它非常擅长「想清楚」「拆步骤」「设计架构」「做 Review」，但实现阶段一般还是偏单轮对话，你要不断手动催它改、补测试、再跑一遍。
- 对那种需要大量机械迭代的任务（覆盖率打满、性能调优、批量迁移），它没打算无限陪你死磕。

单用 ralph-loop 的问题是：

- 它会很认真地「照着 prompt 里写的方向」硬干，但如果这个 prompt 一开始就没想清楚，或者缺乏良好的架构蓝图，那就是在「很努力地往错误方向迭代」。
- Prompt 写不好，就会出现循环跑了几十轮，代码堆了一地，但整体结构很混乱，甚至反复乱动不该动的模块。

所以最自然的分工是：

- 让 feature-dev 负责：
- 理解需求
	- 读代码库
	- 设计架构和组件拆分
	- 把实现步骤和质量标准（测试、文档、边界条件）显式写出来
- 让 ralph-loop 负责：
- 在这个蓝图之下，长时间反复实现、跑测试、修 Bug
	- 把某些子目标死磕到「真的完成」，而不是「大概差不多」

一句话总结：feature-dev 解决的是「做对的事」，ralph-loop 解决的是「把事做对」。

---

## 组合玩法一：用 feature-dev 产出「高质量任务书」，交给 ralph-loop 长时间执行

这是最推荐、也是你今天就能跑起来的一种模式。

### 第一步：用 /feature-dev 跑完一个 Feature 的 7 阶段

以「给 API 加限流」为例：

```
/feature-dev Add rate limiting to API endpoints
```

跑完之后，你大概会拿到这些内容（简化示例）：

- 需求澄清：
- 对哪些 endpoint 限流？
	- 以 IP、用户、API key 为维度？
	- 超限返回什么错误码 / body？
- 架构设计（Approach 1/2/3 + 推荐一个）：
- 新建 `RateLimiter` 服务
	- 在 HTTP 中间件里插入
	- 复用现有 Redis 连接 / metrics 系统
- 实施计划 / TODO：
- 新建 `src/rate-limiting/RateLimiter.ts`
	- 修改 `src/middleware/requestPipeline.ts`
	- 添加单元 & 集成测试
	- 更新文档

你可以在最后让 Claude 把这些写进仓库里的几个文件，比如：

- `docs/rate-limiting/DESIGN.md`
- `docs/rate-limiting/IMPLEMENTATION_PLAN.md`
- `docs/rate-limiting/QUALITY_CRITERIA.md`

### 第二步：把这些信息，转成一个 Ralph 任务

接下来在同一个项目 worktree 的分支上，起一个循环：

```
/ralph-loop
"
你正在为该服务实现“API 速率限制（API rate limiting）”功能。
在进行任何更改之前：
阅读并遵循 docs/rate-limiting/DESIGN.md

阅读 docs/rate-limiting/IMPLEMENTATION_PLAN.md

不要更改高层架构，除非测试或约束迫使你这么做。
如果你认为必须更改设计，请先更新 DESIGN.md 并给出理由，然后再进行重构。
总体完成标准：
以下所有阶段都已实现
所有测试通过（速率限制的单元测试 + 集成测试）
文档已更新（README + API 文档）
代码已根据现有项目约定完成评审并清理
在最后，输出完全一致的内容：FEATURE_RATE_LIMITING_COMPLETE

阶段：
阶段 1：核心速率限制器
基于 DESIGN.md 实现 RateLimiter 服务
支持按端点与按 API key 的配额
为 RateLimiter 添加单元测试，覆盖率 > 80%

阶段 2：中间件集成
将速率限制中间件添加到 HTTP 调用栈中的选定端点
确保在超出限制时返回正确的错误响应
添加集成测试，以验证限额与重置行为

阶段 3：配置与可观测性
将配置接入现有配置系统
使用现有指标基础设施添加基础指标（当前用量、拒绝次数）
为配置错误场景添加测试或检查

阶段 4：完善与文档
重构并清理任何重复代码
更新 README / API 文档以解释速率限制行为
运行完整测试套件并确保全部为绿色
如果在 40 次迭代之后该功能仍未完成：
创建 BLOCKERS.md，描述阻碍进展的因素
创建 ATTEMPTS.md，列出已尝试的方法
创建 ALTERNATIVES.md，提出不同的方案
当一切完成后，输出：FEATURE_RATE_LIMITING_COMPLETE
"
--completion-promise
"FEATURE_RATE_LIMITING_COMPLETE"
--max-iterations 40
```

这里所有「Phase」「完成标准」其实都来自刚才 `/feature-dev` 的输出，你只是帮它转成了 Ralph 喜欢的格式而已。

接下来，Ralph 就会：

- 读 DESIGN.md / IMPLEMENTATION\_PLAN.md。
- 按 Phase 1/2/3/4 去实现和调整。
- 不断跑测试、修 Bug、再跑。
- 最后在仓库里留下代码 + 文档 + 几个记录文件（BLOCKERS / ATTEMPTS / ALTERNATIVES）。

---

## 组合玩法二：feature-dev 管方向，ralph-loop 专门负责「打磨测试和细节」

另一个实用模式是：

- 让 `/feature-dev` 把主干代码写完、架构搭好。
- 某些特别费时的阶段，交给 `/ralph-loop` 。

比如，feature-dev 已经帮你实现了 OAuth 登录功能，但单测覆盖率只有 50%，你想要冲到 85% 以上。

可以这样：

1. 让 feature-dev 给出一份「应该覆盖哪些场景」的建议，写进 `docs/auth/TEST_PLAN.md` 。
2. 在分支上起一个专门的 Ralph 循环：
```
/ralph-loop
"
你唯一的任务：提高 OAuth 认证功能的测试覆盖率。
在更改之前：

阅读 docs/auth/TEST_PLAN.md
阅读 tests/auth/ 中现有的测试

完成标准：
src/auth/ 的测试覆盖率 > 85%
仓库中的所有测试全部通过
不引入新的不稳定性（flakiness）
最后，更新 TESTING_NOTES.md，包含：
现在已覆盖哪些场景
仍然存在的任何已知缺口

流程：
查看当前覆盖率报告
识别缺失的边界情况（多个提供方、令牌过期、错误路径、CSRF 保护）
增量添加测试，并频繁运行测试套件
修复测试暴露出的任何 bug
在合适时重构测试，以提升可读性与可维护性
完成后，输出：OAUTH_TESTS_COMPLETE
"
--completion-promise
"OAUTH_TESTS_COMPLETE"
--max-iterations 25
```

feature-dev 给方向和 test plan，ralph-loop 负责「把测试打满」，中间你只需要偶尔看一眼它是不是偏题了。

---

## 实战建议：团队里落地时要注意什么

- 永远在 feature 分支上跑 `/ralph-loop` ，不要在 main 上开自动循环。
- `--max-iterations` 必须写， `--completion-promise` 只当辅助手段，不要当唯一退出条件。
- 每隔一段时间，用 `/feature-dev` 针对当前改动再跑一轮「Code Review + Summary」，等于给 Ralph 的成果做一次「资深工程师复盘」。
- 把 DESIGN.md / IMPLEMENTATION\_PLAN.md / RALPH\_TASK.md / BLOCKERS.md 这几个文件纳入 PR 审查材料，让 Reviewer 快速理解「这次 AI 干了什么」「卡在哪」「尝试过什么」。
- 在团队工程规范里写清楚：
- 什么类型的 Feature 要走 feature-dev 全流程。
	- 什么类型的任务可以交给 ralph-loop 打磨（测试、迁移、重构等）。

长期看，这套组合不是在「让 AI 替你写代码」，而是在「把资深工程师的工作流模式固化下来，然后让 AI 去稳定执行」。你真正要做的是设计好这条流水线，而不是每一行代码都自己写。

---

继续滑动看下一个

Matrix001

向上滑动看下一个