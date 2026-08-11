# 03 章 Demo · 一个「完整形态」的 Skill 骨架

第 02 章的技能只有一个文件。这个 Demo 展示一个**多文件的完整技能**，让你亲眼看到 `reference/`、`templates/`、`scripts/` 长什么样、怎么被 `SKILL.md` 引用。

## 目录结构

```
pdf-report/
├── SKILL.md                   # 入口：核心流程 + 指向其它文件
├── templates/
│   └── report.md              # 报告模板，供复制套用
├── reference/
│   └── style-guide.md         # 排版规范（偶尔才查 → 外置）
└── scripts/
    └── generate.py            # 生成 PDF 的脚本（本章是演示桩）
```

## 看点：对照着读

打开 `SKILL.md`，注意它**没有**把模板内容、排版规范、脚本代码全抄进去，而是「指路」：

- 「套用标准模板（见 `templates/report.md`）」
- 「排版规范见 `reference/style-guide.md`，需要时再查阅」
- 「运行脚本 `scripts/generate.py`」

这就是第 03 章的核心——**入口精简，细节外置**。`SKILL.md` 本身很短，又长又少用的东西都拆出去了。

## 动手观察

1. 数一下 `SKILL.md` 有多少行，再数 `reference/style-guide.md` 有多少行。想象如果把后者也塞进 SKILL.md，每次触发要多烧多少 token。
2. 把 `SKILL.md` 里 `reference/style-guide.md` 这个引用删掉 —— 这个参考文件就「失联」了，Claude 不会主动去看它。这说明：**没被正文点名的文件，等于不存在。**

## 跑一下脚本（可选）

```bash
cd pdf-report
python scripts/generate.py input.md output.pdf
# 会打印 demo 提示，真正的转换逻辑留到第 08 章
```

## 你会收获什么

- 直观看到一个真实技能的多文件布局。
- 理解「引用关系」：`SKILL.md` 点名了谁，谁才会被加载。
- 为第 06（渐进式披露）、07（资源文件）、08（脚本）章打好结构基础。

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“03 章 Demo · 一个「完整形态」的 Skill 骨架”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。
