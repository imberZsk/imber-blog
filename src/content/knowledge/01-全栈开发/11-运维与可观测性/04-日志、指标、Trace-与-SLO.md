# 运维与可观测性（04） - 日志、指标、Trace 与 SLO

> 可观测性不是“日志越多越好”，而是让一次用户失败能在有限时间内定位到版本、依赖和首个异常边界。

## 学习目标

- 区分日志、指标和 Trace 各自回答的问题与字段边界。
- 从用户目标定义 SLI/SLO、错误预算和告警策略。
- 通过 trace_id、Runbook 和故障演练完成端到端定位。

## 一、三类信号

| 信号 | 回答的问题 | 关键设计 |
| --- | --- | --- |
| 日志 | 发生了什么细节 | 结构化字段、级别、脱敏 |
| 指标 | 系统整体趋势如何 | 低基数标签、分位数、SLO |
| Trace | 时间花在哪个调用边界 | trace_id、父子 Span、状态 |

日志至少包含 timestamp、service、environment、version、request_id/trace_id、event 和 error_type。用户 ID 等敏感标识使用受控映射，不记录密码、Token 和完整正文。

## 二、从 SLO 反推告警

SLO 描述用户可感知目标，如 30 天内 99.9% 成功且 P95 小于 500ms。错误预算决定发布速度与可靠性权衡。告警优先使用错误预算消耗率和关键业务失败，不为每个 CPU 波动叫醒值班人员。

## 三、Trace 传播

入口生成或接收 trace context，并贯穿 HTTP、消息、数据库和外部 API。异步消息保存生产 Span 与消费 Span 的关联；采样不能只保留成功请求，高延迟和错误应提高保留率。

## 四、Runbook

每条告警链接到 Runbook：用户影响、首查面板、常见根因、止损动作、升级人和恢复验证。仪表盘同时展示流量、错误、延迟、饱和度和当前版本，避免脱离部署变化看单个曲线。

## 五、验收

- 给定一个用户报错能在 Trace 中定位首个失败 Span，并关联同版本日志。
- 指标标签不会使用 request_id、URL 全路径等高基数值。
- 演练依赖超时，告警在预算内触发，恢复后自动关闭且有复盘证据。

## 参考资料

- [OpenTelemetry Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [Google SRE Implementing SLOs](https://sre.google/workbook/implementing-slos/)
