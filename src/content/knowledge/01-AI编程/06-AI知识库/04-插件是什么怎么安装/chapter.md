# 插件是什么，怎么安装

> **本篇你能学到**
> - 插件的本质：为什么是纯 Markdown + JSON，没有 `package.json` 也没有构建步骤
> - `plugin.json` 和 `marketplace.json` 各管什么
> - 跟着做：从零把团队插件市场接入 Claude Code，并踩住常见坑

前一篇我们聊了知识库体系的整体设计思路。这一篇落到地上：你要真正把团队沉淀的能力装进自己的 Claude Code。很多人第一次听到「插件」会下意识想到 VS Code 插件市场那种东西——下载、编译、重启。但 Claude Code 的插件玩法不太一样，理解了它的本质，安装这件事就变得非常轻。

## 插件不是程序，是一沓「说明书」

先纠正一个直觉。

你装一个 ESLint 插件，背后是 JS 代码在跑；你装一个 Webpack loader，背后有逻辑在执行。Claude Code 的插件不是这个路子。它的核心载体是 **Markdown + JSON**，本质是一沓写给 AI 看的「说明书」——告诉模型遇到什么场景该走什么流程、调用哪些子 Agent、参考哪些规范。

这一点在我们团队的 `frontend-plugins` 仓库 `README` 里写得很直白：

> 本仓库为纯文档型项目（Markdown + JSON），无需构建。将插件安装到 Claude Code 后，通过对应的 Skill 名称触发即可。

所以「安装」对你来说不是 `npm install` 那种把代码拉下来编译，而是**让 Claude Code 知道去哪读这沓说明书**。这是理解后面所有操作的关键。

| | 传统 IDE 插件 | Claude Code 插件 |
|---|---|---|
| 载体 | ✅ 编译后的可执行代码 | ✅ Markdown + JSON 文档 |
| 安装动作 | ❌ 下载 → 编译 → 重启 | ✅ 注册市场 → 启用，即时生效 |
| 运行方式 | ❌ 进程里跑逻辑 | ✅ 模型读文档后按流程执行 |
| 改一处逻辑 | ❌ 改代码 → 重新打包 | ✅ 改 Markdown 文字即可 |

> 💡 一句话记住：**插件 = 教 AI 干活的工作流文档集**。你能读懂的 Markdown，就是它能执行的「程序」。

## 一个插件市场长什么样

我们团队的能力不是散装的，而是打包成一个**插件市场（marketplace）**。`frontend-plugins` 这个仓库本身就是一个市场，里面挂着好几个插件：

```text
frontend-plugins/
├── .claude-plugin/
│   └── marketplace.json          # 市场注册表：声明这个市场里有哪些插件
├── plugins/
│   ├── frontend-knowledge/       # 前端知识库插件（本小册主角）
│   ├── d2c/                      # 设计稿转代码
│   ├── figma-to-react-semi/      # Figma → React + Semi
│   ├── action-coder/             # AI 驱动编码
│   └── p2c/                      # PRD 转代码
└── knowledge-base/               # 跨插件共享的知识素材
```

注意层级：**市场（marketplace）→ 多个插件（plugin）→ 每个插件里的多个技能（skill）**。这三层关系搞清楚，下面两个 JSON 文件就好懂了。

### `marketplace.json`：市场的目录牌

它在仓库根目录的 `.claude-plugin/` 下，作用是**告诉 Claude Code 这个市场里都有哪些插件、各自在哪个目录**。截取一段真实内容：

```jsonc
{
  "name": "frontend-marketplace",        // 市场名，安装时要用它
  "owner": { "name": "G7 Frontend Team", "email": "..." },
  "plugins": [
    {
      "name": "frontend-knowledge",      // 插件名
      "source": "./plugins/frontend-knowledge",  // 插件在仓库里的相对路径
      "description": "前端知识库插件，提供 wiki / wiki-ingest / wiki-query / wiki-lint / wiki-save 能力",
      "version": "0.0.4",
      "category": "development-tools",
      "keywords": ["frontend", "wiki", "知识库", "..."]
    }
    // ... d2c / figma-to-react-semi / action-coder / p2c
  ]
}
```

`source` 那个相对路径很关键——它就是市场和插件之间的「指针」。Claude Code 读到这里，就知道 `frontend-knowledge` 这个插件的真身在 `./plugins/frontend-knowledge` 目录。

### `plugin.json`：单个插件的身份证

每个插件目录下也有自己的 `.claude-plugin/plugin.json`，描述**这一个插件**的元信息。看 `frontend-knowledge` 的：

```jsonc
{
  "name": "frontend-knowledge",
  "version": "0.0.4",                    // 版本号，升级能力时要同步往上加
  "description": "前端知识库插件：提供 wiki / wiki-ingest / wiki-query / wiki-lint / wiki-save 能力，支持知识沉淀、查询与巡检",
  "author": { "name": "G7 Frontend Team", "email": "..." },
  "license": "MIT",
  "keywords": ["wiki", "frontend-knowledge", "wiki-query", "前端", "知识库"]
}
```

三个字段值得单独说：

- **`version`**：纯文档项目也要管版本。能力升级（比如新增了一个技能）就往上加，方便团队对齐「我装的是不是最新的」。
- **`description`**：一句话讲清这个插件能干嘛。它会出现在 Claude Code 的插件列表里，是别人决定装不装的第一印象。
- **`keywords`**：检索关键词。写全中英文（你看上面既有 `wiki` 又有 `知识库`），别人模糊搜索时才命中得到。

> ⚠️ `marketplace.json` 里那份插件信息和插件自己的 `plugin.json` 容易写不一致（比如版本号一个 `0.0.4` 一个还停在 `0.0.2`）。团队约定是**两边保持同步**，否则用户在市场里看到的和实际装到的对不上，排查起来很费神。

## 跟着做：把团队插件市场接进来

理解了结构，安装就三步走。下面以接入 `frontend-knowledge` 为例。

### 第 1 步：拿到市场仓库地址

我们的市场就是 `frontend-plugins` 这个 Git 仓库：

```text
git@git.chinawayltd.com:frontend/frontend-plugins.git
```

你不需要手动 `git clone` 再去配什么路径——Claude Code 的插件管理本身就能接管一个市场来源（Git 仓库或本地目录）。

> ⚠️ 这是公司内网 GitLab 地址，先确认你的 SSH key 已经加到 GitLab、能正常拉到代码。第一次接入失败十有八九是网络或权限，不是插件本身的问题。

### 第 2 步：把市场注册到 Claude Code

在 Claude Code 里通过插件管理入口添加这个市场来源。Claude Code 提供了 `/plugin` 相关的交互式管理面板，进去后选择「添加 marketplace」，把上面的仓库地址填进去即可。

> ⚠️ **命令以官方文档为准**。Claude Code 的插件管理入口和子命令在不同版本里可能有差异，请以你本机 `/help` 看到的 `/plugin` 用法、或 Claude Code 官方文档为准，不要照搬网上某个版本的命令。这里我们只描述**通用流程**：`定位插件管理入口 → 添加市场来源（仓库地址）→ Claude Code 读取该仓库的 marketplace.json`。

添加成功后，Claude Code 会去读这个仓库根目录的 `.claude-plugin/marketplace.json`，把里面列的 5 个插件全部识别出来，展示在可安装列表里。**这一步只是「认识」了市场，还没启用任何插件。**

### 第 3 步：启用你要用的插件

在插件列表里找到 `frontend-knowledge`，启用它。启用后，它带的几个技能就可用了：

```text
frontend-knowledge 插件包含的技能：
  areas-init     # 初始化知识区域
  wiki           # 知识库主入口
  wiki-ingest    # 知识录入/沉淀
  wiki-query     # 知识查询
  wiki-lint      # 知识巡检
  wiki-save      # 知识保存
```

> 💡 你不必把市场里 5 个插件全开。按需启用——只想用知识库就只开 `frontend-knowledge`，要做设计稿转代码再去开 `d2c`。开得越少，模型上下文越干净，触发越准。

### 第 4 步：验证装上了

启用后，在对话里用自然语言触发对应技能（比如「帮我查一下知识库里关于 xxx 的内容」），或直接调用技能名。如果 Claude Code 能识别并走进 `wiki-query` 的流程，就说明装好了。

> ⚠️ 如果触发不到，先别怀疑插件坏了，按这个顺序自查：① 市场是否真的添加成功（列表里能看到这 5 个插件吗）；② `frontend-knowledge` 是否处于「已启用」状态；③ 仓库是不是最新的——别人更新了技能你没同步，行为会对不上。

## 为什么这种设计对前端团队特别友好

收个尾，讲讲我自己用下来的体感。

最爽的是**改动成本极低**。传统插件你想调一句逻辑得改代码、跑构建、发版本；这里你想优化一个工作流，直接改对应技能的 `SKILL.md` 文字、提个 commit，团队同步仓库就生效了。知识和流程的迭代速度，第一次跟「改文档」一样快。

其次是**可读可审**。`plugin.json`、`marketplace.json`、`SKILL.md` 全是纯文本，谁都能在 GitLab 上 Review。一个新人想知道某个技能到底干啥，不用读源码，读 Markdown 就行。这对「让团队知识透明流动」这件事，价值很大。

## 小结

这一篇我们把「插件」这个词拆开了看：

- Claude Code 插件的本质是 **教 AI 干活的 Markdown + JSON 文档集**，不是要编译运行的代码，所以「安装」≈「让 Claude Code 知道去哪读文档」。
- 组织结构是三层：**市场 → 插件 → 技能**。`marketplace.json` 是市场目录牌（声明有哪些插件、在哪个目录），`plugin.json` 是单个插件的身份证（`version` / `description` / `keywords`）。
- 我们团队的 `frontend-plugins` 是**纯文档型市场**，无需构建，改文字即生效。
- 安装四步走：**拿仓库地址 → 注册市场 → 启用插件 → 验证触发**。具体命令以本机 `/plugin`、`/help` 和官方文档为准，别照搬网上旧版本。

下一篇，我们正式钻进 `frontend-knowledge` 这个插件内部，看看它那几个 `wiki` 系列技能到底是怎么协作，把团队知识一步步沉淀、查询出来的。
