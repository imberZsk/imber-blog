# Agentic RAG 自纠错闭环 Demo

用显式状态图模拟 `route → retrieve → grade → rewrite → answer/refuse`。实验同时运行“改写后命中”和“达到上限仍无证据”两个场景。

## 本地运行

```bash
python3 main.py
```

零依赖，Python 3.10+ 可运行。真实 LangGraph 会负责节点注册、条件边和 Checkpoint；这个实验保留相同状态与停止条件，便于先理解执行轨迹。

## 重点观察

- 原始问题始终保留，改写只更新 `search_query`。
- 证据评分低于阈值才允许有限次改写。
- 达到上限仍无证据时明确拒答，不把弱证据交给生成节点。
