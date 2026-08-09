# 插件市场结构解析

> 本篇你能学到
>
> - 一个 Claude Code 插件市场由哪些文件和目录拼起来，`marketplace.json` 和 `plugin.json` 各管什么
> - 掌握 `skills / agents / references / evals` 四目录职责，能读懂真实插件 tree
> - 为后面拆解 wiki 五技能打好「地图」基础

前几篇我们一直在「用」插件，敲触发词、看它干活。但只要你想自己改一个技能、加一条规范，或者把团队的插件拆开看看里面写了啥，第一关就是：**这堆目录到底是什么结构？哪个文件是入口，哪个是配置，哪个是会被自动加载的？**

这篇就干一件事：把 `frontend-plugins` 这个真实仓库摊开，一层层讲清楚。讲完你再看任何一个 Claude Code 插件，都能秒定位。

## 先分清两个层级：市场 vs 插件

很多人一上来就懵，是因为把「市场」和「插件」当成一回事了。它们是两层：

- **市场（marketplace）**：一个仓库，下面挂着多个插件，对外是一个可被 `/plugin marketplace add` 添加的源。
- **插件（plugin）**：市场里的一个独立功能单元，能被单独安装、启用、禁用。

`frontend-plugins` 仓库根目录长这样（只保留关键部分）：

```text
frontend-plugins/                      # 这是「市场」仓库
├── .claude-plugin/
│   └── marketplace.json               # 市场清单：声明这个市场里有哪些插件
├── plugins/                           # 所有插件都放这里
│   ├── frontend-knowledge/            # 插件①：前端知识库
│   ├── d2c/                           # 插件②：设计稿转代码
│   ├── figma-to-react-semi/           # 插件③：Figma 转 React+Semi
│   ├── action-coder/                  # 插件④：约束式编码执行
│   └── p2c/                           # 插件⑤：PRD 转代码工具集
├── README.md
└── CLAUDE.md
```

记住这个分层关系：**市场根目录的 `.claude-plugin/marketplace.json` 是「目录索引」，它本身不实现任何能力**，只是告诉 Claude Code「我这儿有 5 个插件，分别在哪个文件夹」。

### marketplace.json 里有什么

这是 `frontend-plugins` 真实的市场清单节选：

```jsonc
{
  "name": "frontend-marketplace",
  "owner": {
    "name": "G7 Frontend Team",
    "email": "denglei@g7.com.cn"
  },
  "plugins": [
    {
      "name": "frontend-knowledge",
      "source": "./plugins/frontend-knowledge",   // 指向插件目录的相对路径
      "description": "前端知识库插件，提供 wiki / wiki-ingest / wiki-query / wiki-lint / wiki-save 能力",
      "version": "0.0.4",
      "category": "development-tools",
      "strict": true                                // 严格模式：字段校验更严
    }
    // ... d2c / figma-to-react-semi / action-coder / p2c 同理
  ]
}
```

关键就一个字段：`source`。它是相对市场根目录的路径，指向真正的插件文件夹。`name`、`description`、`version` 这些都是给市场列表展示用的元信息——你 `/plugin` 看到的那一行行说明，就来自这里。

## 进入插件内部：frontend-knowledge 的完整结构

挑 `frontend-knowledge` 来讲，因为它是这本小册的主角，后面整章都在拆它的五个技能。先看它真实的 tree：

```text
plugins/frontend-knowledge/
├── .claude-plugin/
│   └── plugin.json                    # 插件自己的身份证（名字/版本/作者/关键词）
├── agents/                            # 插件级子 Agent（此插件目前为空，预留）
└── skills/                            # 核心：所有技能都在这里
    ├── wiki/
    │   └── SKILL.md                   # 兜底调度技能：意图模糊时路由到下面四个
    ├── areas-init/
    │   ├── SKILL.md                   # 初始化项目级 knowledge/ 骨架
    │   └── references/                # 这个技能按需加载的规范文件
    │       ├── directory-structure.md
    │       ├── claude-md-template.md
    │       ├── frontend-detection.md
    │       ├── hot-md-spec.md
    │       ├── status-rules.md
    │       └── summary-output-format.md
    ├── wiki-ingest/
    │   ├── SKILL.md                   # 摄入外部素材，沉淀成知识页
    │   └── references/
    │       ├── output-format.md
    │       └── update-vs-create.md
    ├── wiki-query/
    │   ├── SKILL.md                   # 从知识库查询并回答
    │   └── references/
    │       ├── answer-output-format.md
    │       ├── hot-cache.md
    │       └── section-depth-control.md
    ├── wiki-save/
    │   └── SKILL.md                   # 把当前会话结论沉淀成一页
    ├── wiki-lint/
    │   └── SKILL.md                   # 知识库健康检查
    └── shared-references/             # 跨技能共享的规范，多个 SKILL 都会引用
        ├── classification-rules.md
        ├── common-constraints.md
        ├── content-rules.md
        ├── env-check-rules.md
        ├── frontmatter-rules.md
        ├── index-page-rules.md
        ├── navigation-rules.md
        ├── progress-output-rules.md
        └── splitting-rules.md
```

这张图信息量不小，下面逐层拆。

### plugin.json：插件的身份证

```jsonc
{
  "name": "frontend-knowledge",
  "version": "0.0.4",
  "description": "前端知识库插件：提供 wiki / wiki-ingest / wiki-query / wiki-lint / wiki-save 能力，支持知识沉淀、查询与巡检",
  "author": { "name": "G7 Frontend Team", "email": "zhangshikun@g7.com.cn" },
  "homepage": "https://git.chinawayltd.com/frontend/frontend-plugins",
  "license": "MIT",
  "keywords": ["wiki", "frontend-knowledge", "wiki-query", "前端", "知识库"]
}
```

> `marketplace.json` 里也有一份 `name/version/description`，和 `plugin.json` 内容高度重合。区别在于：**市场清单是「外部视角」的展示卡片，`plugin.json` 是「插件内部」的权威定义。** 安装后真正生效的身份信息以 `plugin.json` 为准，`keywords` 也影响 Claude Code 对触发词的匹配。

## 四个子目录的职责分工

每个标准插件（和每个标准 skill）最多会出现四类子目录。把这四个分清楚，你就掌握了整套约定：

| 目录 | 装什么 | 加载时机 | ✅ 该放这里 | ❌ 不该放这里 |
| --- | --- | --- | --- | --- |
| `skills/` | 技能定义，每个技能一个 `SKILL.md` | 命中触发词时加载主入口 | 工作流程、决策逻辑、触发条件 | 几千字的规范细则（应拆到 references） |
| `agents/` | 子 Agent 的提示词 | 主流程显式派活时调用 | 「figma 提取器」「视觉校验器」这类专职角色 | 主技能本身的流程逻辑 |
| `references/` | 按需加载的规范、模板、清单 | 技能执行到某步时才读 | 字段规范、输出格式、命名约定 | 触发词、技能入口逻辑 |
| `evals/` | 评估标准与测试用例 | 跑评估时使用，不参与运行 | `evals.json`、测试输入输出 | 任何会影响线上行为的逻辑 |

`frontend-knowledge` 这个插件的 `agents/` 和 `commands/` 目前是空的（预留），它的能力全在 `skills/` 里。但同一个市场里的其它插件就用满了这套约定——`d2c` 和 `action-coder` 就是好例子：

```text
plugins/action-coder/
├── .claude-plugin/plugin.json
├── skills/
│   ├── generate/
│   └── execute/
├── agents/                  # 三个专职子 Agent
│   ├── action-spec-builder.md
│   ├── module-executor.md
│   └── visual-checker.md
├── references/
│   └── action-spec-schema.md
└── evals/
    └── evals.json
```

```text
plugins/d2c/skills/design-to-code/
├── SKILL.md                 # 技能主入口
├── README.md                # 给人看的说明
├── references/              # 15 个规范文件，按需加载
├── agents/
│   └── figma-extractor.md   # 技能级子 Agent
└── evals/
    └── evals.json           # 评估标准
```

> 注意一个细节：四类子目录**既能出现在插件根级，也能出现在单个 skill 内部**。`action-coder` 的 `agents/` 在插件根（多个技能共享），`d2c` 的 `agents/` 在 `design-to-code` 这个技能内部（只服务这一个技能）。放哪一层，取决于这个子 Agent / 规范是「全插件共用」还是「单技能私有」。

## 一个 skill 的标准长相

把镜头再推近，看单个技能。以 `wiki-ingest` 为例，它的 `SKILL.md` 开头是这样的（真实内容）：

```markdown
---
name: wiki-ingest
description: "前端知识摄入技能。将外部素材（raw/ 一手资料、PRD、会议纪要、
  聊天记录文件、官方文档等）沉淀到 wiki/ 或 areas/，按字段规范生成或更新页面，
  并同步导航。触发词：整理 raw、整理这份文档、归档这份 PRD、把这份资料沉淀、
  批量 ingest、ingest 这个文件、归档到 wiki..."
allowed-tools: Read Write Edit Glob Grep Bash
---

# wiki-ingest: 摄入并沉淀前端知识
```

这里有三个一定要看懂的点：

- **`name`**：技能的唯一标识，调用时写成 `frontend-knowledge:wiki-ingest`（插件名:技能名）。
- **`description`**：不只是说明，**触发词就写在这里**。Claude Code 靠它判断「用户这句话该不该唤起这个技能」。所以你会看到描述里塞了一长串「整理 raw、归档这份 PRD…」——那都是匹配钩子。
- **`allowed-tools`**：声明这个技能允许用哪些工具。`wiki-ingest` 要读写文件、搜索，所以放了 `Read Write Edit Glob Grep Bash`。

`SKILL.md` 之下，`references/` 放的是「执行到具体步骤才需要的细则」。比如 `wiki-ingest/references/update-vs-create.md` 专门讲「什么时候该更新已有页面、什么时候新建」——这种规范没必要在技能一启动就塞进上下文，用到了再读，这就是**渐进式披露（progressive disclosure）**的设计意图：主入口保持轻，细节按需加载。

### shared-references：跨技能的公共规范

`frontend-knowledge` 多了一个别的插件没有的目录：`skills/shared-references/`。里面是 `frontmatter-rules.md`、`navigation-rules.md`、`splitting-rules.md` 这类规范。

为什么要单独抽出来？因为「字段规范」「导航同步规则」「长文档拆分规则」这些约定，`wiki-ingest`、`wiki-save`、`areas-init` 都要遵守。要是每个技能各抄一份，改一次规范就得改好几处,迟早不同步。抽到 `shared-references/`，所有技能引用同一份，**单一事实来源**。

> 这是一个特别值得偷师的工程化手法：技能之间共享的不是代码，是「规范文档」。规范也要 DRY。

## 小结

回到最开始那张分层图，现在你应该能一眼读懂任何一个 Claude Code 插件了：

- **市场层**：根目录 `.claude-plugin/marketplace.json` 是目录索引，靠 `source` 字段指向各插件文件夹，本身不实现能力。
- **插件层**：每个插件有自己的 `.claude-plugin/plugin.json` 当身份证，能力主要装在 `skills/`，可选搭配 `agents/`（子 Agent）、`references/`（按需规范）、`evals/`（评估）。
- **技能层**：每个 skill 以 `SKILL.md` 为唯一入口，`description` 里藏着触发词，`allowed-tools` 框定权限；细则下沉到 `references/`，公共规范抽到 `shared-references/`。
- **一条主线**：从市场到插件到技能，处处是「入口轻、细节按需加载」的渐进式披露思路。

地图有了，下一篇开始我们就钻进 `frontend-knowledge` 的第一个技能，看 `areas-init` 是怎么从零给一个前端仓库搭出知识库骨架的。
