# 12 章 Demo · 团队技能库范例

演示如何把技能放进项目仓库、共享给整个团队。

## 结构

```
团队技能库示例/
└── .claude/
    └── skills/                 # 团队共享技能目录（提交进 Git）
        ├── README.md           # 团队规范 + 使用/贡献指南
        ├── code-review/
        │   └── SKILL.md
        └── weekly-report/
            └── SKILL.md
```

## 看点

1. 技能放在**项目的 `.claude/skills/` 里**，而不是个人的 `~/.claude/skills/`。区别：
   - 个人级：只有你能用，跟着你的机器走。
   - 项目级：**随仓库分发，团队所有人 `git pull` 就有了**。
2. 目录里有 `README.md` 写明团队规范——这让技能库可维护、新人能上手。
3. 每个技能依然遵循前面所有章节的原则：单一职责、规范 frontmatter、清晰 description。

## 怎么用到你的真实项目

```bash
# 在你的项目根目录下创建技能目录
mkdir -p .claude/skills

# 把技能放进去，然后提交
git add .claude/skills
git commit -m "feat: 添加团队共享技能 code-review 和 weekly-report"
```

队友 `git pull` 后，这些技能在该项目里自动可用。

## 你会收获什么

- 看懂个人级 vs 项目级的实际差异。
- 一套可直接复制到真实项目的团队技能库结构和规范。
