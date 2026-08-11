# Java（18）- demo-basic 项目结构 —— 一个微服务的四个房间

> 读完你能：围绕“demo-basic 项目结构 —— 一个微服务的四个房间”理解“先用前端心智建立直觉”与“四个房间各装什么（对照示例目录）”，并结合正文示例完成实践与排障。

> 前 17 课我们一直在看单个类、单个方法。这一课往后退一步，看清整个 demo-basic 服务是怎么被拆成 biz / client / common / service 四个模块的，以及"为什么微服务非得这么拆"。

# 一、先用前端心智建立直觉

你在前端早就习惯"一个仓库拆成多个包"了。比如一个 monorepo：

```
my-monorepo/
├── packages/ui        # 组件库，给别的 App 引用
├── packages/shared    # 共享类型、工具函数
├── packages/web-app   # 真正跑起来的应用
└── packages/api-sdk   # 封装好的接口调用，别的 App import 它就能调你
```

demo-basic 就是 Java 世界的同款 monorepo。一个微服务 = 一个 Maven 多模块工程（`packaging` 是 `pom`），下面挂 4 个子模块（`<module>`）：

```xml
<!-- demo-basic/pom.xml 示例片段 -->
<artifactId>demo-basic</artifactId>
<packaging>pom</packaging>   <!-- pom 类型 = 它自己不产出代码，只是个容器，约等于 monorepo 根目录 -->

<modules>
    <module>demo-basic-common</module>   <!-- 共享 DTO，约等于 packages/shared -->
    <module>demo-basic-service</module>  <!-- 核心业务逻辑 + 数据库，约等于业务实现层 -->
    <module>demo-basic-client</module>   <!-- Feign 接口，约等于 packages/api-sdk -->
    <module>demo-basic-biz</module>      <!-- Controller + 启动类，约等于 packages/web-app -->
</modules>
```

| 前端 monorepo | demo 微服务模块 | 角色 |
|---|---|---|
| `packages/shared`（共享类型/工具） | `demo-basic-common` | 放 In/Out DTO，谁都能依赖 |
| 业务实现（service 层 + DB 访问） | `demo-basic-service` | Service + Mapper + entity + 启动配置 |
| `packages/api-sdk`（封装好的调用） | `demo-basic-client` | Feign 接口，给**别的微服务** import 来调你 |
| `packages/web-app`（跑起来的应用） | `demo-basic-biz` | Controller + `main()` 启动类，真正打成镜像跑的那个 |

> 注意一个反直觉点：名字带 `biz`（business 业务）的模块里其实只有 Controller 这层很薄的"接活"代码，真正干活的业务逻辑全在 `service` 模块。下面会解释为什么这么安排。

# 二、四个房间各装什么（对照示例目录）

## 2.1 demo-basic-common —— 共享 DTO 房间

只放数据结构，不放逻辑。最关键的是 `in` 和 `out` 两个包：

```
demo-basic-common/.../common/
├── in/          # 入参 DTO，约定俗成以 In 结尾，如 OrganizationIn
│   ├── OrganizationIn.java
│   ├── OrganizationTreeIn.java
│   └── ...
├── out/         # 出参 DTO，以 Out 结尾，如 OrganizationOut
│   ├── OrganizationOut.java
│   └── ...
├── enums/       # 共享枚举
└── constant/    # 共享常量
```

【前端类比】这就是你的 `packages/shared/types.ts`：

```typescript
// 前端 shared 包：定义请求/响应的形状
export interface OrganizationIn { name: string; groupId: number }
export interface OrganizationOut { id: number; name: string }
```

```java
// Java common 包：同样只是数据形状（配 Lombok @Data，见第 8 课）
@Data
public class OrganizationOut {
    private Integer id;      // 网点 id
    private String name;     // 网点名称
    // ...
}
```

为什么单独抽一个 common？因为 `client` 模块要用这些 DTO，`service` 模块也要用。如果不抽出来，两边各定义一份就会对不上。**common 是唯一一个被其它三个模块都依赖的底座。**

## 2.2 demo-basic-service —— 真正干活的房间

业务逻辑、数据库访问、启动配置全在这。这是四个模块里最重的一个：

```
demo-basic-service/.../service/
├── service/     # Service：业务逻辑，如 OrganizationService
├── mapper/      # Mapper：操作数据库的接口，如 OrganizationMapper（见第 4 课五站的第四站）
├── entity/      # entity：和数据库表一一对应的类，如 Organization
├── config/      # 各种 Spring 配置
└── DemoBasicAdminApplication.java  ❌ 不在这，启动类在 biz（见下）
```

OrganizationService / OrganizationMapper / Organization 这三兄弟在 demo-basic 里是常见的，正好对应第 4 课讲的"Controller → Service → Mapper → MySQL"后半程。

## 2.3 demo-basic-client —— 对外接口房间（最容易被前端误解的一个）

这个模块的存在，是微服务架构特有的。它放的是 **Feign 接口**：

```java
// demo-basic-client/.../feign/RemoteBasicOrganizationService.java 匿名化示例代码
@FeignClient(contextId = "remoteBasicOrganizationService", value = "demo-basic",
        fallbackFactory = RemoteBasicOrganizationServiceFallbackFactory.class)
public interface RemoteBasicOrganizationService {

    /**
     * 查询网点（按 id）
     * @param id 网点 id
     * @return 用 R 包装的网点出参（R 是统一响应壳，见第 4 课）
     */
    @GetMapping("/api/organization/getById")
    R<OrganizationOut> getById(@RequestParam("id") int id);
}
```

【前端类比】它就是你封装的 `api-sdk`。前端你会这么干：

```typescript
// packages/api-sdk/organization.ts —— 别的 App import 它就能调，不用自己拼 URL
export const organizationApi = {
  getById: (id: number) => http.get<OrganizationOut>('/api/organization/getById', { params: { id } })
}
```

Java 这边更狠：它**只写接口不写实现**（`interface`，没有方法体）。`@FeignClient` 这个注解（见第 8 课注解）会让 Spring 在运行时自动生成一个实现——把"调用这个方法"翻译成"发一个 HTTP 请求到 demo-basic 服务"。

所以别的微服务（比如 demo-order-cost 运单服务）想查网点信息，根本不用关心 demo-basic 部署在哪台机器、IP 是多少，只要：

```java
@Autowired
private RemoteBasicOrganizationService organizationService;  // 注入这个 Feign 接口（见第 5 课 @Autowired）

OrganizationOut organization = organizationService.getById(123).getData();  // 像调本地方法一样，底层是跨服务 HTTP
```

## 2.4 demo-basic-biz —— 启动 + 接活房间

它放两样东西：**启动类**和**Controller**。

```java
// demo-basic-biz/.../DemoBasicAdminApplication.java 匿名化示例代码
@EnableFeignClients(basePackages = {"com.example.platform"})  // 扫描并激活所有 Feign 接口
@ComponentScan({"com.example.platform"})                       // 扫描所有 @Component/@Service/@Controller
@SpringCloudApplication                                    // 微服务全家桶注解：= @SpringBootApplication + 服务注册发现 + 熔断
@EnableScheduling                                          // 开启定时任务
public class DemoBasicAdminApplication {
    // main 方法 = 整个服务的入口，约等于前端的 index.ts / main.tsx
    public static void main(String[] args) {
        SpringApplication.run(DemoBasicAdminApplication.class, args);
    }
}
```

【前端类比】这个 `main()` 就是 `ReactDOM.createRoot(...).render(<App/>)` 或 Vite 的 `main.ts`——整个应用真正"跑起来"的那一行。打镜像部署的就是这个模块。

Controller 也在这里，注意它和 client 里 Feign 接口的对应关系：

```java
// demo-basic-biz/.../controller/OrganizationController.java 匿名化示例代码
@RestController
@RequestMapping("/organization")             // 类级前缀
public class OrganizationController extends BaseController {

    @Autowired
    private OrganizationService organizationService;   // 注入 service 模块里的业务类

    @GetMapping("/getById")
    public R<OrganizationOut> getOrganization(@RequestParam("id") int id) {
        return R.ok(organizationService.getOrganization(id));  // Controller 只接活，转手交给 Service
    }
}
```

> 细节彩蛋：Controller 源码上写的是 `/organization/getById`，而 Feign 接口上是 `/api/organization/getById`，多了个 `api` 前缀。这个前缀不是手写的，也不是网关加的，而是 biz 模块自己的 Spring MVC 配置加的——`WebAppConfig.configurePathMatch()` 里调了 `configurer.addPathPrefix("api", ...)`，给 `controller` 包下的所有 Controller 统一拼上 `api`（但 `controller.inner` 包下的故意不加）。所以 Controller 真正生效的运行时路径就是 `/api/organization/getById`，Feign 接口照着这个示例路径写，自然就对得上了。
> 【前端类比】等于你在前端路由表里写 `/getById`，但框架配了个 `basename: '/api'`，最终浏览器里访问的是 `/api/getById`——源码里的相对路径和实际生效路径不是一回事。

# 三、四个模块的依赖关系（最重要的一张图）

依赖方向是单向的，绝不能反着来。从各模块 `pom.xml` 里的 `<dependency>` 能读出来：

```
                  ┌─────────────────────────┐
                  │   demo-basic-common       │  ← 底座，谁都依赖它，它谁都不依赖
                  │   (In/Out DTO、枚举、常量) │
                  └─────────────────────────┘
                       ▲                 ▲
            依赖        │                 │   依赖
          ┌────────────┘                 └────────────┐
          │                                           │
┌──────────────────┐                       ┌────────────────────┐
│ demo-basic-client │                       │ demo-basic-service  │
│ (Feign 接口)      │                       │ (Service/Mapper/   │
│                  │                       │  entity/启动配置)   │
└──────────────────┘                       └────────────────────┘
   ▲ 给别的微服务用                                    ▲
   │                                                  │ 依赖
   │                                       ┌────────────────────┐
   │                                       │  demo-basic-biz     │
   └────────(别的服务 import client)         │ (Controller+启动类) │
                                            └────────────────────┘
            biz 依赖 service，service 依赖 common，client 依赖 common
            最终 biz 这个模块被打成镜像跑起来（含 main 方法）
```

各 `pom.xml` 里的示例依赖声明：

| 模块 | 它依赖谁（pom 里写的） | 含义 |
|---|---|---|
| `common` | demo-common-core（基础工具） | 最底层，不依赖本服务任何模块 |
| `client` | `demo-basic-common` | 要用 In/Out DTO 当方法签名 |
| `service` | `demo-basic-common` + demo-common-web 等 | 业务逻辑要用 DTO，还要 web/DB 能力 |
| `biz` | `demo-basic-service` | Controller 要调 Service，顺带传递拿到 common |

一句话记忆链：**biz → service → common**，同时 **client → common**。

# 四、为什么微服务非得这么拆？

如果你想"全塞一个模块不香吗"，看下面三个理由，每个都对应一个前端你踩过的坑。

## 4.1 理由 1：client 必须和实现分离，否则别人引你就引爆了

别的微服务（demo-order-cost）想调 demo-basic，它只 import `demo-basic-client`（一个很薄的接口 jar）。

如果接口和实现（Service、Mapper、数据库连接、几百个依赖）混在一起，demo-order-cost 一引用，就会把 demo-basic 的整个数据库驱动、MyBatis、一堆 starter 全拖进自己的工程，依赖瞬间爆炸还冲突。

【前端类比】这就是你为什么把 `api-sdk` 和 `web-app` 拆开：别人要调你的接口，只该拿到一个轻量 SDK，而不是把你整个 App 连同 webpack 配置一起 npm install 进来。

## 4.2 理由 2：common 抽出来，client 和 service 才能共用同一套 DTO

`client` 里 `getById` 返回 `R<OrganizationOut>`，`service` 里 `OrganizationService.getOrganization` 也返回 `OrganizationOut`。两边引的是 common 里**同一个** `OrganizationOut`。

【前端类比】等于前后端共享同一份 `types.ts`。一旦字段对不上（前端以为有 `name`，后端返回 `organizationName`），编译期就报错，而不是上线后白屏。

## 4.3 理由 3：biz 薄、service 厚，是为了"逻辑可被复用、可被测试"

Controller（biz）只负责"解析 HTTP 参数 → 调 Service → 包装返回"，是很薄的一层。真正的业务逻辑沉在 service。这样：

- 同一段业务逻辑，既能被 HTTP Controller 调，也能被定时任务（`jobhandler`）、MQ 消费者（`mq`）调，不用复制。
- 写单元测试时（见后续课程）直接测 Service，不用启动整个 HTTP 服务器。

【前端类比】就是你常说的"组件里别写业务逻辑，抽到 hooks / composables / store 里去"。`<OrganizationView>` 组件（≈Controller）只管渲染和取参，`useOrganization()` hook（≈Service）才管真正的数据逻辑，这样多个组件能复用同一个 hook。

# 五、把一个请求重走一遍（串起四个模块）

以"别的服务查网点 id=123"为例，看四个模块怎么协作：

```
demo-order-cost 服务里：
  organizationService.getById(123)         调的是 client 模块的 Feign 接口
        │ Feign 把它翻译成 HTTP：GET /api/organization/getById?id=123
        ▼
  ┌─── demo-basic 服务（由 biz 模块的 main 启动）───────────────┐
  │  OrganizationController.getOrganization(123)      biz 模块：接活      │
  │        │ 入参 int id，出参 R<OrganizationOut>（OrganizationOut 来自 common）│
  │        ▼                                                   │
  │  OrganizationService.getOrganization(123)         service 模块：干活  │
  │        │                                                   │
  │        ▼                                                   │
  │  OrganizationMapper → MySQL → Organization entity  service 模块：取数 │
  │        │ entity 转成 OrganizationOut（common 的 DTO）            │
  │        ▼                                                   │
  │  R.ok(organizationOut) 一路返回                                  │
  └───────────────────────────────────────────────────────────┘
```

注意 `OrganizationOut` 这个 DTO 是怎么"穿过"所有边界的：service 产出它 → biz 包装它 → 通过 HTTP 序列化 → client 反序列化回它。全程是 common 里同一个类定义，这就是把 common 单拎出来的价值。

# 六、本课小结

- demo-basic 是一个 Maven 多模块工程（`packaging=pom`），像前端 monorepo，下挂 4 个子模块。
- **common**：只放 In/Out DTO、枚举、常量，是被其它三模块共同依赖的底座（如 `OrganizationIn`/`OrganizationOut`）。
- **service**：最厚的模块，装 Service + Mapper + entity，真正的业务逻辑和数据库访问都在这（如 `OrganizationService`/`OrganizationMapper`/`Organization`）。
- **client**：只写 Feign **接口**不写实现，封装成"SDK"给别的微服务 import 调用（如 `RemoteBasicOrganizationService`），约等于前端的 api-sdk 包。
- **biz**：装启动类（`DemoBasicAdminApplication` 的 `main`，真正跑起来的那个）和 Controller（薄薄一层接活），约等于前端的 web-app。
- 依赖单向：**biz → service → common**，**client → common**，绝不能反向。
- 这么拆的三个理由：① client 分离避免别人引你时依赖爆炸；② common 共享 DTO 保证两端字段对齐；③ biz 薄 service 厚让业务逻辑可复用、可单测。
- 示例说明：Controller 源码写 `/organization/getById`，运行时被 biz 模块的 `WebAppConfig.addPathPrefix("api", ...)` 自动拼成 `/api/organization/getById`，Feign 接口照示例路径写，所以两端能对上。

下一课预告 —— **第 19 课：Maven 依赖管理与版本号**，我们会深入讲 `demo-parent` 这个父 pom 是怎么统一管理所有子模块版本的（约等于前端 monorepo 根 `package.json` 里锁版本 + workspace），以及 `5.1.0-SNAPSHOT` 里的 SNAPSHOT 到底是什么意思。

# 七、总结

- **为什么微服务非得这么拆？**：如果你想"全塞一个模块不香吗"，看下面三个理由，每个都对应一个前端你踩过的坑。
- **先用前端心智建立直觉**：你在前端早就习惯"一个仓库拆成多个包"了。
- **四个房间各装什么（对照示例目录）**：只放数据结构，不放逻辑。
- **四个模块的依赖关系（最重要的一张图）**：依赖方向是单向的，绝不能反着来。
