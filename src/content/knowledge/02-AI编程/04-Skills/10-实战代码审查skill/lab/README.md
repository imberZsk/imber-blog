# 09 章 Demo · 完整实战：code-review 技能

前八章的知识全用上的综合项目。一个能扫、能查、能给结构化报告的代码审查技能。

## 结构

```
code-review/
├── SKILL.md                    # 入口：流程串起脚本和清单
├── reference/
│   └── checklist.md            # 审查维度清单（安全/正确性/规范/测试）
└── scripts/
    ├── scan.py                 # 机械扫描器（找密钥、SQL拼接、eval、空catch）
    └── sample-bad-code.py      # 故意埋雷的示例代码，供演示
```

## 先单独跑扫描脚本

```bash
cd code-review
python3 scripts/scan.py scripts/sample-bad-code.py
```

预期扫出 5 条线索：硬编码密钥、token 串、SQL 拼接、eval、空 catch。

> 注意脚本只给「线索」不下结论——正则会误报（比如同一行密钥被两条规则各命中一次）。**最终判断交给 Claude**，这正是第 08 章「脚本给线索、Claude 做判断」的体现。

## 装上完整体验

```bash
cp -r code-review ~/.claude/skills/
```

开新会话：

```
帮我审查下这个文件的代码：<sample-bad-code.py 的绝对路径>
```

技能会被触发 → 跑扫描脚本拿线索 → 对照清单逐维度审查 → 输出带严重等级的问题表格 → 给总体评价。

## 这个技能用全了前八章

| 知识点 | 体现在哪 |
|--------|---------|
| 单一职责（01） | 只做审查，不改代码 |
| 目录结构（03） | SKILL.md + reference/ + scripts/ |
| 规范 frontmatter（04） | name/description 合规 |
| 高触发 description（05） | 覆盖「review、找隐患、把关」等说法 |
| 渐进式披露（06） | 正文薄，清单/脚本沉第 3 层 |
| 清单资源（07） | reference/checklist.md 被正文点名 |
| 脚本协作（08） | scan.py 给线索，Claude 做判断 |

## 你会收获什么

- 一个真正可用的完整技能，可作为你做其它技能的模板。
- 把零散知识点串成「能交付的东西」的工程经验。

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“09 章 Demo · 完整实战：code-review 技能”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
