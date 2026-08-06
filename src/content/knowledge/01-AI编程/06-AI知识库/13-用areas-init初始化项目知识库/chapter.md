# 用 areas-init 初始化项目知识库

> **本篇你能学到**
> - `areas-init` 是知识库的「打地基」工：在业务仓库根目录念触发词（如「帮我初始化知识库」）即可唤起；必须在业务仓库根目录跑，跑在 `frontend-knowledge` 或子目录会读错对象、污染通用库
> - full / supplement 两种模式：首次运行全量生成 `knowledge/` 骨架（`_index.md`、`hot.md`、五个 `areas` 子域和 `raw/`），已有 `knowledge/` 则只补缺失文件、不覆盖已有内容
> - CLAUDE.md 会被自动追加「项目知识库」章节，以 `@knowledge/` 引用知识库文件；此后 AI 在该项目对话时会顺着引用读对应文档，知识库与 AI 上下文就此打通

前三章我们一直在聊**通用知识库**——那些跨项目复用的前端经验、踩坑记录。但你肯定有这种体感：通用知识再全，也救不了「我这个项目的登录鉴权到底走的哪条流程」「这个 `useRequest` 封装是谁加的拦截器」这种**项目专属**的问题。

这一章开始,我们把视角拉回到**单个业务仓库**。第一站就是 `areas-init`——把一个空白项目,变成 AI 能读懂的知识库。

## 一句话定位:它是知识库的「打地基」工

`areas-init` 干的事极其单纯:

> 在**当前前端项目仓库的根目录**,生成一套 `knowledge/` 项目级知识库骨架,并顺手把引用写进 `CLAUDE.md`。

注意几个关键词:**当前**、**前端项目**、**根目录**、**骨架**。每一个都是坑位,后面会逐个拆。

它的触发词很口语化,下面这些话术 Claude 都能识别并唤起这个技能:

- 「帮我**初始化知识库**」
- 「给这个项目**建知识库**」
- 「**沉淀项目知识**」
- 「**生成 knowledge 目录**」
- 「**搭知识库结构**」

你不用记命令,把上面任意一句话甩给 Claude,在对的目录下,它就开工了。

## ⚠️ 最大的坑:只在业务仓库跑,别在 frontend-knowledge 仓库跑

这是新人最容易翻车的地方,单独拎出来说。

`areas-init` 的产物是「**项目级**知识库」,它要去读你项目的 `package.json`、扫你的 `src/`、分析你的技术栈,然后在**你的项目根目录**下生成 `knowledge/`。

| 场景 | 做法 |
| --- | --- |
| ✅ 在业务仓库 `my-react-app/` 根目录调用 | 正确,会扫到你的真实技术栈并生成对应知识库 |
| ❌ 在 `frontend-knowledge` 通用知识库仓库里调用 | 跑错对象,会把项目级骨架塞进通用库,污染通用知识 |
| ❌ 在子目录(比如 `src/`)里调用 | 探索范围错位,生成位置和判定都会乱 |

> **记住这条线**:`frontend-knowledge` 仓库是「通用知识 + 技能本体」的家,你**不在那里跑业务技能**。`areas-init` 是给**业务仓库**用的,去你真正要写代码的那个项目根目录里念触发词。

## 它先要确认「你是不是前端」

不是所有仓库都配拥有 `knowledge/`。`areas-init` 第一步就会做**前端判定**,这是内置规则,不用你操心,但你得知道它的脾气。

**命中信号**(满足任一即判为前端):

- `package.json` 依赖里有 `react` / `vue` / `angular` / `svelte` / `next` / `nuxt` / `@tarojs/taro` / `uni-app` / `react-native` / `electron` 等框架,或 `vite` / `webpack` / `rollup` 等构建工具
- 存在 `vite.config.*` / `next.config.*` / `tailwind.config.*` 等前端特征配置
- 有 `src/` 或 `pages/` 或 `app/` 目录,且内含 `.tsx` / `.vue` / `.svelte` / `.jsx` 文件

**排除信号**(优先级更高,命中就出局):

- `package.json` 的 `name` / `description` 明确标注 backend / server / api-only
- 根目录有 `go.mod` / `pom.xml` / `Cargo.toml` 且没有 `package.json`
- 只有 `tsconfig.json` + 纯 Node 后端依赖(express / fastify / koa),没有任何前端框架

判定有三种结局:

| 判定结果 | 动作 |
| --- | --- |
| ✅ 确认前端 | 继续后面 4 步 |
| ❌ 确认非前端 | **立即终止,一个文件都不生成** |
| ⚠️ 无法确定 | 暂停,反问你确认后再继续 |

所以如果你在一个纯后端仓库里念「初始化知识库」,它不会硬生成一堆没用的目录,而是直接告诉你「这不是前端项目,终止流程」。这点挺省心的。

## 5 步执行流程

技能内部是固定的 5 步流水线,每一步都有标记位往下传,职责清晰、互不干扰:

| 步骤 | 名称 | 主要产出 |
| --- | --- | --- |
| Step 1 | 探索仓库 | 项目信息 + 前端判定(非前端则终止) |
| Step 2 | 判定生成模式 | `mode = full \| supplement` + 已存在文件清单 |
| Step 3 | 生成骨架 | `knowledge/` 目录树与文档 |
| Step 4 | 检查并更新 CLAUDE.md | `claude_md = updated \| already_present \| missing` |
| Step 5 | 输出总结 | 完整度报告 + 下一步建议 |

重点说两个容易被忽略的设计:

**Step 2 的 full / supplement**——这是「重复跑不会炸」的关键:

- 仓库里**没有** `knowledge/` → `mode = full`,全量生成
- 仓库里**已有** `knowledge/` → `mode = supplement`,**补齐模式:只补缺失的文件,绝不覆盖你已经写好的正文**

> 这意味着你可以放心地在一个已经有知识库的项目里再跑一次 `areas-init`,它只会把你缺的那几个文件补上,你之前手写的内容一个字都不会丢。

**Step 4 的软降级**——CLAUDE.md 是 `knowledge/` 的**可选下游入口**,不是前置依赖,三种情况都不会回滚已生成的骨架:

| 情况 | 处理 | 标记位 |
| --- | --- | --- |
| 没有 CLAUDE.md | 不创建,只在总结里附可粘贴模板 | `missing` |
| 有 CLAUDE.md 但没引用 knowledge/ | 追加「项目知识库」章节 | `updated` |
| 有 CLAUDE.md 且已引用 | 啥也不动 | `already_present` |

判定「是否已引用」的标准很简单:在 CLAUDE.md 里搜到 `@knowledge/` 或 `knowledge/_index.md` 任一字符串,就算已包含。

## 跟着做:在一个 React 项目里跑一遍

假设你有个项目叫 `acme-dashboard`,技术栈是 React + Vite + TypeScript。下面是完整实录。

**第一步,确认你站对地方:**

```bash
# 确认在业务仓库根目录,不是在 frontend-knowledge 仓库
pwd
# /Users/you/work/acme-dashboard   ← 对的,业务仓库根目录

# 确认有 package.json,且能看到前端依赖
ls package.json vite.config.ts
```

**第二步,念触发词。** 在这个目录打开 Claude Code,直接说:

```text
帮我初始化项目知识库
```

接下来你会看到技能一步步往下走,终端里是带颜色的进度输出:

```text
[areas-init Step 1] 探索项目结构与技术栈...
[areas-init] ✔ 前端项目确认（React + Vite）
[areas-init Step 2] ✓ knowledge/ 不存在,将全量生成
[areas-init Step 3] ✓ 创建 knowledge/_index.md  ...（骨架文件依次生成）
[areas-init Step 4] ✓ 已在 CLAUDE.md 中添加知识库引用
[areas-init Step 5] ✓ 项目知识库初始化完成
```

五步走完，每步都有 ✓ 确认，非前端项目会在 Step 1 直接终止。

**第三步,看产物。** 跑完之后,你的项目根目录多了这么一棵树:

```text
acme-dashboard/knowledge/
├── _index.md              # 知识库入口:概述 + 导航
├── hot.md                 # 热点上下文:最常用的核心知识(必须生成)
├── areas/                 # 结构化知识
│   ├── _index.md
│   ├── architecture/      # 回答「这项目怎么实现的」
│   │   ├── _index.md
│   │   └── references/
│   ├── business/          # 回答「这项目在做什么业务」
│   │   ├── _index.md
│   │   └── references/
│   ├── components/        # 回答「有哪些组件、怎么复用」
│   │   ├── _index.md
│   │   └── references/
│   ├── best-practices/    # 回答「有哪些经验、坑和推荐做法」
│   │   ├── _index.md
│   │   └── references/
│   └── conventions/       # 回答「项目内部怎么约定」
│       ├── _index.md
│       └── references/
└── raw/                   # 原始素材:会议纪要、截图、导出文档
    └── _index.md
```

这是**最小骨架,五个 areas 子域必须全部建好**。每个子域下只有 `_index.md`(负责导航)和 `references/`(放详细文档),内容文件不许散落在子域根下。

如果 Step 1 探索到的信息够多,它还会**顺手生成高价值文件**塞进对应的 `references/`,比如:

| 目录 | 可能生成的文件 |
| --- | --- |
| `areas/architecture/references/` | `overview.md`(技术栈全景)、`request-layer.md`(请求层) |
| `areas/business/references/` | `domain-map.md`(业务域地图) |
| `areas/conventions/references/` | `file-structure.md`(目录约定)、`code-style.md` |

注意这些文件的 `status` 是**动态判定**的——能从 `package.json` 和目录结构完整提取的(比如 `overview.md`)标 `stable`;有框架但业务细节要人工补的标 `developing`;只有空模板的标 `draft`。这个分级直接影响你下一步该先补哪个。

**第四步,看总结报告。** Step 5 会给你一张完整度概览表:

```markdown
## 📊 知识完整度概览

| 状态          | 数量 | 说明                       |
| ------------- | ---- | -------------------------- |
| ✅ Stable     | 2    | 知识完整,可直接使用       |
| 🚧 Developing | 3    | 有基础框架,需补充部分内容 |
| 📝 Draft      | 6    | 仅模板框架,需填入实际内容 |
```

外加按优先级分组的「建议下一步」,告诉你先补 `hot.md` 里 2-3 个高频问题,再补 `domain-map.md` 的业务流程,等等。这些建议是**基于你项目的真实信息**给的,不是套话。

## CLAUDE.md 被改了啥

这是最有「魔法感」的一步。Step 4 会在你的 `CLAUDE.md` 里追加一段「项目知识库」章节,核心是用 `@knowledge/path/to/file.md` 语法**引用**知识库文件(注意是引用,不复制正文,保持单一数据源):

```markdown
## 项目知识库

本项目的架构、业务、组件、约定和最佳实践文档位于 `knowledge/` 目录。

### 快速入口

- **高频问题速查**:`@knowledge/hot.md` — 最常见问题的快速解决方案
- **知识库索引**:`@knowledge/_index.md` — 完整的知识库导航
- **原始素材**:`knowledge/raw/` — 会议纪要、截图等未整理素材

### 开发规范

- **代码风格**:`@knowledge/areas/conventions/references/code-style.md`
- **目录结构**:`@knowledge/areas/conventions/references/file-structure.md`

遇到项目相关问题时,优先查阅 `knowledge/` 中的文档。
```

写进去之后,意义很大:**以后你在这个项目里跟 Claude 对话,它会自动顺着这些 `@` 引用去读对应文档**。你问「这个项目的请求层怎么处理错误重试」,它会直接翻 `@knowledge/areas/architecture/references/request-layer.md`,而不是凭空猜。知识库从此和 AI 的工作上下文打通了。

> 如果你的项目**还没有 CLAUDE.md**,技能不会自作主张创建,而是把模板片段附在总结末尾,提示你:Claude Code 用户可以先 `/init` 生成 CLAUDE.md 再粘贴;Cursor / Cline 用户可以合并到 `.cursorrules` / `AGENTS.md` 等等价载体里。

## 小结

`areas-init` 是项目知识库的「开工第一锤」:在**业务仓库根目录**念一句「初始化知识库」,它就帮你探仓库、判前端、定模式、生骨架、改 CLAUDE.md,五步走完,你就有了一套结构规整、和 AI 上下文打通的项目级知识库。

几条带走就行的要点:

- ✅ **只在业务仓库根目录跑**,别在 `frontend-knowledge` 通用库或子目录里跑
- ✅ 非前端项目会被**前端判定**直接劝退,不会生成垃圾文件
- ✅ `supplement` 模式让你**重复跑也不丢手写内容**,放心多跑
- ✅ CLAUDE.md 的 `@knowledge/` 引用是知识库和 AI 打通的关键开关

骨架建好只是起点——里面大量文件还是 `draft` 状态的空模板。下一篇我们就聊怎么往这副骨架里**填血肉**:用 `wiki-ingest` 把会议纪要、聊天记录这些原始素材,整理沉淀进对应的 areas 子域。
