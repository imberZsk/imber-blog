# Java（22） - Eureka 服务注册与发现

> 读完后，你应能完成以下任务：
> - 绘制“Java（22） - Eureka 服务注册与发现 / 为什么需要注册中心？”的关键对象与数据流，解释“服务器 IP 会变（重启、迁移、扩容） -> 后端可能有 10 台机器，你不知道该请求哪一台 -> 写死 IP 一旦机器挂了，前端就全崩”，并用源码位置、日志或 Trace 标注证据。
> - 为“Java（22） - Eureka 服务注册与发现 / 如果没有注册中心会怎样”设计正常与异常输入，验证“demo-basic 扩容到 3 台（10.0.1.5 / 10.0.1.6 / 10.0.1.7），调用方代码不改就只能压垮第一台”，输出首个偏差位置与回归测试结果。
> - 实现“Java（22） - Eureka 服务注册与发现 / 注册中心的解法”的最小代码或配置，检验“现在调用方 demo-order 只需要说："我要调 demo-basic 这个服务"，剩下的"它现在有几台、IP 是多少、哪台还活着"全由 Eureka 体系搞定。”，输出命令、结果与 Diff，并说明不适用边界。

> 微服务拆出来了，服务 A 怎么找到服务 B？答案不是写死 IP，而是让所有服务都去一个"通讯录"里登记和查询——这个通讯录就是 Eureka 注册中心。

前面的课我们都在讲单个服务内部的事（Controller→Service→Mapper）。但 demo 示例环境里有几十个服务：`demo-basic`、`demo-order-v1`、`geo-service`、`analytics-service`……它们之间要互相调用。这一课我们就解决一个核心问题：**在一堆动态变化、随时扩缩容的服务里，一个服务如何稳定地找到另一个服务**。

---

# 一、为什么需要注册中心？

## 1.1 先看一个前端早就遇到过的问题

你在前端写 `axios.get('https://api.example.com/users')`，这个域名背后其实是一台或多台服务器。你从来不会在代码里写 `axios.get('https://192.168.3.17:8080/users')`，对吧？因为：

1. 服务器 IP 会变（重启、迁移、扩容）
2. 后端可能有 10 台机器，你不知道该请求哪一台
3. 写死 IP 一旦机器挂了，前端就全崩

前端是靠 **DNS + 负载均衡器（Nginx/LB）** 解决的：你只认域名，DNS 负责把域名翻译成某台活着的机器 IP。

**微服务之间的调用，遇到的是一模一样的问题。** 只是这次"客户端"不再是浏览器，而是另一个 Java 服务。

## 1.2 如果没有注册中心会怎样

假设 `demo-order` 要调用 `demo-basic` 查公司信息：

```text
┌──────────────┐                      ┌──────────────┐
│ demo-order │ ──写死 IP 直连──────> │   demo-basic  │
│              │   10.0.1.5:8080      │  10.0.1.5    │
└──────────────┘                      └──────────────┘
```

问题来了：

- `demo-basic` 扩容到 3 台（10.0.1.5 / 10.0.1.6 / 10.0.1.7），调用方代码不改就只能压垮第一台
- `demo-basic` 那台机器挂了换了新 IP，所有调用它的服务都要改配置、重新发布
- 本地开发时每个人的 IP 都不一样，没法统一配置

## 1.3 注册中心的解法

引入一个中间人 **Eureka Server（注册中心）**，让所有服务启动时来"报到登记"，调用方来"查名录"：

```text
                  ┌─────────────────────────┐
                  │      Eureka Server       │
                  │      （服务注册表）        │
                  │                          │
                  │  demo-basic:              │
                  │    - 10.0.1.5:8080  ✓    │
                  │    - 10.0.1.6:8080  ✓    │
                  │    - 10.0.1.7:8080  ✓    │
                  │  demo-order-v1:        │
                  │    - 10.0.2.1:8080  ✓    │
                  └─────────────────────────┘
                     ▲ 注册/心跳      ▲ 拉取列表
          ┌──────────┘                └──────────┐
          │                                       │
   ┌──────────────┐                       ┌──────────────┐
   │   demo-basic  │ <──── 按服务名调用 ──── │ demo-order │
   │ （3个实例）   │   "demo-basic"          │              │
   └──────────────┘                       └──────────────┘
```

现在调用方 `demo-order` 只需要说："我要调 **demo-basic** 这个服务"，剩下的"它现在有几台、IP 是多少、哪台还活着"全由 Eureka 体系搞定。

## 1.4 前端类比对照表

| 前端世界 | 微服务世界（Eureka） | 作用 |
|---------|-------------------|------|
| 域名 `api.example.com` | 服务名 `demo-basic` | 调用方只认这个稳定的逻辑名 |
| DNS 服务器 | Eureka Server | 把逻辑名解析成具体的机器地址 |
| DNS 记录 A/AAAA | 服务实例列表（IP:Port） | 一个名字对应一组真实地址 |
| Nginx / 负载均衡器 | 客户端负载均衡（Ribbon/LoadBalancer） | 在多个实例间分摊流量 |
| 健康检查 health check | 心跳 heartbeat | 探测某台机器是否还活着 |
| DNS TTL 过期重新解析 | 定时拉取注册表 | 地址变了能感知到 |

一句话记忆：**Eureka ≈ 服务专用的 DNS + 健康检查 + 负载均衡的合体**。

---

# 二、Eureka 的三大核心机制

Eureka 体系里有两个角色：

- **Eureka Server**：注册中心本身，维护那张"服务名 → 实例列表"的大表。demo 里这是运维统一搭建好的，地址配在 Apollo 配置中心上（后面会讲到）。
- **Eureka Client**：每一个业务服务（`demo-basic`、`demo-order` 等）都是 Client，既会"注册自己"，也会"发现别人"。

Client 和 Server 之间靠三个机制协作：

## 2.1 机制 1：服务注册（Register）

服务一启动，就把自己的信息打包发给 Eureka Server："我叫 demo-basic，我在 10.0.1.5:8080，我活着。"

```text
应用启动
   │
   ▼
向 Eureka Server 发送注册请求
   POST /eureka/apps/DEMO-BASIC
   { 服务名: demo-basic, ip: 10.0.1.5, port: 8080, status: UP }
   │
   ▼
Eureka Server 把它记进注册表
```

【前端类比】这像你部署一个新前端站点后，去 DNS 控制台加一条 A 记录，把域名指向新服务器 IP。区别是 Eureka 是服务**自己自动**去登记的，不需要人工操作。

## 2.2 机制 2：心跳续约（Heartbeat / Renew）

光登记还不够——万一服务崩了呢？所以每个 Client 默认**每 30 秒**向 Server 发一次心跳，相当于不停地喊"我还活着、我还活着"。

如果 Server 连续一段时间（默认 90 秒）收不到某个实例的心跳，就认为它死了，从注册表里把它**剔除**，不再把流量分给它。

```text
demo-basic 实例                 Eureka Server
     │                              │
     │──心跳(我还活着)──30s────────> │  续约成功，保留
     │──心跳(我还活着)──30s────────> │  续约成功，保留
     │   ✗ 机器崩了                  │
     │                              │  90s 没收到心跳
     │                              │  → 剔除 10.0.1.5
     X                              │
```

【前端类比】≈ WebSocket 的心跳包（ping/pong），或者负载均衡器周期性请求 `/health` 接口。连续探测失败就把这台机器摘掉，不再转发请求过去。

## 2.3 机制 3：拉取列表（Fetch Registry）

调用方（也是 Client）会**定期从 Server 拉取整张注册表**缓存到本地（默认每 30 秒拉一次）。

这一步很关键：调用 `demo-basic` 时，调用方**不是**每次都去问 Server "demo-basic 现在在哪"，而是查自己本地缓存的那份名录。这样即使 Eureka Server 短暂挂掉，已经拉到的服务列表还能继续用，系统不会立刻瘫痪（这就是 Eureka 著名的 **AP 优先、保证可用性** 的设计）。

```text
                       每 30s 拉取一次
   ┌──────────────┐  ──────────────────>  ┌──────────────┐
   │ demo-order │                        │ Eureka Server│
   │              │  <──返回完整注册表──── │              │
   │  本地缓存:    │                        └──────────────┘
   │  demo-basic → [10.0.1.5, 10.0.1.6, 10.0.1.7]
   └──────────────┘
        │
        │ 调用时直接查本地缓存，不必每次问 Server
        ▼
   从 3 个 IP 里挑一个发请求
```

【前端类比】≈ DNS 的本地缓存 + TTL。浏览器解析过的域名会缓存一段时间，不会每个请求都去问 DNS。TTL 到了才重新解析。

## 2.4 三机制时序总览

```text
┌────────┐   ①注册      ┌──────────────┐   ③拉取列表   ┌────────┐
│ 服务B   │ ──────────> │ Eureka Server │ <────────── │ 服务A   │
│(被调方) │ <─────────  │  (注册表)      │ ──────────> │(调用方) │
│        │  ②心跳/续约   └──────────────┘   返回列表    │        │
└────────┘  (每30s)                                    └────────┘
                                                            │
                                                  ④拿到B的实例列表后
                                                    本地负载均衡选一个
                                                            ▼
                                                       直连服务B
```

| 机制 | 谁发起 | 频率（默认） | 作用 | 前端类比 |
|------|-------|-----------|------|---------|
| 注册 Register | 被调方 | 启动时一次 | 登记自己 | DNS 加 A 记录 |
| 心跳 Renew | 被调方 | 每 30s | 证明自己还活着 | WS 心跳 / health check |
| 拉取 Fetch | 调用方 | 每 30s | 同步最新名录到本地 | DNS 缓存 + TTL |

---

# 三、demo 匿名化示例代码：怎么把一个服务接入 Eureka

## 3.1 第一步：把 Eureka 客户端依赖加进来

接入的真正前提，是项目里有 Eureka 客户端这个依赖。看 demo 示例的 `demo-order-web/pom.xml`：

```xml
<!-- 有了这个 starter，Spring 启动时就会自动完成"注册 + 心跳 + 拉列表" -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
```

【重要纠正】很多老教程会告诉你"必须在启动类加 `@EnableDiscoveryClient` 才能接入"。这在新版 Spring Cloud（Greenwich / 2020.x 之后）**已经不成立了**——只要 classpath 上有上面这个 starter，自动注册就会生效，注解不是必需的。

这有 demo 的匿名化示例代码作证。`demo-order` 的启动类（文件：`demo-order/demo-order-web/src/main/java/com/example/platform/order/Application.java`）**根本没有任何服务发现注解**，但它照样正常注册进了 Eureka：

```java
@EnableExecutorCollector
@MapperScan("com.example.platform.order.mapper")
@SpringBootApplication
@EnableFeignClients                     // 只有 Feign 注解，没有 @EnableDiscoveryClient
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

那 `@EnableDiscoveryClient` 还有用吗？有，但作用是**显式声明意图**（让人一眼看出这是个微服务），少数 demo 服务仍然写着它。看 `demo-api-rest` 启动类（文件：`demo-openapi/demo-api-rest/src/main/java/com/example/platform/api/rest/Application.java`）：

```java
@EnableAsync
@EnableCaching
@EnableRedisson
@EnableScheduling
@EnableApolloConfig
@SpringBootApplication(scanBasePackages = {"com.example.platform.api"}, exclude = DataSourceAutoConfiguration.class)
@EnableDiscoveryClient                 // ← 显式声明：本服务接入服务注册发现体系（可省略）
@EnableHystrix                         // 熔断降级（后续课讲）
@EnableFeignClients(basePackages = "com.example.platform.api.integrate")  // 开启 Feign 远程调用
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

【关键注解辨析】你在别处可能会看到两个长得很像的注解：

| 注解 | 说明 |
|------|------|
| `@EnableEurekaClient` | 绑定 Eureka，只对 Eureka 生效（demo 已不用，可视为过时写法） |
| `@EnableDiscoveryClient` | 更通用，不绑定具体实现，底层是 Eureka 就走 Eureka，是 Consul 就走 Consul |

demo 里只用过 `@EnableDiscoveryClient`（`demo-api-rest`、`demo-driver-adapter-rest`），没用过 `@EnableEurekaClient`。结论：**真正起作用的是依赖，注解是可选的；要写就写更通用的 `@EnableDiscoveryClient`**。

【前端类比】这就像前端装了 `vue-router` 这个包，框架的路由能力就自动具备了，至于要不要在代码里再显式 `app.use(router)` 走一道是另一回事——能力来自依赖，显式声明只是让意图更清楚。Spring 这边只要有 starter，"注册 + 心跳 + 拉列表"那一整套就自动跑起来，你一行业务代码都不用写。

## 3.2 第二步：配置服务名和注册中心地址

光有注解还不够，得告诉框架两件事：**我叫什么名字**、**注册中心在哪**。看 demo 示例的 `bootstrap.yml`（文件：`demo-order/demo-order-web/src/main/resources/bootstrap.yml`）：

```yaml
spring:
  application:
    name: demo-order-v1      # ← 服务名！这就是别人调用我时用的"域名"
  profiles:
    active: dev

# Apollo 配置中心：Eureka Server 的真实地址不写死在代码里，而是放在 Apollo 上统一管理
apollo:
  bootstrap:
    enabled: true
    # 注意这一行：service-discovery 这个命名空间里就放着 eureka 注册中心地址
    namespaces: application,demo-platform.oss,demo-platform.common,demo-platform.service-discovery

eureka:
  instance:
    prefer-ip-address: true     # ← 注册时用 IP 而不是主机名，避免内网 DNS 解析问题
```

几个要点讲清楚：

1. **`spring.application.name` 就是服务名**，是整个体系的核心。别的服务通过这个名字找到你。注意 demo 的命名带版本号 `-v1`，方便后续接口大改时灰度并存。

2. **Eureka Server 地址没有写死在这个文件里**，而是放在 Apollo 配置中心的 `demo-platform.service-discovery` 命名空间。这样测试/生产环境切换、注册中心迁移，业务服务一行代码不用改。这是大型项目的标准做法——配置和代码分离。

3. **`prefer-ip-address: true`** 这个配置很实用：默认 Eureka 注册的是主机名（hostname），但容器/内网环境里主机名经常无法互相解析，所以强制用 IP 注册，保证调用方能直连。

## 3.3 第三步：本地开发的服务名隔离（一个很妙的细节）

demo 的 `bootstrap.yml` 里 dev 环境有段注释非常值得学习：

```yaml
spring:
  profiles: dev
  application:
    # 默认应用名带上本地用户名信息，以避免接口调用冲突
    #
    # spring.application.name 会作为服务名称注册到公司的 spring-cloud 微服务网络中。
    # 本地开发调试时，本地启动的服务也会注册到 spring-cloud 网络中，使用相同服务名会被认为
    # 是同一个服务的不同实例，会被负载均衡分配流量，导致收到未预期的接口请求；或者期望的请求
    # 被打到其他人启动的服务上，导致开发测试的冲突。
    # 将本地用户名加入到应用名中，可以将应用在 spring-cloud 中独立区分出来。
    name: demo-order-${user.name}-v1     # ← 本地用 用户名 隔离
```

这段设计的精髓：**本地启动的服务也会注册进同一个 Eureka 网络**。如果你和同事都用 `demo-order-v1` 这个名字注册，Eureka 会以为这是同一个服务的两个实例，然后把流量随机分给你俩——你调试时一半请求跑到同事机器上去了，根本没法定位问题。

解法：本地名字带上 `${user.name}`（操作系统用户名），变成 `demo-order-zhangsan-v1`，在 Eureka 眼里就是个独立服务，谁也不影响谁。

【前端类比】≈ 多人开发时，本地起 dev server 用各自不同的端口/子域名，避免代理转发打架。

---

# 四、客户端负载均衡：找到列表之后怎么选一台

拉到 `demo-basic` 有 3 个实例 `[10.0.1.5, 10.0.1.6, 10.0.1.7]`，到底请求哪一台？这就是**负载均衡**要解决的。

## 4.1 服务端负载均衡 vs 客户端负载均衡

| | 服务端负载均衡（前端熟悉的） | 客户端负载均衡（Eureka 体系） |
|---|---|---|
| 谁来选机器 | 中间的 Nginx/LB 设备来选 | **调用方自己**在代码里选 |
| 流量路径 | 调用方 → LB → 目标机器（多一跳） | 调用方 → 目标机器（直连） |
| 实例列表谁知道 | 只有 LB 知道 | **每个调用方本地都缓存了一份** |
| 典型代表 | Nginx、F5、云 SLB | Ribbon / Spring Cloud LoadBalancer |

【关键理解】Eureka 体系用的是**客户端负载均衡**：因为前面讲的"拉取列表"机制，**调用方本地已经有完整实例列表了**，那干脆就在本地直接挑一台，省掉中间 LB 那一跳，更快也更省设备。

```text
客户端负载均衡（demo 用的方式）：

  demo-order 本地缓存:
    demo-basic → [10.0.1.5, 10.0.1.6, 10.0.1.7]
                      │
            本地按轮询/随机算法挑一个
                      │
                      ▼
            直连 10.0.1.6:8080  （没有中间商）
```

【前端类比】这有点像你在前端拿到一个 CDN 节点 IP 列表后，自己在 JS 里随机选一个去请求，而不是每次都走同一个入口。只不过 Java 这边由框架（Ribbon / LoadBalancer）自动完成，你无感知。

## 4.2 在 demo 里负载均衡是怎么用上的：Feign

实际写代码时，你**根本不会手动去选 IP**。demo 用 **OpenFeign**——只要声明一个接口，标上服务名，框架就自动完成"查列表 → 选实例 → 发请求"全过程。

看 demo 示例的 Feign 客户端写法（来自 `demo-basic` 项目的远程调用声明）：

```java
// value 写的就是【服务名】，不是 IP！框架会去 Eureka 把它解析成真实实例
@FeignClient(contextId = "GeoServiceClient", value = "geo-service", configuration = FeignConfig.class)
public interface GeoServiceClient {
    // 这里声明的方法，调用时会被自动翻译成对 geo-service 服务的 HTTP 请求
    // ...
}

// 另一个例子：调用 demo-basic 服务的加油卡能力（来自 demo-basic-client）
@FeignClient(contextId = "remoteFuelCardService", value = "demo-basic",
             fallbackFactory = RemoteAccountServiceFallbackFactory.class)  // 配上降级工厂
public interface RemoteAccountService {
    // ...
}
```

注意对比第 04 课讲的"五站请求生命周期"——那是**一个服务内部**从网关到 MySQL。而 Feign 调用是**跨服务**的：`demo-order` 通过 Feign 调 `demo-basic`，等于在调用方这边发起了一次新的 HTTP 请求，进入 `demo-basic` 的五站流程。

整条链路串起来：

```text
@FeignClient(value = "demo-basic")  接口方法被调用
         │
         ▼
① 框架拿服务名 "demo-basic" 去本地缓存的注册表查
         │
         ▼
② 查到 [10.0.1.5, 10.0.1.6, 10.0.1.7]
         │
         ▼
③ 负载均衡算法挑一个，比如 10.0.1.6
         │
         ▼
④ 真正发出 HTTP 请求 → http://10.0.1.6:8080/...
         │
         ▼
⑤ 进入 demo-basic 的 Controller→Service→Mapper（第04课的五站）
```

【前端类比】`@FeignClient` 声明一个远程接口≈前端封装一层 `request.ts` 的 API service：你只调 `userApi.getById(1)`，底层的 baseURL 拼接、负载、重试都被封装好了，业务代码很干净。区别是 Feign 的"baseURL"是动态从 Eureka 解析出来的，而不是写死的。

---

# 五、把整个流程连起来看

以 `demo-order` 调用 `demo-basic` 为例，从启动到完成一次跨服务调用：

```text
【启动阶段】
  demo-basic 启动
    → @EnableDiscoveryClient 生效
    → 读 bootstrap.yml 拿到自己的名字 "demo-basic"
    → 从 Apollo 拿到 Eureka Server 地址
    → 向 Eureka 注册自己（IP:Port）
    → 之后每 30s 发心跳保活

  demo-order 启动
    → 同样注册自己 "demo-order-v1"
    → 同时每 30s 从 Eureka 拉取完整注册表到本地缓存

【调用阶段】
  demo-order 业务代码调用 @FeignClient(value="demo-basic") 的方法
    → 框架查本地缓存：demo-basic = [10.0.1.5, .6, .7]
    → 负载均衡挑中 10.0.1.6
    → 发起 HTTP 请求到 10.0.1.6:8080
    → demo-basic 走完五站返回数据

【容错阶段】
  10.0.1.6 突然挂了
    → 90s 内 Eureka 收不到它的心跳 → 从注册表剔除
    → demo-order 下次拉取列表时更新缓存为 [10.0.1.5, .7]
    → 之后的请求自动只打向活着的两台
```

这就是为什么微服务能做到**机器随便扩容、随便挂、随便换 IP，调用方代码一行不改**——所有动态性都被 Eureka 这套"注册 + 心跳 + 拉取 + 负载均衡"机制吸收了。

---

# 六、本课小结

- **为什么需要注册中心**：微服务数量多、IP 动态变化，写死 IP 不可行。Eureka 解决"服务 A 如何稳定找到服务 B"的问题，本质≈服务专用的 DNS。
- **三大核心机制**：
  - 注册 Register——服务启动时登记自己（≈DNS 加 A 记录）
  - 心跳 Renew——每 30s 证明自己还活着，连续 90s 失联就被剔除（≈health check）
  - 拉取 Fetch——调用方定期把注册表缓存到本地（≈DNS 缓存 + TTL）
- **接入方式极简**：项目引入 `spring-cloud-starter-netflix-eureka-client` 依赖，自动注册就生效（注解可省）；`bootstrap.yml` 配 `spring.application.name`，注册中心地址放 Apollo 统一管理。要显式声明可加 `@EnableDiscoveryClient`。
- **客户端负载均衡**：调用方本地已有完整实例列表，直接在本地挑一台直连，省掉中间 LB 一跳。demo 通过 `@FeignClient(value="服务名")` 让框架自动完成"查列表→选实例→发请求"。
- **demo 实战要点**：服务名带 `-v1` 版本号；本地开发用 `${user.name}` 隔离避免流量串台；`prefer-ip-address: true` 用 IP 注册避免内网 DNS 问题。
- 引用的匿名化示例代码：`demo-order-web/pom.xml`（eureka-client 依赖）、`demo-order/Application.java`（无注解也能注册）、`demo-api-rest/Application.java`（显式 `@EnableDiscoveryClient`）、`demo-order-web/bootstrap.yml`（服务名与 Eureka 配置）、`demo-basic` 的 `@FeignClient` 声明（`RemoteAccountService`、`GeoServiceClient`）。

**下一课预告**：第 23 课《OpenFeign 声明式远程调用》。这一课我们已经见过 `@FeignClient` 的样子了，下一课会深入它——如何像写本地接口一样调用远程服务、`@FeignClient` 的各个参数、超时与请求头传递（还记得 bootstrap.yml 里那段 `feign.client.config` 吗？），以及它和 Eureka、负载均衡是怎么咬合在一起的。

# 七、总结

- **为什么需要注册中心？**：服务器 IP 会变（重启、迁移、扩容） -> 后端可能有 10 台机器，你不知道该请求哪一台 -> 写死 IP 一旦机器挂了，前端就全崩
- **Eureka 的三大核心机制**：demo 里这是运维统一搭建好的，地址配在 Apollo 配置中心上（后面会讲到）。
- **demo 匿名化示例代码：怎么把一个服务接入 Eureka**：spring.application.name 就是服务名，是整个体系的核心。 -> Eureka Server 地址没有写死在这个文件里，而是放在 Apollo 配置中心的 demo-platform.service-discovery 命名空间。 -> prefer-ip-address: true 这个配置很实用：默认 Eureka 注册的是主机名（hostname），但容器/内网环境里主机名经常无法互相解析，所以强制用 IP 注册，保证调用方能直连。
- **客户端负载均衡：找到列表之后怎么选一台**：这就是负载均衡要解决的。
- **把整个流程连起来看**：这就是为什么微服务能做到机器随便扩容、随便挂、随便换 IP，调用方代码一行不改——所有动态性都被 Eureka 这套"注册 + 心跳 + 拉取 + 负载均衡"机制吸收了。
- **本课小结**：demo 通过 @FeignClient(value="服务名") 让框架自动完成"查列表→选实例→发请求"。

## 参考资料

- [Dev.java 学习路径](https://dev.java/learn/)
- [Spring Boot 文档](https://docs.spring.io/spring-boot/)
