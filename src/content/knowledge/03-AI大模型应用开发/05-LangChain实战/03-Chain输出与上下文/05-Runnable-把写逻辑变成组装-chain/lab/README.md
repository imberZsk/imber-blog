# Runnable 数据契约与分支 Demo

用一个最小 `Runnable` 协议模拟 LCEL 的核心：统一 `invoke` 接口、管道组合、显式数据契约和可控 fallback。实验不依赖 LangChain，因此浏览器可以直接运行。

## 本地运行

```bash
python3 main.py
```

## 重点观察

- 每个组件只返回新的状态字段，不在匿名函数里隐藏业务副作用。
- 下游读取字段前先校验输入契约。
- 正常问题走检索链；空问题由 fallback 返回可恢复错误。
- 换成真实 LCEL 时，对应 `RunnableLambda`、`|`、`with_fallbacks` 和 Callback。
