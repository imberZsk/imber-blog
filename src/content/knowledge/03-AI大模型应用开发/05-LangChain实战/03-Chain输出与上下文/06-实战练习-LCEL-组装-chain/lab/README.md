# LCEL RAG 与 Callback Trace Demo

把固定 RAG 流程拆成 `retrieve → prompt → model → parser` 四个可测试步骤，并通过 Callback 记录每一步的输入字段、输出字段和耗时。

## 本地运行

```bash
python3 main.py
```

零依赖，Python 3.10+ 可运行。真实 LangChain 中可替换为 `RunnableParallel`、`PromptTemplate`、模型 Runnable、Parser 和 LangSmith/LangFuse Callback，数据契约保持一致。

## 重点观察

- Trace 同时保留召回证据和最终引用，答错时能区分检索问题与生成问题。
- 固定流水线适合 LCEL；需要重试环路或人工审批时应切换 LangGraph。
