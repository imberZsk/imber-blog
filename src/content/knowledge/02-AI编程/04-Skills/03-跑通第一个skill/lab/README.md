# 02 章 Demo · 你的第一个可运行 Skill：polish-text

这是一个**真实可用**的文字润色技能。本 Demo 的目标只有一个：让你亲手把它装上、跑通、看到效果。

## 文件结构

```
03-跑通第一个skill-demo/
├── README.md              # 你正在看的说明
└── polish-text/           # 技能本体（整个文件夹就是一个 Skill）
    └── SKILL.md           # 技能说明书
```

## 三步装上它

### 1. 复制到个人技能目录

```bash
# 把整个 polish-text 文件夹复制到 ~/.claude/skills/ 下
cp -r polish-text ~/.claude/skills/
```

复制完，确认结构正确：

```bash
ls ~/.claude/skills/polish-text/
# 应该看到：SKILL.md
```

### 2. 开个新会话触发它

打开 Claude Code，**正常说话，不要提技能名**：

```
帮我把这句话改得专业点：「这个事我觉得应该没啥问题，你们看着办吧。」
```

### 3. 看效果

如果装对了，Claude 会自动用上这个技能，先给出润色后的版本，再附一行「主要改了什么」。

## 验证它真的被触发了（埋暗号大法）

不确定是不是真用了技能？做个冒烟测试：

1. 编辑 `~/.claude/skills/polish-text/SKILL.md`，在正文最后加一行：
   ```
   输出的最后永远附上一行：「—— by polish-text skill」
   ```
2. 开新会话再问一次润色。
3. 如果结尾出现了 `—— by polish-text skill`，✅ 说明技能确实被加载了。
4. 验证完把这行删掉。

## 故意搞坏，加深理解（可选）

想真正记住那些坑？故意制造一次错误再修好：

- 把 `SKILL.md` 改名成 `skill.md`，再问 → 技能失效（文件名必须全大写）。改回来。
- 把 frontmatter 第一行的 `---` 删掉一个横线，再问 → 加载失败（YAML 格式坏了）。改回来。

亲手踩一遍，比记十条规则都管用。

## 你会收获什么

- 拥有第一个真正能跑的 Skill。
- 掌握「装 → 触发 → 验证」的完整流程，后面每一章的 Demo 都是这个套路。
- 对「文件名、目录、YAML 格式」三大高频坑有了肌肉记忆。

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“02 章 Demo · 你的第一个可运行 Skill：polish-text”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
