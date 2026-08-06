# 通用知识库全景导览

> 📌 **本篇你能学到**
> - wiki 七大分区各自的定位，每个分区一句话说清「放什么 / 不放什么」
> - 一棵完整的 wiki 目录树，建立全局空间感
> - 内容边界的判断标准 + 为什么是「按意图导航」而非「按技术分类」

前面两章我们聊了插件、技能、工作流这些「外壳」。从这一篇开始进入全书最硬的一章——通用知识库本身长什么样。

我带新人时最常被问的一句话是：「这个东西我应该写哪儿？」七个目录摆在面前，看着都像，又都不太像。这篇就是来解决这个问题的：先把七大分区的版图铺开，让你脑子里有张地图；再把「内容边界」这把尺子交给你，以后你自己就能判断该不该写、写哪去。

## 先看一眼全貌 🗺️

不绕弯子，直接上整棵树。这是团队 `frontend-knowledge` 仓库 `wiki/` 目录的真实结构（按主题分区，省略了各分区下的 `references/` 细节页）：

```text
wiki/
├── _index.md                 # 总入口，按「意图」路由到各子目录（不承载细则）
├── README.md                 # 目录说明
├── hot.md                    # 会话热缓存，加速 AI 上下文加载
│
├── foundations/              # 前端基础原则（性能、安全、隐私合规）
├── stacks/                   # 技术栈最佳实践（react / vue）
├── engineering/              # 工程工具链与流程（构建/质量/Git/测试/微前端/Monorepo/包管理/TS/CSS）
├── patterns/                 # 通用交互模式（鉴权、加载态、特性开关、渐进披露）
├── conventions/              # 团队编码约定（命名、目录、Code Review、技术债）
├── platform/                 # 平台工程横切（依赖安全、可观测性）
└── internal/                 # 公司内部系统（组件库 / 图标库 / HTTP / 埋点）
```

七个主题分区 + 三个根文件。先记住这个轮廓，下面逐个拆。

> 💡 这套结构有个反直觉的地方：它不是按「React / Vue / 工具」这种技术维度切的，而是按**你来查东西时的意图**切的。「我要定团队选型」「我要查 ESLint 配置」「我要看鉴权怎么做」——每种意图对应一个明确入口。后面你会越来越体会到这个设计的好处。

## 七大分区，一句话定位

### foundations —— 跨框架的底层原则

```text
foundations/
└── references/
    ├── performance-principles.md   # 性能原则
    ├── security-on-frontend.md     # 前端安全
    └── privacy-compliance.md       # 隐私合规
```

- ✅ **放什么**：与框架无关的硬通货。性能优化原则、前端安全防线、隐私合规要求——换成 React 还是 Vue 都成立的东西。
- ❌ **不放什么**：任何带框架色彩的实现。「React 里怎么做懒加载」属于 `stacks/react`，不属于这里。

这是地基层。判断标准很简单：**这条知识，五年后换了技术栈还成立吗？** 成立就放这。

### stacks —— 技术栈的默认选型与最佳实践

```text
stacks/
├── react/   # React 选型声明 + 组件开发流 + 最佳实践 + Router + TanStack Query + Zustand
└── vue/     # Vue 选型声明 + Pinia + 最佳实践 + 测试 + vue2/vue3
```

- ✅ **放什么**：技术栈内的**默认选型**和**团队写法约定**。比如「状态管理默认 Zustand」「数据层默认 TanStack Query」，以及这些库在团队场景下踩出来的 ✅/❌ 写法。
- ❌ **不放什么**：React/Vue 的基础 API 用法。`useState` 怎么用、`ref` 和 `reactive` 区别——这些 AI 本来就会，写进来是浪费。

这是全书重点中的重点，后面第四章会专门展开。这里你只需记住：**stacks 回答的是「我们团队默认用什么、怎么用」，而不是「这个 API 是什么」。**

### engineering —— 工具链怎么用

```text
engineering/
├── build-tools/         # Vite
├── code-quality/        # ESLint / Prettier / Husky+lint-staged / Stylelint
├── css-frameworks/      # Tailwind v3 / v4
├── git-workflow/        # 分支策略 / 提交规范 / 冲突解决 / rebase vs merge
├── micro-frontends/     # qiankun / Module Federation / 通信
├── monorepo/            # Turborepo
├── package-management/  # pnpm
├── testing/             # Vitest / 测试策略
└── typescript/          # TS 工程配置 / 常见错误
```

- ✅ **放什么**：工具链的**团队配置和用法**。构建、代码质量、Git 工作流、测试、微前端、Monorepo、包管理、TS、CSS——这些「怎么把工具用对」的知识都归这。
- ❌ **不放什么**：框架内的工具集成。

> ⚠️ engineering 和 stacks 最容易混。源仓库 `_index.md` 里写得很清楚：
> 「此处关注**工具本身怎么用**；框架内的具体集成（如 Vite 在 Vue 项目里的配置）见对应 `stacks/` 子目录。」
>
> 一句话区分：**通用的 Vite 配置 → engineering；Vue 项目专属的 Vite 集成 → stacks/vue。**

### patterns —— 通用交互模式

```text
patterns/
└── references/
    ├── authentication-and-authorization.md  # 鉴权与授权
    ├── data-loading-states.md               # 数据加载态
    ├── feature-flags-and-experiments.md     # 特性开关与实验
    └── progressive-disclosure-ux.md         # 渐进披露
```

- ✅ **放什么**：跨项目复用的**交互与数据流模式的团队实现**。鉴权流程怎么走、加载态怎么处理、特性开关怎么接。
- ❌ **不放什么**：某个业务页面的特定交互。「下单页的多步表单」是业务，去项目自己的知识库。

patterns 和 foundations 的关系是互补的：foundations 讲底层原则，patterns 讲落到场景里的常见做法。

### conventions —— 团队约定与协作规范

```text
conventions/
├── adr/                          # 架构决策记录（含团队技术选型）
└── references/
    ├── ai-collaboration.md       # AI 协作规范感知
    ├── code-review.md            # PR 规模、评论前缀
    ├── naming-components.md      # 组件命名
    ├── naming-files.md           # 文件命名风格对照
    ├── repo-structure.md         # 仓库目录约定
    ├── rules-cheatsheet.md       # 规则速查（一页聚合）
    ├── tech-debt-and-deprecation.md
    └── ...（typescript / testing / runtime-quality）
```

- ✅ **放什么**：团队层面的**协作共识**。命名约定、目录结构、Code Review 规范、技术债处理流程。
- ❌ **不放什么**：具体工具的配置细节（那是 engineering）。

> 💡 这里有个关键设计原则——**单一事实来源**。源仓库 CLAUDE.md 明确要求：
> 「`conventions/` 引用 `engineering/` 与 `foundations/` 的内容时，**只链接不复制**；源页是真相。」
>
> 也就是说 conventions 是「约定的索引」，真正的技术细节躺在 engineering / foundations。这样改一处不用满仓库找重复，避免内容漂移。

### platform —— 横切关注点

```text
platform/
└── references/
    ├── dependency-and-security.md  # 依赖与安全
    └── observability.md            # 可观测性
```

- ✅ **放什么**：跨所有项目的**平台级横切**。可观测性、发布流程衔接、依赖安全审计。
- ❌ **不放什么**：单个项目的监控接入细节。

这一层在源仓库里标了「（可选）」——不是每个团队都用得上，但一旦涉及多项目统一的运维衔接，就放这。

### internal —— 公司内部系统

```text
internal/
└── icon-library/   # 团队图标库 @gui/icon-react & @gui/icon-vue
    └── references/ # outline-icons / fill-icons / color-icons
```

- ✅ **放什么**：**只在公司内部存在**的私有资产。自研组件库、图标库、统一 HTTP 封装、埋点 SDK——外面搜不到、AI 不可能知道的东西。
- ❌ **不放什么**：开源生态里的通用库。

> 📌 internal 的价值密度最高。因为 foundations / stacks 里的东西 AI 多少懂一点，但你们公司自研的 `@gui/icon-react` 有哪些图标、HTTP 封装怎么调——这些**只有写进来 AI 才知道**。目前这一层在源仓库里还在逐步填充。

## 内容边界：这把尺子比目录更重要 ⚖️

目录是死的，判断力是活的。源仓库 CLAUDE.md 里有一段「内容边界」，我认为是整个知识库最该背下来的部分。我整理成对照表：

| 判断维度 | ✅ 放进 wiki | ❌ 不放进 wiki |
| --- | --- | --- |
| 技术选型 | 为何选 Zustand 而非 Redux（决策 + 理由） | React/Vue 基础 API 用法、官方文档内容 |
| 框架写法 | 团队踩出的 React/Vue 写法约定（带 ✅/❌） | `useEffect` 是什么、生命周期有哪些 |
| 工具配置 | 团队的 ESLint / Vite / pnpm / Turborepo 配置 | 工具官网就能查到的默认用法 |
| 编码规范 | 团队命名、目录、Code Review 约定 | 通用编程风格常识 |
| 交互模式 | 通用鉴权流程、加载态的团队实现 | 某业务页面的特定交互 |
| 业务知识 | （不属于 wiki） | 业务组件、业务流程、业务踩坑、业务架构决策 |

提炼成两条判断口诀，比记表格管用：

**第一条：AI 已经知道的，不写。** React 的 `useState`、Vue 的 `computed`、Vite 的官方配置——这些 AI 张口就来，写进来零增量价值，还增加噪音。wiki 的存在意义是补上 AI 的**知识盲区**：你们团队的**决策**和**私有资产**。

**第二条：和业务强绑的，不写。** 下单流程、风控规则、某个业务组件的实现——这些进项目自己的 `knowledge/`（用 `frontend-knowledge:areas-init` 在业务仓库内初始化），不进通用 wiki。

> 💡 一个简单的自测：把你要写的内容想象成「换一家公司还成立吗」。
> - 成立（如「团队用 pnpm workspace」）→ 大概率进 wiki
> - 不成立（如「我们的优惠券叠加规则」）→ 进项目知识库
> - 换公司、换框架都成立（如「XSS 怎么防」）→ 进 foundations

把这两条尺子用熟，那个「我应该写哪儿」的问题就基本不用问了。

## 为什么是「意图导航」而非「技术分类」

最后说说这套结构的设计哲学，理解了它你才会用得顺。

打开 `wiki/_index.md`，第一张表不是「React 在这、Vue 在那」，而是「**新项目技术选型 → 看这里**」「**已有项目质量门禁 → 看那里**」。它是从**你带着什么问题来**出发组织的。

这背后是「渐进式披露」的阅读路径。源仓库 CLAUDE.md 规定 AI 回答前按顺序读，任意一层拿到足够信息就停：

```text
1. wiki/hot.md      —— 会话热缓存（当前焦点、关键决策、常见坑）
2. wiki/_index.md   —— 按意图路由，快速定位分区
3. 分区 _index.md    —— 分组导航
4. references/*.md  —— 具体细则页
```

总目只做路由不承载细则，细则下沉到 `references/`。好处是 AI（和人）都不用一次性吞下整个知识库，按需逐层深入即可。这也是为什么每个分区目录都强制 `_index.md` + `references/` 的模式——它不是洁癖，是为了让导航始终可达。

## 小结

这一篇我们把 wiki 的版图铺开了。七个主题分区各管一摊：foundations 管跨框架原则，stacks 管技术栈选型与写法，engineering 管工具链，patterns 管交互模式，conventions 管团队约定，platform 管横切，internal 管私有资产。比记目录更重要的是两条边界口诀——「AI 已知的不写，业务强绑的不写」，wiki 只补 AI 的盲区，也就是你们团队的**决策**和**私有资产**。整套结构以意图导航为底层设计，从「你带着什么问题来」组织入口，总目只做路由、细则往下沉，保证导航始终可达。

下一篇开始，我们钻进最重的 `stacks` 分区，看看一个真正能驱动 AI 写出「团队味儿」代码的技术栈知识库长什么样。先把这张地图记牢，后面就不会迷路了。
