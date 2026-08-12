# Java（25） - Apollo 配置中心

> 读完你能：围绕“Apollo 配置中心”理解“为什么不把配置写死在代码里”与“Apollo 是什么：一句话与一张图”，并结合正文示例完成实践与排障。

> 配置不该写死在代码里。Apollo 让你把配置搬到云端，按环境隔离、运行时随改随生效——就像前端的环境变量，但能在线上动态修改、不用重新部署。

---

# 一、为什么不把配置写死在代码里

先看一段「写死」的反面教材：

```java
// 反面教材：把第三方服务地址硬编码在代码里
public class PartnerApiClient {
    // 写死的 URL，换环境就得改代码重新打包
    private String url = "http://partner-api.prod.example.com";
    private String accessId = "AKID1234567890";   // 密钥还泄露在代码里
    private String secretKey = "<secret-from-config>";
}
```

问题一眼就能看出来：

| 痛点 | 后果 |
|------|------|
| URL 写死 | 切换 test/prod 环境要改代码、重新编译、重新部署 |
| 密钥写在代码里 | 提交到 Git，谁都能看到，安全审计直接红线 |
| 改个超时时间 | 改一行配置要走完整发布流程，几十分钟起步 |
| 多个服务共用一份配置 | 改一处要在 N 个仓库里同步改 N 次 |

**前端类比**：你绝不会把后端 API 地址写死在组件里。React/Vue 项目里你会用：

```js
// 前端的做法：环境变量
const API_BASE = import.meta.env.VITE_API_BASE   // Vite
const API_BASE = process.env.REACT_APP_API_BASE  // CRA
```

`.env.development`、`.env.production` 按环境分文件，构建时注入。Java 后端的 `application.yml`、`application-prod.yml` 就是同一个思路（见第 1 课提到的 profiles）。

但前端的环境变量有个天花板：**它是构建期注入的，打包后就固定了**。线上想改个配置，必须重新构建、重新发布。Apollo 解决的正是这个天花板——**运行时可改，改完秒级推送到所有实例，不用重启、不用发布**。

```
前端 .env          →  构建期注入，固定死      （静态）
application.yml    →  打包期注入，要重启      （半静态）
Apollo 配置中心    →  运行时拉取，可在线修改  （动态）★
```

---

# 二、Apollo 是什么：一句话与一张图

Apollo（阿波罗）是携程开源的**分布式配置中心**。一句话：**所有微服务的配置集中存在 Apollo 服务端，应用启动时拉下来，运行中有变更会主动推送过来。**

**前端类比**：想象有一个「远程配置后台」，你在网页上改一个开关，所有用户的页面立刻拿到新值——类似 Firebase Remote Config 或功能开关（Feature Flag）平台。Apollo 就是后端服务的这种东西。

```
        ┌─────────────────────────────────────────────┐
        │              Apollo 配置中心 (服务端)         │
        │   ┌─────────┐ ┌─────────┐ ┌──────────────┐   │
        │   │  test   │ │  staging  │ │     prod     │   │  ← 环境隔离
        │   │ 集群配置 │ │ 集群配置 │ │   集群配置    │   │
        │   └─────────┘ └─────────┘ └──────────────┘   │
        └──────┬───────────────┬──────────────┬────────┘
               │ 启动拉取        │ 启动拉取      │ 启动拉取
               │ + 变更推送      │ + 变更推送    │ + 变更推送
        ┌──────▼──────┐  ┌──────▼──────┐  ┌────▼────────┐
        │ demo-basic   │  │demo-vehicle  │  │  demo-pay    │  ← 各个微服务
        │  (实例×3)   │  │  -biz       │  │             │
        └─────────────┘  └─────────────┘  └─────────────┘
```

几个核心名词，建立对照即可：

| Apollo 名词 | 含义 | 前端类比 |
|-------------|------|----------|
| App (应用) | 一个微服务，用 `app.id` 标识 | 一个前端项目 |
| Environment (环境) | test / staging / prod 等 | `.env.development` / `.env.production` |
| Cluster (集群) | 同一环境下的不同部署分组（如 default/staging/canary） | 灰度分组 |
| Namespace (命名空间) | 配置的分组文件，如 `biz`、`datasource` | 把配置拆成多个 `.env.xxx` 文件 |
| Item (配置项) | 一个 key=value | 一行环境变量 |

---

# 三、demo 里怎么接入 Apollo（匿名化示例代码）

## 3.1 启动入口开关

demo-asset 的启动类上加了一个注解就打开了 Apollo（`VehicleBizApplication.java`）：

```java
import com.ctrip.framework.apollo.spring.annotation.EnableApolloConfig;

@EnableApolloConfig  // 开启 Apollo 配置加载，应用启动时会去拉取远程配置
@SpringBootApplication
public class VehicleBizApplication {
    public static void main(String[] args) {
        SpringApplication.run(VehicleBizApplication.class, args);
    }
}
```

**前端类比**：相当于在入口文件 `main.ts` 里 `import` 并初始化了一个「远程配置 SDK」，之后整个应用就能读到远程下发的值。

## 3.2 bootstrap.yml：声明要拉哪些命名空间

为什么是 `bootstrap.yml` 而不是 `application.yml`？因为 Apollo 配置必须**在应用其余配置加载之前**就拿到（比如数据库连接串都在 Apollo 上，没它连不上库）。`bootstrap.yml` 是 Spring 最早加载的配置文件，优先级最高。

来看 demo-basic 的示例 `bootstrap.yml`（`demo-basic/demo-basic-biz/src/main/resources/bootstrap.yml`）：

```yaml
spring:
  application:
    # 应用名带上 ${user.name}，本地开发时每个人的实例名不冲突
    name: demo-basic-${user.name}-local
  profiles:
    active: dev          # 默认激活 dev profile（见第 1 课 profiles 概念）

app:
  id: demo-basic          # Apollo 用 app.id 找到这个应用的配置

apollo:
  bootstrap:
    enabled: true        # 开启 apollo 引导加载
    # 关键：声明这个服务要拉取哪些命名空间（namespace）
    # biz=业务配置 sys=系统配置 datasource=数据源 demo-platform.oss=对象存储……
    namespaces: biz,sys,datasource,demo-platform.oss,demo-platform.service-discovery,demo-platform.web-sdk,demo-platform.cache,demo-platform.datasource,demo-platform.base
    eagerLoad:
      enabled: true      # 提前加载，保证 logging 等配置也能用 apollo 的值
```

注意 `namespaces` 里有 `biz`、`datasource` 这种本服务私有的，也有 `demo-platform.oss`、`demo-platform.cache` 这种带前缀的——后者是**公共命名空间**，多个服务共享。

**前端类比**：`namespaces` 就像你按功能拆的多个 env 文件：私有的 `.env.local`（biz）+ 团队共享的 `.env.shared`（demo-platform.oss）。改一次共享命名空间，所有引用它的服务都生效，不用在每个仓库里复制粘贴。

---

# 四、环境隔离：test / staging / prod

同一份代码，跑在不同环境要连不同的 Apollo 服务器。接着上一节那份 demo-basic 的 `bootstrap.yml` 往下看——它用 Spring 多文档块（`---` 分隔）按 profile 切换 Apollo 地址：

```yaml
---
spring:
  profiles: dev                 # 本地开发环境
apollo:
  cluster: default
  meta: http://apollo-api.dev.example.com:8080   # dev 的 apollo 地址

---
spring:
  profiles: k8sbeta-HWCloud     # 测试环境（test）
apollo:
  cluster: default
  meta: http://apollo-api.test.example.com:8080  # test 的 apollo 地址

---
spring:
  profiles: k8sstaging            # 预发环境（staging，上线前最后一道）
apollo:
  cluster: staging                # 注意 cluster 也切到 staging
  meta: http://apollo.prod.example.com:8000

---
spring:
  profiles: canary                # 灰度环境
apollo:
  cluster: canary
  meta: http://apollo.prod.example.com:8000

---
spring:
  profiles: prod             # 生产环境（prod）
apollo:
  cluster: default
  meta: http://apollo.prod.example.com:8000
```

`meta` 是 Apollo 的「元服务地址」——应用先问它「我的配置在哪台机器上」，再去拉取。三套环境三个 meta 地址，做到了物理隔离。

```
profile=dev   →  meta: dev.example.com    →  拉 dev   的配置
profile=test  →  meta: test.example.com   →  拉 test  的配置
profile=staging →  meta: prod..., cluster=staging →  拉 staging 的配置
profile=prod  →  meta: prod..., cluster=default→ 拉 prod  的配置
```

启动时通过 `-Dspring.profiles.active=prod` 或环境变量指定用哪套。

| 前端 | Java + Apollo |
|------|---------------|
| `.env.development` | profile=dev + dev 的 apollo meta |
| `.env.staging` | profile=k8sstaging + staging 集群 |
| `.env.production` | profile=prod + prod 的 apollo meta |
| `vite build --mode production` | `java -Dspring.profiles.active=prod` |

核心区别还是那句：**前端的 env 是构建时定死的；Apollo 的值是运行时从对应环境的服务器实时拉的，线上能改。**

---

# 五、在代码里读取配置：两种姿势

配置拉下来后，怎么注入到 Java 代码里？两种主流方式。

## 5.1 `@Value`：读单个配置项

适合零散的、单个的配置值。看 demo-asset 的 `ApolloJsonExecutorProperties.java`：

```java
import org.springframework.beans.factory.annotation.Value;

@Component
public class ApolloJsonExecutorProperties {

    // ${key:默认值} —— 从 apollo 读 app.executors.refresh-interval
    // 冒号后面 10000 是默认值：apollo 上没配这个 key 时用它，避免启动报错
    @Value("${app.executors.refresh-interval:10000}")
    private long refreshInterval = 10000;

    @Value("${app.executors.monitor-interval:10000}")
    private long monitorInterval = 10000;

    @Value("${app.executors.init-on-startup:true}")
    private boolean initOnStartup = true;
}
```

`${app.executors.refresh-interval:10000}` 的语法拆开看：

```
${  app.executors.refresh-interval  :  10000  }
        └─ 配置 key ─┘                 └─默认值┘
```

**前端类比**：

```js
// JS 里读环境变量，带默认值兜底
const interval = process.env.REFRESH_INTERVAL ?? 10000
//                          └─── key ───┘        └默认┘
```

`@Value` 的 `:默认值` 就是 JS 里的 `?? 默认值` 或 `|| 默认值`，一个意思。

> 小贴士：demo 里还有个 Apollo 专用的 `@ApolloJsonValue`，能把一段 JSON 字符串配置直接反序列化成对象/Map。同一个文件里就有：
> ```java
> // 把 apollo 上的 JSON 字符串自动转成 Map<String, ExecutorConfig>
> @ApolloJsonValue("${app.executors:{\"image-recognize-executor\": {\"executorType\":1}}}")
> private Map<String, ExecutorConfig> executors = new HashMap<>();
> ```
> 类似前端 `JSON.parse(import.meta.env.VITE_CONFIG)`，但 Apollo 帮你 parse 好了。

## 5.2 `@ConfigurationProperties`：成组绑定到对象

当一组配置有共同前缀、属于同一块业务时，用 `@ConfigurationProperties` 把它们整体绑到一个类上更优雅。看 demo-asset 的 `PartnerApiProperties.java`：

```java
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "partner-api")  // 绑定所有 partner-api.* 开头的配置
public class PartnerApiProperties {
    private String url;        // 对应 apollo 里的 partner-api.url
    private String accessId;   // 对应 partner-api.access-id（驼峰自动匹配中划线）
    private String secretKey;  // 对应 partner-api.secret-key
}
```

Apollo 上配成这样：

```properties
partner-api.url=http://partner-api.example.com
partner-api.access-id=AKID...
partner-api.secret-key=xxx
```

Spring 自动按前缀把三个值塞进 `PartnerApiProperties` 对象。然后还需要一个 `@EnableConfigurationProperties` 让它生效（`PartnerApiConfig.java` / `AiBotConfig.java` 里都有）：

```java
@Configuration
@EnableConfigurationProperties({PartnerApiProperties.class})  // 注册这个配置类，让它能被注入
public class PartnerApiConfig {
    // ...
}
```

用的时候直接 `@Autowired` 注入（见第 5 课依赖注入）：

```java
@Service
@RequiredArgsConstructor
public class PartnerApiService {
    private final PartnerApiProperties partner-apiProperties;  // 注入即用

    public void call() {
        String url = partner-apiProperties.getUrl();      // 直接 get
    }
}
```

**前端类比**：`@ConfigurationProperties` 像把零散环境变量收拢成一个**强类型配置对象**：

```ts
// 前端常见做法：集中、带类型的 config 对象
interface PartnerApiConfig {
  url: string
  accessId: string
  secretKey: string
}
const partner-apiConfig: PartnerApiConfig = {
  url: import.meta.env.VITE_PARTNER_API_URL,
  accessId: import.meta.env.VITE_PARTNER_API_ACCESS_ID,
  secretKey: import.meta.env.VITE_PARTNER_API_SECRET_KEY,
}
```

`prefix = "partner-api"` 就是帮你自动收拢所有 `partner-api.*`，省去手写映射。

## 5.3 两种姿势怎么选

| | `@Value` | `@ConfigurationProperties` |
|---|---------|---------------------------|
| 适合 | 单个、零散的值 | 一组有共同前缀的配置 |
| 类型 | 简单类型为主 | 支持嵌套对象、List、Map |
| 默认值 | `${key:默认值}` | 字段直接赋初值 `= "xxx"` |
| 前端类比 | `process.env.X ?? d` | 强类型 config 对象 |

demo 里的 `AiBotProperties` 就是用 `@ConfigurationProperties` 绑定了一整棵嵌套结构（含 `List<ChatBot>`、`List<PromptTemplate>`），这是 `@Value` 干不了的：

```java
@Data
@ConfigurationProperties(prefix = "ai.bot")
@RefreshScope                       // ← 注意这个，下一节讲
public class AiBotProperties {
    private String host;            // ai.bot.host
    private String accessKey;       // ai.bot.access-key
    private List<ChatBot> chatBot;  // ai.bot.chat-bot[]，嵌套列表自动绑定
    // ...
}
```

---

# 六、动态刷新：Apollo 最香的能力

到这里都还只是「启动时读一次」。Apollo 真正区别于普通配置文件的，是**运行时改了配置，应用不重启就能拿到新值**。

## 6.1 `@RefreshScope`：让 Bean 自动用新值

注意上面 `AiBotProperties` 类上的 `@RefreshScope`。它的作用是：当 Apollo 上对应配置变更时，Spring 会**重建**这个 Bean，让它持有最新的值。

```
没有 @RefreshScope：启动读一次 host=A，之后永远是 A（改了也不知道）
有   @RefreshScope：apollo 把 host 改成 B → Bean 重建 → 下次读到的就是 B
```

**前端类比**：这正是「运行时远程配置」的核心体验。类似你用 Firebase Remote Config / LaunchDarkly：

```js
// 前端监听远程配置变化，值实时更新
remoteConfig.onChange((newConfig) => {
  featureFlag = newConfig.enableNewUI   // 不刷新页面就拿到新开关
})
```

`@RefreshScope` 就是后端版的「不重启就更新」。

## 6.2 监听变更事件：`@ApolloConfigChangeListener`

光给 Bean 加 `@RefreshScope` 还不够——Spring 得知道「配置变了，去刷新」。demo-asset 用一个监听器把 Apollo 的变更事件转成 Spring 的刷新动作（`ApolloConfigRefreshListener.java`）：

```java
@Component
@RequiredArgsConstructor
public class ApolloConfigRefreshListener {

    private final ApplicationContext applicationContext;
    // Spring 的刷新作用域管理器，负责重建所有 @RefreshScope 的 Bean
    private final RefreshScope refreshScope;

    /**
     * 监听 business 命名空间的配置变更
     * @param changeEvent 变更事件，里面带着哪些 key 变了
     */
    @ApolloConfigChangeListener(value = {"business"})  // 只监听 business namespace
    private void refresh(ConfigChangeEvent changeEvent) {
        // 发布环境变更事件，告诉 Spring 哪些 key 变了
        applicationContext.publishEvent(
            new EnvironmentChangeEvent(changeEvent.changedKeys()));
        // 刷新所有 @RefreshScope 的 Bean，让它们重新绑定新值
        refreshScope.refreshAll();
    }
}
```

整个动态刷新链路：

```
1. 运维在 Apollo 后台改了 business 命名空间的某个 key，点「发布」
        │
        ▼
2. Apollo 服务端把变更推送给应用（长轮询，秒级）
        │
        ▼
3. @ApolloConfigChangeListener("business") 的 refresh() 被触发
        │
        ▼
4. refreshScope.refreshAll() 重建所有 @RefreshScope 的 Bean
        │
        ▼
5. AiBotProperties 等 Bean 持有新值，业务代码无感拿到最新配置
        │
        ▼
   全程不重启、不发布、秒级生效 ✅
```

**前端类比**：这条链路等价于前端的「监听 → 触发回调 → 更新状态 → 视图重渲染」。Apollo 推送 = 服务端 push；`@ApolloConfigChangeListener` = `onChange` 回调；`refreshScope.refreshAll()` = `setState` 触发重新计算。

---

# 七、踩坑提醒

| 坑 | 说明 |
|----|------|
| 配置放错文件 | Apollo 相关配置（`app.id`、`namespaces`）要放 `bootstrap.yml`，放 `application.yml` 可能太晚加载不到 |
| 忘记声明 namespace | `bootstrap.yml` 的 `namespaces` 没写某个命名空间，里面的 key 一个都读不到 |
| `@Value` 没给默认值 | Apollo 上漏配该 key，启动直接报错。养成写 `${key:默认值}` 的习惯 |
| 改了配置忘点「发布」 | Apollo 后台「保存」≠「发布」，只有发布才会推送到应用 |
| 期望动态刷新却没加 `@RefreshScope` | 没加的 Bean 只在启动读一次，线上改了不生效 |
| 把密钥提交到代码 | 密钥类配置（secretKey 等）应放 Apollo，绝不写进 Git |

---

# 八、本课小结

- **为什么用配置中心**：避免配置写死在代码里——换环境不用改代码、密钥不进 Git、改配置不走完整发布流程。前端类比是「环境变量 + 运行时可改的远程配置（Firebase Remote Config）」。
- **Apollo 核心模型**：App（应用）/ Environment（环境）/ Cluster（集群）/ Namespace（命名空间）/ Item（配置项）。namespace 类似按功能拆的多个 env 文件，公共 namespace（`demo-platform.oss`）可跨服务共享。
- **接入方式**：启动类 `@EnableApolloConfig` 开关 + `bootstrap.yml` 里 `app.id` 和 `namespaces` 声明拉哪些配置（demo-basic 示例示例）。
- **环境隔离**：用 Spring profile（dev/test/staging/canary/prod）切换不同的 `apollo.meta` 地址和 `cluster`，做到物理隔离（demo-basic bootstrap.yml 多文档块示例）。
- **读取配置两姿势**：`@Value("${key:默认值}")` 读单值（≈ `process.env.X ?? d`）；`@ConfigurationProperties(prefix=...)` 成组绑到强类型对象（≈ 前端 config 对象，支持嵌套/List/Map，PartnerApiProperties、AiBotProperties 示例）。
- **动态刷新**：`@RefreshScope` 让 Bean 用新值 + `@ApolloConfigChangeListener` 监听变更并 `refreshScope.refreshAll()`，实现线上改配置秒级生效、不重启（ApolloConfigRefreshListener 示例）。

> **下一课预告**：第 25 课《XXL-JOB 分布式定时任务》。学完配置中心，我们来看后端如何跑定时任务——前端的 `setInterval` 只能在单个浏览器里转，后端要在多实例集群里精准调度、可视化管理、失败重试。demo 里 `XxlJobConfig`、`XxlJobProperties` 已经埋好伏笔，下节揭晓。

# 九、总结

- **为什么不把配置写死在代码里**：前端类比：你绝不会把后端 API 地址写死在组件里。
- **Apollo 是什么：一句话与一张图**：Apollo（阿波罗）是携程开源的分布式配置中心。
- **demo 里怎么接入 Apollo（匿名化示例代码）**：demo-asset 的启动类上加了一个注解就打开了 Apollo（VehicleBizApplication.java）：
- **环境隔离：test / staging / prod**：同一份代码，跑在不同环境要连不同的 Apollo 服务器。

## 参考资料

- [Dev.java 学习路径](https://dev.java/learn/)
- [Spring Boot 文档](https://docs.spring.io/spring-boot/)
