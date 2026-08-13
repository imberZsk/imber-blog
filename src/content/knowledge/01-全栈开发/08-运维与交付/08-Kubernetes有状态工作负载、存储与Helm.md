# 运维与交付（08） - Kubernetes 有状态工作负载、存储与 Helm

> Deployment 适合无状态服务；数据库、Broker 和需要稳定身份的组件还要理解 StatefulSet、持久卷、备份和有序升级。

> 读完你能：配置 StatefulSet、PV/PVC、StorageClass 和 Helm Chart，并设计备份、扩缩容、升级与灾难恢复。

## 核心知识清单

- StatefulSet、稳定网络身份与有序发布
- PersistentVolume、PersistentVolumeClaim 与 StorageClass
- ReadWriteOnce、ReadWriteMany 与访问模式
- Volume Snapshot、备份、恢复与演练
- Headless Service、分片、复制与反亲和
- Helm Chart、values、template 与 release
- 升级、回滚、Secret 与环境差异

## 有状态边界

StatefulSet 为 Pod 提供稳定名称和有序创建删除，常与 Headless Service 配合；它不自动完成数据库复制、选主和备份。是否在 Kubernetes 运行数据库，应比较托管服务、团队运维能力和恢复目标。

PVC 申请存储，StorageClass 决定动态供给，PV 表示实际卷。访问模式描述挂载能力，不等于应用支持多写。删除 StatefulSet 前确认 PVC 保留策略，避免误删数据。

## 备份与恢复

Volume Snapshot 只提供存储层快照，数据库仍需一致性机制和日志备份。明确 RPO/RTO，定期在隔离环境恢复并校验业务数据。没有恢复演练的备份不能视为可用。

## Helm 发布

Chart 包含模板和默认 values，各环境只覆盖差异。模板渲染、Schema、`helm diff` 和策略检查进入 CI。Secret 不写入 values 仓库。回滚 Chart 不会自动回滚数据库和持久数据，发布设计必须保留兼容窗口。

## 参考资料

- [Kubernetes StatefulSet](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Helm Charts](https://helm.sh/docs/topics/charts/)

