# 运维与交付（05） - CI/CD、制品、灰度与回滚

> 一次构建、逐环境晋级；部署的是带版本和证据的制品，不是在服务器上重新编译的源码。

> 读完你能：设计从验证、构建到灰度和回滚的流水线，并追踪提交、制品、配置与部署证据。

## 核心知识清单

- CI 的静态检查、测试、构建与安全扫描
- 不可变制品、版本、SBOM 与签名
- CD 的环境晋级、审批与配置注入
- 蓝绿、金丝雀与按租户灰度
- 自动回滚、人工回滚与数据兼容
- 部署证据、变更记录与审计

## 最小流水线

```yaml
jobs:
  verify:
    steps:
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - run: docker build -t app:${GITHUB_SHA} .
```

后续环境必须复用 `app:${GITHUB_SHA}`，只改变环境配置。灰度按用户或租户稳定分桶，观察错误率、P95 延迟和业务成功率；达到停止阈值立即冻结扩量。回滚前确认旧版本能够读取新 Schema 和新数据，否则应用回滚成功也可能继续故障。

## 验收清单

- 提交、测试报告、镜像摘要、配置版本和部署记录可关联。
- 失败检查阻断发布，不能用重跑掩盖不稳定测试。
- 灰度指标有基线、阈值、观察窗口和负责人。
- 回滚命令经过演练，恢复后用同一探针和业务请求验证。

## 参考资料

- [GitHub Actions Workflows](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows)
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
