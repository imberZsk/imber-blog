# Java（39） - Java 全栈项目结构速查

> 读完你能：确认项目实际使用的 JDK 与父 POM 版本，理解常见模块职责，并按依赖方向定位微服务问题。

## 先确认真实运行环境

不要只看本机 `java -version`。Maven 项目最终采用的编译版本可能由父 POM、模块 POM 或 CI 参数覆盖，应同时执行：

```bash
java -version
mvn -version
mvn help:effective-pom > effective-pom.xml
```

在 `effective-pom.xml` 中确认 `maven.compiler.source`、`maven.compiler.target` 和 Spring Boot、Spring Cloud 依赖管理版本。排障时应记录这些结果，避免把“本机 JDK 是 17”误认为“项目按 Java 17 编译”。

## 常见模块职责

| 模块 | 主要职责 | 不应包含 |
| --- | --- | --- |
| `service` | 应用启动、Controller、配置装配 | 被其他服务直接依赖的 DTO |
| `biz` | 领域与业务逻辑 | HTTP 客户端实现细节 |
| `client` | Feign 接口和跨服务 DTO | 当前服务的数据库访问 |
| `common` | 多模块共享且稳定的基础类型 | 单一页面或单一业务专用逻辑 |

共享模块不是“暂时不知道放哪”的目录。只有两个以上模块确实复用、并且契约相对稳定的内容才进入 `common`。

## 微服务调用链

典型请求会依次经过网关、服务发现、Feign 调用和业务服务；配置由 Apollo 或其他配置中心下发，异步任务可能进入 Kafka，热点数据可能进入 Redis。

排查时从入口向下记录请求 ID：先确认网关是否转发，再确认服务实例是否注册、Feign 是否命中正确地址、配置是否生效，最后检查数据库或消息队列。不要一开始就重启全部组件，否则会丢失真正的故障现场。

## 验收清单

1. `mvn test` 和目标模块构建退出码为 `0`。
2. 启动日志中的配置环境、端口和服务名符合预期。
3. 健康检查成功，关键接口能携带请求 ID 完成一次端到端调用。
4. Git Diff 只包含本次目标模块，不夹带本机配置和密钥。

## 参考资料

- [Dev.java 学习路径](https://dev.java/learn/)
- [Spring Boot 文档](https://docs.spring.io/spring-boot/)
