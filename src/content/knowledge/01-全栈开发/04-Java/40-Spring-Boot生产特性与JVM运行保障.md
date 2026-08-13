# Java（40） - Spring Boot 生产特性与 JVM 运行保障

> Spring Boot 项目能启动不等于能生产运行。线程、内存、配置、健康、缓存、安全和测试都需要明确边界。

> 读完你能：解释 JVM 内存、线程池、虚拟线程和 Spring Boot 生命周期，并配置 Security、Cache、Actuator 与生产测试。

## 核心知识清单

- JDK、JRE、JVM 与可执行 JAR
- 堆、栈、Metaspace、GC 与内存诊断
- 线程池、CompletableFuture 与虚拟线程
- Spring IoC、Bean 生命周期、Profile 与条件装配
- Filter、Interceptor、AOP 与请求链
- Spring Security、Cache 与异步定时任务
- Actuator、测试切片、Testcontainers 与分层镜像

## JVM 运行保障

堆保存对象，线程栈保存调用帧，Metaspace 保存类元数据。容器部署同时设置 JVM 和 Pod 内存边界，预留原生内存、线程栈和直接内存；只把 `-Xmx` 设到容器上限会增加 OOMKill 风险。通过 GC 日志、Heap Dump、Thread Dump 和指标定位，而不是随意加内存。

固定线程池显式限制队列和拒绝策略。虚拟线程适合大量阻塞 I/O，不会让 CPU 计算更快，也不能突破数据库连接池和下游限流。

## Spring 请求链

Filter 位于 Servlet 边界，Interceptor 围绕 Controller，AOP 代理 Spring Bean 方法。IoC 创建 Bean，Profile 和条件装配选择实现，生命周期回调不应执行不可控长任务。事务、缓存和异步依赖代理，自调用可能绕过代理语义。

## 生产能力

Spring Security 在请求和方法层实施身份、角色与资源授权；Spring Cache 只提供抽象，Key、TTL 和失效仍需业务设计；异步和定时任务必须幂等。Actuator 暴露健康与指标，敏感端点单独保护，Readiness 与 Liveness 语义不能混用。

测试切片验证 MVC 或 JPA 边界，完整集成测试使用 Testcontainers。分层镜像提高依赖层缓存，启动后仍要验证 Profile、Secret、数据库迁移和探针。

## 参考资料

- [Java Virtual Threads](https://docs.oracle.com/en/java/javase/21/core/virtual-threads.html)
- [Spring Boot Actuator](https://docs.spring.io/spring-boot/reference/actuator/)
- [Spring Security](https://docs.spring.io/spring-security/reference/)
- [Spring Boot Testing](https://docs.spring.io/spring-boot/reference/testing/)

