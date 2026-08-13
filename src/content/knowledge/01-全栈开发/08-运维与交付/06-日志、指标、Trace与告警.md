# 运维与交付（06） - 日志、指标、Trace 与告警

> 日志解释单个事件，指标描述整体趋势，Trace 还原跨服务路径；三者用统一上下文关联。

> 读完你能：为一次跨服务请求设计日志、指标、Trace 和 SLO 告警，并从告警定位到首个异常 Span。

## 核心知识清单

- 结构化日志与 request_id、trace_id
- RED 指标、USE 指标与业务成功率
- Trace、Span、父子关系与采样
- SLI、SLO、错误预算与 Burn Rate
- 告警分级、去重、抑制与 Runbook
- 敏感信息脱敏与高基数控制
- Prometheus 指标采集与 Grafana 仪表盘

## 信号如何配合

先由告警指出“什么用户影响正在扩大”，再从指标按版本、区域和依赖缩小范围，进入异常 Trace 找到第一个变慢或报错的 Span，最后查看该 Span 的结构化日志。只存日志会在高流量下难以发现趋势；只看平均指标会掩盖长尾；全量 Trace 成本过高，应结合头采样与错误尾采样。

```json
{
  "level": "error",
  "service": "order-api",
  "request_id": "req-42",
  "trace_id": "9f1c...",
  "operation": "create_order",
  "error_type": "upstream_timeout",
  "duration_ms": 2012
}
```

日志不能记录密码、Token、银行卡或完整请求正文。租户、用户等高基数值适合放 Trace/日志，不要直接作为指标标签。

Prometheus 采集计数器、直方图和 Gauge，Grafana 展示按服务、版本和区域拆分的趋势。仪表盘服务于观察，告警仍以用户影响、SLO 和 Burn Rate 为准，不能对每次单点错误发通知。

## 参考资料

- [OpenTelemetry Signals](https://opentelemetry.io/docs/concepts/signals/)
- [Google SRE Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Prometheus Overview](https://prometheus.io/docs/introduction/overview/)
- [Grafana Documentation](https://grafana.com/docs/)
