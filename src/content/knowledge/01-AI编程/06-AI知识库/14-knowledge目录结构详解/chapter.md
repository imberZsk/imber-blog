# knowledge 目录结构详解

> **本篇你能学到**
> - `areas-init` 跑完后，`knowledge/` 里到底长什么样（完整 tree，不靠脑补）
> - `areas/` 下各子域各管什么、为什么每个子目录只允许 `_index.md` + `references/`，散落的文件会带来什么麻烦
> - `_index.md`、`hot.md` 和 `status` 字段（draft / developing / stable）在项目知识库里的角色与用法

前三章我们一直在聊「通用知识库」（wiki），那是跨项目沉淀的公共资产。从这一章开始换轨道：**项目知识库**，也就是 `areas-init` 在你某个具体仓库根目录里生成的 `knowledge/`。

这俩最大的区别是：wiki 是「React 该怎么写」，knowledge 是「**我们这个项目**的 React 是怎么写的」。前者讲共性，后者讲个性。今天先把房子的户型图摸清楚，后面几篇才好往里搬家具。

## 先看完整目录 tree 🗂️

别信任何「五大子目录」之类的口诀，直接看 `areas-init` 的 reference 怎么定义的。这是固定骨架，跑完一定是这个样子：

```text
{repo-root}/knowledge/
├── _index.md              # 知识库入口：概述 + 导航
├── hot.md                 # 热点上下文：最常用的核心知识（必须生成）
├── areas/                 # 结构化知识（架构、业务、组件、约定、最佳实践）
│   ├── _index.md
│   ├── architecture/
│   │   ├── _index.md
│   │   └── references/   # 架构相关详细文档
│   ├── business/
│   │   ├── _index.md
│   │   └── references/   # 业务相关详细文档
│   ├── components/
│   │   ├── _index.md
│   │   └── references/   # 组件相关详细文档
│   ├── best-practices/
│   │   ├── _index.md
│   │   └── references/   # 最佳实践详细文档
│   └── conventions/
│       ├── _index.md
│       └── references/   # 约定规范详细文档
└── raw/                   # 原始素材（会议纪要、截图、导出文档等未整理内容）
    └── _index.md
```

> ⚠️ 这是**最小骨架，全部必须创建**，包括每个子域下那个空的 `references/` 目录。`areas-init` 不会因为「这个项目暂时没组件」就跳过 `components/`，它先把架子搭齐，文件按需填。

注意一个容易看走眼的点：`areas/` 下确实是五个子域，但它们叫 **architecture / business / components / best-practices / conventions**，不是网上某些文章里随口说的「architecture/business/components/conventions/pitfall」。`pitfall` 不是顶层子域，它是 `best-practices/references/` 下的一个文件（`pitfalls.md`）。这种细节错了，后面 AI 找文件就会全程踏空。

## 一条铁律：子目录里只放两样东西

整个结构里最该记住的规矩，就一句话：

> 每个子域目录下，**只允许** `_index.md` 和 `references/` 目录。所有详细内容文件统一塞进 `references/`，不许散落在子域根下。

为什么这么死板？看个对比就懂了：

| 做法 | 结果 |
| --- | --- |
| ✅ `areas/architecture/references/auth-flow.md` | `_index.md` 是稳定的导航入口，新增文档只动 `references/`，AI 永远先读 `_index.md` 再按表跳转 |
| ❌ `areas/architecture/auth-flow.md`（直接丢根下） | 子域根下文件和 `_index.md` 混在一起，导航表和实际文件容易对不上，时间一长没人知道哪个是入口 |
| ✅ 内容写在 `references/`，导航写在 `_index.md` | 「索引」和「内容」物理分离，职责清楚 |
| ❌ 把长正文直接写进 `_index.md` | `_index.md` 越来越长，既当门牌又当仓库，检索效率反而崩 |

这套约定的核心是把「导航」和「内容」彻底拆开。`_index.md` 永远是轻量的门牌，`references/` 才是真正堆内容的库房。AI 读知识库时也是这个路径：先看 `_index.md` 的表，再决定钻进哪个 `references/` 文件，不用一次把整个目录灌进上下文。

## 五个子域各管什么 🎯

子域不是随便切的，每个对应开发时一类典型问题。记住它们各自回答的那句话，就知道东西该往哪放：

| 子域 | 回答的问题 | 放什么 | 不放什么 |
| --- | --- | --- | --- |
| `architecture/` | 这项目**怎么实现**的 | 技术栈全景、请求层、认证流程、状态管理、构建部署、路由机制 | 具体业务规则、组件清单 |
| `business/` | 这项目**在做什么业务** | 业务域地图、核心流程、关键业务规则、第三方业务集成 | 技术实现细节、代码风格 |
| `components/` | 有**哪些组件、怎么复用** | 共享组件、业务组件、组件模式、组件索引 | 业务流程、架构决策 |
| `best-practices/` | 有哪些**经验、坑、推荐做法** | 常用模式、已知坑（pitfalls）、性能经验、排障经验 | 强制性约定（那是 conventions 的事） |
| `conventions/` | 项目内部**怎么约定** | 目录结构、API 约定、代码风格、Git 工作流、测试约定 | 「建议这么做」的软经验 |

`best-practices` 和 `conventions` 最容易混。一个粗暴的判据：**违反了会被 reviewer 打回的，是 convention（约定）；违反了只是「你可能踩坑」的，是 best-practice（经验）**。代码风格、API 命名进 conventions；某个第三方库的并发坑进 best-practices。

`areas-init` 不会硬塞一堆空文件进去。它按你项目实际探索到的信息量，决定生成哪些「高价值文件」，比如：

```text
areas/architecture/references/overview.md          # 技术栈全景
areas/architecture/references/auth-flow.md          # 认证流程
areas/business/references/domain-map.md             # 业务域地图
areas/best-practices/references/pitfalls.md         # 已知坑
areas/conventions/references/code-style.md          # 代码风格
```

> 💡 信息够才生成，不够就不生成。所以两个项目跑出来的 `references/` 文件清单大概率不一样，这是正常的，不是 bug。

## raw/ 是个收纳箱，不是垃圾桶 📦

`raw/` 单独拎出来说，因为它和 `areas/` 玩的规则不一样。

它存的是**没整理过的原始素材**：会议纪要、需求截图、导出文档、聊天记录。这些东西不要求遵循 frontmatter 规范和正文三层结构 —— 毕竟是原始料，强行套格式反而费劲。唯一还保留的硬约束是**文件名仍要 kebab-case**。

它的价值在于「先存下来，再慢慢整理」。后续可以用 `wiki-ingest` 技能把 `raw/` 里的内容消化、提炼，归到 `areas/` 对应子域。所以它是个**待加工区**，不是「反正不知道放哪就丢这」的垃圾桶 —— 区别在于 raw 里的东西是有计划被消化的。

## _index.md 和 hot.md：两种入口，两种用法

这俩都是「入口」，但定位完全不同，新手最容易把它们当成一回事。

**`_index.md` —— 分层导航门牌。**
每一层目录都有一个：`knowledge/_index.md` 是整个库的总入口，`areas/_index.md` 是结构化知识的入口，每个子域也各有自己的 `_index.md`。它的工作就是**用表格链接到 `references/` 下的文件**，配一段必读摘要。你可以把它理解成每层楼的楼层索引牌。

**`hot.md` —— 高频问题速查台。**
它只有一个，挂在 `knowledge/` 根下，而且**必须生成**。它不按目录组织，而是按「最常被问到的问题」组织，是个跨子域的快速通道。结构长这样：

```markdown
---
title: "高频问题速查"
type: reference
status: draft   # 初始化时通常是 draft，等补完实际问题再升 stable
---

# 高频问题速查

## 常见问题

| 问题                 | 快速解决                     | 详细说明                                              |
| -------------------- | ---------------------------- | ----------------------------------------------------- |
| Token 过期未跳转登录 | 检查 `request.ts` 响应拦截器 | [pitfalls.md#1](./areas/best-practices/pitfalls.md#1) |
| 路由跳转后状态残留   | useEffect cleanup 中清空状态 | [pitfalls.md#2](./areas/best-practices/pitfalls.md#2) |

## 核心文档导航

| 场景         | 文档                                           |
| ------------ | ---------------------------------------------- |
| 解决常见问题 | [已知坑](./areas/best-practices/pitfalls.md)   |
| 了解技术栈   | [技术栈全景](./areas/architecture/overview.md) |
```

`hot.md` 有两条心法值得抄走：

| 维度 | ✅ 推荐 | ❌ 别这么干 |
| --- | --- | --- |
| 解决方案怎么写 | 一句话点出关键，详细说明甩链接 | 把整段排障过程复制进表格 |
| 没有高频问题时 | 生成空框架，标 `status: draft`，用着用着再补 | 硬编一堆没人真问过的「常见问题」凑数 |

简单记：**`_index.md` 按结构导航，`hot.md` 按热度导航**。一个回答「这类知识在哪」，一个回答「我现在卡住了，最快怎么解」。

## status 字段：项目知识库里怎么用 🚦

每篇文档的 frontmatter 里都有个 `status`，三个取值，含义是：

| 值 | 意思 | 什么时候用 |
| --- | --- | --- |
| `draft` | 占位骨架 | 只有标题和章节结构，正文还没补 |
| `developing` | 编写中 | 有实质内容但还需补充（新建文档的默认值） |
| `stable` | 稳定可用 | 内容完整、可作团队依据 |

关键在于：**`areas-init` 初始化时会根据探索到的信息量，自动给每篇文档定 status**，不是一律给个默认值就完事。规则大致是这样：

| 信息来源 | 典型文档 | 自动定级 |
| --- | --- | --- |
| `package.json` + 目录结构完整分析 | `overview.md`、`file-structure.md` | `stable`（>70% 是实质内容） |
| 识别到关键文件 + 部分代码分析 | `auth-flow.md`、`request-layer.md` | `developing`（30-70% 实质内容） |
| 仅靠目录推断、业务需人工补 | `domain-map.md`、`core-flows.md` | `developing` |
| 只有章节骨架、无实质内容 | `pitfalls.md`、`performance.md` | `draft` |

还有几条**强制规则**，写文档时（无论 AI 还是你手动改）都得守：

> - 文档里出现「待补充 / TODO / 暂无 / 示例：」这类占位文字 → **必须** 标 `draft`
> - 有空表格、空列表、只有示例章节没实际数据 → 标 `draft`
> - 有从代码里提取的真实信息（依赖列表、文件路径、配置项、实际代码片段）→ 至少 `developing`
> - 内容完整、无占位符、能直接当参考 → 才能标 `stable`

这条很容易被忽视，但它是知识库**不烂尾**的关键。来看正反对比：

| 场景 | ✅ 正确做法 | ❌ 翻车做法 |
| --- | --- | --- |
| 文档只有骨架 | 标 `draft`，大家一眼知道别信它 | 标 `stable`，结果 AI 把空表格当权威依据用 |
| 补了一半内容 | 标 `developing`，明确写清待补部分 | 偷懒标 `stable`，下个人以为已定稿不再维护 |
| 内容齐了想定稿 | 人工确认无占位符后升 `stable` | AI 自己拍脑袋升 `stable`，没人复核 |

`status` 本质上是一份「**这篇内容能信几分**」的诚实声明。`draft` 就要真的是占位的空壳 —— 别写成正文堆满了却还挂 `draft`，那会误导读者；反过来骨架还没填就标 `stable`，则会污染 AI 的判断。`areas-init` 给出的是初始定级，**真正升到 `stable` 通常需要人工确认**，因为只有人知道这内容是不是真的「团队认可、可作依据」了。

## 小结

`knowledge/` 不是随便堆文档的文件夹，它是一套有强约束的结构：

- 固定骨架 = `_index.md` + `hot.md` + `areas/`（五子域）+ `raw/`，全部必建
- 五子域按「实现 / 业务 / 组件 / 经验 / 约定」切分，`pitfall` 是 best-practices 下的文件而非顶层目录
- 铁律：子域里只放 `_index.md` 和 `references/`，导航和内容物理隔离
- `_index.md` 按结构导航、`hot.md` 按热度速查，两种入口别混用
- `status` 是内容可信度的诚实声明，`areas-init` 给初始定级，升 `stable` 靠人工把关

把这张户型图记牢，下一篇我们就动手跑 `areas-init`，看它怎么从一个真实仓库里把这套结构生出来。
