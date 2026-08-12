# Superpowers（3）- Using Git Worktrees 与 Executing Plans：隔离改动并分批执行

> 读完你能：围绕“Using Git Worktrees 与 Executing Plans：隔离改动并分批执行”理解“创建独立工作树”与“分批执行计划”，并结合正文示例完成实践与排障。

工作树解决“多个任务互相污染”，执行计划解决“长任务做着做着偏航”。两者结合后，每个任务有独立目录，每批实现结束都有验证和复盘点。

# 一、创建独立工作树

下面命令会从当前仓库创建一个独立分支和目录，不影响正在进行的其他任务：

```bash
# 创建任务分支对应的独立工作树。
git worktree add ../worktrees/article-favorites -b feat/article-favorites

# 进入工作树并确认分支与改动基线。
cd ../worktrees/article-favorites
git branch --show-current
git status --short
```

创建后先安装依赖并运行基线测试。基线本来就失败时，应记录失败并确认是否与任务有关，不能把它悄悄算成本次回归。

# 二、分批执行计划

`executing-plans` 不是把计划一次性跑到底，而是：

1. 读取计划并指出缺口。
2. 执行一小批任务。
3. 运行每步对应的验证。
4. 汇报改动和证据，等待检查后继续。

批次的价值在于尽早发现方向错误。三个任务一批通常比二十个任务全部做完再回看更容易纠正。

# 三、安全边界

- 不在源目录直接开发。
- 不复用已有脏工作树承载无关任务。
- 删除工作树前先确认分支已合并、远程已推送、目录没有未提交文件。

# 四、官方资料

- [using-git-worktrees](https://github.com/obra/superpowers/tree/main/skills/using-git-worktrees)
- [executing-plans](https://github.com/obra/superpowers/tree/main/skills/executing-plans)

# 五、总结

- **安全边界**：不复用已有脏工作树承载无关任务。
- **创建独立工作树**：下面命令会从当前仓库创建一个独立分支和目录，不影响正在进行的其他任务：
- **分批执行计划**：executing-plans 不是把计划一次性跑到底，而是：
- **官方资料**：using-git-worktrees

## 参考资料

- [Git Worktree](https://git-scm.com/docs/git-worktree)
- [pytest 文档](https://docs.pytest.org/en/stable/)
