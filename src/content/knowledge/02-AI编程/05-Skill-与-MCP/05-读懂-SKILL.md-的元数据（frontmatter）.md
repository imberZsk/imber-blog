# Skill 与 MCP（05） - 读懂 SKILL.md 的元数据（frontmatter）

> 本章目标：把 `SKILL.md` 开头那段被 `---` 包起来的元数据讲清楚——哪些必填、哪些可选、各自怎么写。学完你会拿到一份字段速查表。

# 一、frontmatter 是什么

每个 `SKILL.md` 的最开头，都有一段被两行 `---` 夹住的内容：

```markdown
---
name: code-review
description: 当用户需要审查代码质量、查找 bug 时使用。
---

# 这里开始是正文……
```

这段就叫 **frontmatter（前置元数据）**，用的是 **YAML** 格式。它的角色是「**目录卡片**」：Claude 平时只扫这张卡片，来决定「这个技能要不要加载」。正文则要等技能真被选中后才读。

所以记住一个关键差异：

> **frontmatter 永远在「待命扫描」阶段就被读取；正文只有技能被触发后才加载。**

这也意味着：frontmatter 要**短而精**，因为所有技能的 frontmatter 都常驻在 Claude 的「待选清单」里，太长就是公共开销。

# 二、两个核心字段

绝大多数技能，frontmatter 只需要这两个字段：

## 2.1 `name`（必填）

技能的唯一标识。规则：

- 用**小写字母 + 连字符**（kebab-case），如 `code-review`、`pdf-report`。
- 不要用空格、大写、中文。
- **强烈建议和文件夹名一致**，省得自己混乱。

```yaml
name: code-review        # ✅ 好
name: CodeReview         # ❌ 不要用大写驼峰
name: 代码审查            # ❌ 不要用中文
name: code review        # ❌ 不要用空格
```

## 2.2 `description`（必填，且最重要）

一句话说明「这个技能**在什么场景下**该被用」。它是触发开关，重要到我们专门用第 05 章来讲怎么写。这里先记住三个要点：

- **用第三人称、描述场景**：「当用户需要……时使用」。
- **写清楚触发的关键词和场景**，别只写技能名。
- 别太长，一两句话讲清「干什么 + 什么时候用」即可。

```yaml
# ✅ 好：说清了场景和触发词
description: 当用户需要审查代码质量、查找 bug、检查安全漏洞时使用。

# ❌ 差：太干，Claude 不知道啥时候该用
description: 代码审查工具
```

# 三、可能遇到的其它可选字段

不同版本/平台支持的可选字段略有差异，常见的有这几类（**用到再查，不必背**）：

| 字段 | 作用 | 说明 |
|------|------|------|
| `license` | 标明许可证 | 分享给他人时有用 |
| `allowed-tools` | 限制技能能用的工具 | 用于收紧权限、提升安全性 |
| `metadata` | 附加元信息 | 版本号、作者等自定义信息 |

> ⚠️ 提示：可选字段的具体支持情况会随版本变化。拿不准时，**只写 `name` + `description` 这两个必填项最稳**，其余等明确需要时再加。

# 四、字段速查表

| 字段 | 必填? | 格式 | 一句话记忆 |
|------|-------|------|-----------|
| `name` | ✅ | 小写+连字符 | 技能的身份证，和文件夹同名 |
| `description` | ✅ | 一两句话，讲场景 | 触发开关，决定「啥时候用它」 |
| 其它可选字段 | ❌ | 视字段而定 | 用到再查，别瞎加 |

# 五、常见错误

- **❌ YAML 缩进/格式坏了**：`description:` 后面忘了空格、或值里有特殊字符（如冒号 `:`）没加引号。
  ```yaml
  description: 工具：用于审查   # ❌ 值里的冒号可能让 YAML 解析出错
  description: "工具：用于审查"  # ✅ 有歧义时用引号包起来最保险
  ```
- **❌ `---` 不成对或写错**：开头结尾必须各是**恰好三个**横线、单独成行。
- **❌ `name` 用了中文或空格**：会导致识别异常。
- **❌ 把正文内容写进了 frontmatter**：frontmatter 只放元数据键值对，操作步骤是正文的事。
- **❌ 乱加没用的字段**：写一堆模型不认识的字段，徒增噪音甚至报错。

# 六、最佳实践

- **能省则省**：新手只写 `name` + `description`，先跑通。
- **`name` 与文件夹同名**：减少心智负担。
- **值里有特殊字符就加引号**：尤其是中文冒号、英文冒号、`#` 等，用双引号包住最安全。
- **改完 frontmatter 必测触发**：它直接决定技能能否被加载，改完一定用「埋暗号」法验证一下。

# 七、总结

- frontmatter = `SKILL.md` 开头被 `---` 夹住的 YAML 元数据，是常驻待命的「目录卡片」。
- 真正必填的只有两个：**`name`（身份证）** 和 **`description`（触发开关）**。
- 其它字段都是可选的，**用到再查，拿不准就别加**。
- 最容易翻车的是 YAML 格式：`---` 成对、冒号后加空格、特殊字符加引号。

> 👉 下一章：`description` 太重要了，它直接决定技能会不会被用上。我们专门花一章讲「怎么写出高触发率的 description」。

<!-- knowledge-lab-merged -->

# 动手实践：04 章 Demo · frontmatter 好坏对照

这个 Demo 给你两份 `SKILL.md`：一份 frontmatter 写得规范，一份满是新手常犯的错。对照着看，你就记住了。

## 文件

```
05-元数据frontmatter-demo/
├── README.md
├── good-SKILL.md        # ✅ 规范的 frontmatter
└── bad-SKILL.md         # ❌ 故意写错，找找有几处问题
```

## 玩法

1. 先**不看答案**，打开 `bad-SKILL.md`，自己找出里面的格式错误（至少有 4 处）。
2. 再对照 `good-SKILL.md`，看自己找全了没。
3. 答案和讲解在本文件最下方。

## bad-SKILL.md 的 4 个坑（看完再展开核对）

<details>
<summary>点开看答案</summary>

1. **`name` 用了大写和空格**：`Code Review` → 应为 `code-review`。
2. **`description` 后缺空格**：`description:当用户……` → 冒号后要有空格。
3. **值里的中文冒号没加引号**：`代码审查：查找bug` 里的 `：` 可能让 YAML 解析异常 → 用双引号包住。
4. **结尾 `---` 写成了两个横线** `--` → 必须是恰好三个横线，否则 frontmatter 不闭合，整个技能加载失败。

</details>

## 你会收获什么

- 一眼认出 frontmatter 的常见格式错误。
- 养成「改完 frontmatter 就检查 `---` 成对、冒号带空格」的肌肉记忆。

<!-- knowledge-practice-materials-merged -->

## 配套实践材料

以下材料已并入正文，便于阅读时直接对照和练习。

### `bad-SKILL.md`

````markdown
---
name: Code Review
description:代码审查：查找bug
--

# 代码审查

这份 frontmatter 故意埋了 4 个错误，对照 README 找找看。
（提示：name、冒号后的空格、值里的中文冒号、结尾的横线数量。）
````

### `good-SKILL.md`

````markdown
---
name: code-review
description: 当用户需要审查代码质量、查找 bug、检查安全漏洞或代码规范问题时使用。
---

# 代码审查

这是一份 frontmatter 规范的示例：
- name 用小写加连字符，且与文件夹同名
- description 用第三人称描述场景，讲清「什么时候该用」
- 三个横线成对闭合，冒号后有空格

（正文从这里开始……）
````

## 参考资料

- [Agent Skills 规范](https://agentskills.io/specification)
- [MCP 规范](https://modelcontextprotocol.io/specification/latest)
