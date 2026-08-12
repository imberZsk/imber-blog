# Java（23）- Feign 声明式远程调用

> 读完你能：围绕“Feign 声明式远程调用”理解“问题的起点：服务拆开了，怎么互相调用？”与“1 前端类比”，并结合正文示例完成实践与排障。

> 还记得第 18 课说的微服务拆分吗？拆完之后服务 A 怎么调服务 B？答案就是 Feign —— 你只写一个接口，连函数体都不用写，就能像调本地方法一样调远程服务。它本质上就是后端版的「封装好的 axios」。

---

# 一、问题的起点：服务拆开了，怎么互相调用？

第 18 课我们讲过，demo 不是一个大单体，而是拆成了一堆独立部署的微服务：`demo-basic`（基础数据/网点）、`demo-billing`（财务钱包）、`demo-asset`（车务）等等。每个服务是一个独立的 Spring Boot 进程，跑在不同机器、不同端口上。

那么问题来了：车务服务 `demo-asset` 要展示「司机所属网点名称」，但网点数据归 `demo-basic` 管。车务进程里根本没有网点表，怎么拿数据？

只能发 HTTP 请求去问 `demo-basic`。

## 1.1 前端类比

这件事你在前端天天干。你的 React 页面要展示用户信息，但数据在后端，你不会自己编数据，而是：

```ts
// 前端：调后端接口拿数据
const data = await axios.get('/api/organization/getById', { params: { id: 123 } });
const organization = data.data;
```

后端服务之间互相调用，本质上是**同一件事**：一个进程通过 HTTP 去请求另一个进程的接口。区别只是：前端是「浏览器 → 后端」，这里是「后端服务 A → 后端服务 B」。

---

# 二、不用 Feign 会有多痛？

如果手写 HTTP 调用，每次都要这样（伪代码）：

```java
// 手写 HTTP 调用，每个接口都要重复这一坨
String url = "http://demo-basic/api/organization/getById?id=" + id;  // 拼 URL
HttpResponse resp = httpClient.get(url);                         // 发请求
String json = resp.getBody();                                    // 拿到字符串
BasicOrganizationRespDTO organization = JSON.parse(json, BasicOrganizationRespDTO.class); // 手动反序列化
```

每调一个接口就要：拼 URL、发请求、处理状态码、手动 JSON 反序列化、处理异常……几十个接口就是几十遍重复劳动。

## 2.1 前端早就受不了了

前端早期用原生 `fetch` 也是这种痛苦，所以大家都封装了 axios 实例：

```ts
// axios：封装一次，到处调用，自动序列化/反序列化
const api = axios.create({ baseURL: 'http://demo-basic' });
const data = await api.get('/api/organization/getById', { params: { id } });
const organization = data.data;  // axios 返回的是响应对象，数据在 data.data 里
```

**Feign 就是 Java 后端的「axios 封装」**，而且更进一步：你连 `api.get(...)` 都不用写，只要**声明一个接口**，Feign 帮你把接口变成真正能发请求的对象。

---

# 三、client 模块：服务间的「接口契约」

第 18 课提到每个服务旁边都有一个 `xxx-client` 模块（比如 `demo-basic-client`、`demo-billing-client`）。现在揭晓它的作用：

> **client 模块 = 这个服务对外暴露的「调用说明书」**，里面放 Feign 接口和传输用的 DTO。

谁想调 `demo-basic`，就在自己的 `pom.xml` 里依赖 `demo-basic-client`，拿到现成的接口直接用，不用关心 URL 怎么拼、参数怎么传。

## 3.1 前端类比

这就像一个团队把后端接口的 TS 类型 + 请求函数打包成一个 npm 包发出去：

| 前端世界 | demo 后端世界 |
| --- | --- |
| `@organization/api-sdk` (npm 包) | `demo-basic-client` (Maven 模块) |
| 包里导出的 `getOrganizationById()` 函数 | client 里的 `BasicOrganizationClient` 接口 |
| 包里的 `Organization` TS interface | client 里的 `BasicOrganizationRespDTO` 类 |
| `npm install @organization/api-sdk` | `pom.xml` 里 `<dependency>` 引入 client |

```
┌────────────────────┐         依赖          ┌──────────────────────┐
│  demo-asset     │ ───────────────────► │  demo-basic-client    │
│  (调用方/消费者)     │   pom 引入 client     │  (接口契约 + DTO)     │
└────────────────────┘                       └──────────────────────┘
                                                        ▲
                                                        │ 实现这些接口
                                              ┌──────────────────────┐
                                              │  demo-basic-service   │
                                              │  (服务提供方/被调用)   │
                                              └──────────────────────┘
```

---

# 四、@FeignClient：声明即调用

看 demo 车务服务里调网点的示例接口（文件：`demo-asset/.../client/basic/BasicOrganizationClient.java`）：

```java
/**
 * 网点相关接口（Feign 声明式客户端）
 * 这是个 interface，没有任何方法体 —— Feign 会在运行时自动生成实现
 */
@FeignClient(contextId = "basicOrganizationClient",   // 同一服务多个 client 时用它区分，避免 Bean 冲突
        name = "demo-basic",                      // 关键：目标服务名，Feign 靠它找到 demo-basic 的地址
        configuration = SnakeCaseEncoderAndDecoder.class) // 自定义编解码（蛇形命名转换）
public interface BasicOrganizationClient {

    /**
     * 根据 id 查询单个网点
     * @param id 网点 id，通过 ?id=xxx 拼到 URL 上
     * @return 统一响应包装，data 里是网点详情
     */
    @GetMapping("/api/organization/getById")
    DemoCommonRespDTO<BasicOrganizationRespDTO> queryOrganization(@RequestParam("id") Integer id);

    /**
     * 批量查询网点（ids 会拼成 ?ids=1,2,3）
     * @param ids 网点 id 集合
     * @return 网点列表
     */
    @GetMapping("/api/organization/getByIds")
    DemoCommonRespDTO<List<BasicOrganizationRespDTO>> queryOrganizationList(@RequestParam("ids") Collection<Integer> ids);
}
```

注意这个接口**没有一行实现代码**。Spring 启动时，Feign 会扫描到 `@FeignClient`，动态生成一个实现类（还记得第 08 课的反射和动态代理吗？就是那套机制），帮你把方法调用翻译成 HTTP 请求。

## 4.1 还记得第 04 课吗？这里完美闭环

第 04 课我们追踪过 demo-basic 里 `OrganizationController.getById` 这个示例接口。现在你看到了**另一端**：车务服务通过 `BasicOrganizationClient.queryOrganization(id)` 调的，正是同一个 `/api/organization/getById`。

```
demo-asset 进程                          demo-basic 进程
─────────────────                          ─────────────────
basicOrganizationClient                          OrganizationController
  .queryOrganization(123)                          .getById(123)
       │                                          ▲
       │  Feign 翻译成 HTTP                        │ 第04课讲的五站之旅
       │  GET /api/organization/getById?id=123        │ 网关→Controller→Service→Mapper→MySQL
       └──────────────────────────────────────────┘
```

调用方写的是 `queryOrganization(123)`，看起来就像调本地方法；底层 Feign 默默发了一个跨进程的 HTTP 请求。**这就是「声明式远程调用」—— 声明接口长什么样，调用细节交给框架。**

## 4.2 注解对照：和 Controller 长得几乎一样

眼尖的你会发现，Feign 接口上的注解跟第 04/08 课的 Controller 注解一模一样。这不是巧合 —— Feign 故意复用了 Spring MVC 的注解，降低学习成本：

| 注解 | 在 Controller（服务端） | 在 @FeignClient（调用端） |
| --- | --- | --- |
| `@GetMapping("/x")` | 我**提供**这个 GET 接口 | 我要**调用**这个 GET 接口 |
| `@RequestParam("id")` | 从 URL query 里**取** id | 把 id **拼到** URL query 上 |
| `@RequestBody` | 从请求体**读** JSON | 把对象**序列化**成 JSON 放进请求体 |

同一套注解，在两端是「镜像」关系：一端声明「我提供」，一端声明「我要调」。

---

# 五、像调本地方法一样使用

Feign 接口声明好后，在业务代码里直接像普通 Spring Bean 一样注入使用。看 demo 车务匿名化示例代码（文件：`demo-asset/.../manager/client/BasicOrganizationManager.java`）：

```java
@Slf4j
@Component
@RequiredArgsConstructor  // Lombok 生成构造器，配合 final 字段做构造器注入（见第05课）
public class BasicOrganizationManager {

    // 直接注入 Feign 接口，就像注入普通 Service 一样
    // 你拿到的其实是 Feign 运行时生成的代理对象
    private final BasicOrganizationClient basicOrganizationClient;

    private static final String FAIL_MSG = "查询网点信息失败";   // 远程调用失败的提示语
    private static final String NO_COMPANY_FAIL_MSG = "网点不存在"; // 查不到数据的提示语

    /**
     * 查询单个网点详情
     * @param organizationId 网点 id
     * @return 网点详情，查不到则抛业务异常
     */
    public BasicOrganizationRespDTO queryOrganization(Integer organizationId) {
        // 看这行：调远程服务，写法和调本地方法毫无区别
        DemoCommonRespDTO<BasicOrganizationRespDTO> organizationResp = basicOrganizationClient.queryOrganization(organizationId);

        // 分支：响应为空或业务标记失败时，统一抛业务异常（见第07课异常处理）
        if (organizationResp == null || !organizationResp.succeed()) {
            throw Exceptions.business(FAIL_MSG);
        }
        // data 可能为 null（网点不存在），用 Optional 兜底（见第06课）
        return Optional.ofNullable(organizationResp.getRes())
                .orElseThrow(() -> Exceptions.business(NO_COMPANY_FAIL_MSG));
    }
}
```

重点体会 `basicOrganizationClient.queryOrganization(organizationId)` 这一行：它和你调用本地任何对象的方法**写法完全一样**，但背后是一次完整的跨服务 HTTP 请求。这就是 Feign 的魅力 —— 把网络调用的复杂度藏起来了。

## 5.1 前端类比

跟你在 Vue 组件里调用封装好的 API 函数是一个感觉：

```ts
// 前端：调一个封装好的请求函数，不关心底层 fetch/拦截器/序列化
async function loadOrganization(id: number) {
  const organization = await organizationApi.getById(id);  // 看起来像普通函数调用
  if (!organization) throw new Error('网点不存在');
  return organization;
}
```

你调 `organizationApi.getById(id)` 时也不会去想 URL、headers、JSON.parse —— 那些都被封装层吃掉了。Feign 就是后端的这层封装。

---

# 六、降级与熔断：远程调用会失败，怎么办？

本地方法调用几乎不会「失败」（顶多抛异常）。但远程调用多了一堆新风险：

- 目标服务挂了 / 重启中
- 网络抖动、超时
- 目标服务太慢，把调用方也拖死

## 6.1 前端早就懂这个道理

前端调接口时你一定写过这种防御：

```ts
try {
  const data = await api.getWallet(userId);
  render(data);
} catch (e) {
  // 接口挂了别让整个页面白屏，给个兜底
  render({ balance: '--', tip: '钱包服务暂时不可用' });
}
```

后端的「**服务降级（fallback）**」就是这个思路：远程服务调不通时，不要把异常往上抛炸掉整条链路，而是**返回一个事先准备好的兜底结果**，保证调用方还能继续跑。

而「**熔断（circuit breaker）**」更进一步：如果某个服务持续大量失败，框架会「拉闸」—— 一段时间内**不再真正发请求**，直接走降级逻辑，避免无效请求把系统拖垮。等过一会儿再尝试恢复。

```
正常：A ──HTTP──► B (B 正常返回)

降级：A ──HTTP──► B (B 挂了/超时)
       └──► 走 fallback，返回兜底数据，A 不崩

熔断：B 连续失败 N 次后「拉闸」
      A ──✗ 不再发请求，直接走 fallback (保护 B 也保护 A)
      过一段时间「半开」试探，B 恢复了就合闸
```

## 6.2 demo 示例的降级实现

demo 财务服务的钱包接口就配了降级。三个文件配合完成（文件位于 `demo-billing-client/.../feign/`）：

**第一步：在 @FeignClient 上挂 fallbackFactory**

```java
// fallbackFactory：指定降级工厂，调用失败时由它产出兜底实现
// 注意：这里用的是 value，它和上面 BasicOrganizationClient 里的 name 是同一个东西（别名），都表示目标服务名
@FeignClient(contextId = "remoteWalletService", value = "demo-billing",
        fallbackFactory = RemoteWalletServiceFallbackFactory.class)
public interface RemoteWalletService {

    /**
     * 查询账户信息
     * @param walletInfoReq 钱包查询请求体
     * @return 账户信息（统一响应 R 包装）
     */
    @PostMapping("api/wallet/info")
    R<WalletInfoResp> info(@RequestBody WalletInfoReq walletInfoReq);
}
```

**第二步：工厂负责把异常传给降级实现**

```java
@Component
public class RemoteWalletServiceFallbackFactory implements FallbackFactory<RemoteWalletService> {
    /**
     * 远程调用失败时被框架调用，throwable 是失败的原因
     * @param throwable 触发降级的异常（超时/连接失败等）
     * @return 一个 RemoteWalletService 的兜底实现
     */
    @Override
    public RemoteWalletService create(Throwable throwable) {
        RemoteWalletServiceFallbackImpl impl = new RemoteWalletServiceFallbackImpl();
        impl.setCause(throwable);  // 把失败原因塞进去，方便降级里打日志
        return impl;
    }
}
```

**第三步：降级实现 —— 真正的「兜底逻辑」**

```java
@Slf4j
@Service
public class RemoteWalletServiceFallbackImpl implements RemoteWalletService {

    @Setter
    private Throwable cause;  // 存储触发降级的异常原因，用于日志排查

    /**
     * info 接口的降级版本：远程调不通时走这里
     * @param walletInfoReq 原始请求（这里用不上，但签名必须一致）
     * @return 统一的错误响应，而不是抛异常炸掉调用方
     */
    @Override
    public R<WalletInfoResp> info(WalletInfoReq walletInfoReq) {
        log.error("feign_wallet_info_fail", cause);  // 关键：把失败原因记下来，方便排查
        return R.error(cause.getMessage());          // 返回错误结果，让调用方优雅处理
    }
}
```

> 串起来理解：正常时调用走真实 HTTP；一旦 `demo-billing` 挂了或超时，Feign 不抛异常，而是调 `FallbackFactory.create(throwable)` 把失败原因传进去、拿到 `FallbackImpl`，执行里面的 `info()`，返回一个 `R.error(...)`。调用方拿到的是「失败但有结构」的结果，而不是一个把链路炸穿的异常。

> 补充一点：demo 这里 import 的是 `feign.hystrix.FallbackFactory`，也就是降级+熔断由 **Hystrix** 提供。上面讲的「连续失败就拉闸」的熔断能力，正是 Hystrix 在背后统计失败率、自动开关电路实现的，你只要写好 `FallbackImpl` 兜底逻辑即可。

和前端那个 `try/catch` 渲染兜底 UI 的逻辑，本质完全一致 —— 只不过后端把兜底逻辑抽成了独立的实现类，更规整。

---

# 七、完整心智模型

把这一课串成一张图：

```
┌─────────────────────── demo-asset (调用方) ───────────────────────┐
│                                                                        │
│  BasicOrganizationManager                                                   │
│    private final BasicOrganizationClient client;  ← 注入 Feign 代理对象      │
│            │                                                           │
│            │ client.queryOrganization(123)   ← 写法 = 调本地方法            │
│            ▼                                                           │
│  ┌──────────────────┐                                                  │
│  │ Feign 动态代理     │ 1. 读 @GetMapping/@RequestParam → 拼出请求       │
│  │ (运行时生成)       │ 2. 找 name="demo-basic" 的服务地址               │
│  └──────────────────┘ 3. 发 HTTP，反序列化响应                          │
│            │                          │ 失败时                          │
│            │ 成功                      ▼                                │
│            │                  ┌───────────────┐                        │
│            │                  │ Fallback 降级  │ → 返回兜底结果           │
│            │                  └───────────────┘                        │
└────────────┼───────────────────────────────────────────────────────────┘
             │ GET /api/organization/getById?id=123
             ▼
┌─────────── demo-basic (服务提供方) ───────────┐
│  OrganizationController.getById(123)  ← 第04课     │
│    → Service → Mapper → MySQL                │
└──────────────────────────────────────────────┘
```

---

# 八、本课小结

- **client 模块**是一个服务对外的「调用说明书」，存放 Feign 接口 + 传输 DTO；想调谁就在 `pom.xml` 引入谁的 client，类比前端发布一个 `api-sdk` npm 包。
- **`@FeignClient`** 标注在 interface 上，靠 `name`（目标服务名）定位服务；方法上复用 `@GetMapping`/`@RequestParam`/`@RequestBody` 等 Spring MVC 注解，与 Controller 形成「镜像」。
- Feign 接口**没有实现体**，Spring 启动时用动态代理（第 08 课的反射机制）自动生成实现，把方法调用翻译成 HTTP 请求。
- 调用时**像调本地方法一样**：`basicOrganizationClient.queryOrganization(id)` 背后是一次跨进程 HTTP，复杂度被框架吃掉了 —— 本质就是后端版「封装好的 axios」。
- **降级（fallback）** = 远程调不通时返回兜底结果，不炸链路（对应前端 try/catch 渲染兜底 UI）；**熔断** = 持续失败时主动「拉闸」停止发请求，保护双方。demo 用 `fallbackFactory` + `FallbackFactory` + `FallbackImpl` 三件套实现。
- 与第 04 课闭环：车务的 `BasicOrganizationClient.queryOrganization` 调的正是 demo-basic 的 `/api/organization/getById`，两端同一套注解、同一个接口路径。

> **下一课预告（第 24 课）**：服务之间能互相调用了，但「调用方怎么知道 `demo-basic` 部署在哪台机器、哪个端口」？为什么 `name="demo-basic"` 就能找到目标？下一课讲**服务注册与发现（Nacos/注册中心）**，揭开 Feign 靠服务名定位地址的底层魔法。

# 九、总结

- **问题的起点：服务拆开了，怎么互相调用？**：第 18 课我们讲过，demo 不是一个大单体，而是拆成了一堆独立部署的微服务：demo-basic（基础数据/网点）、demo-billing（财务钱包）、demo-asset（车务）等等。
- **降级与熔断：远程调用会失败，怎么办？**：本地方法调用几乎不会「失败」（顶多抛异常）。
- **不用 Feign 会有多痛？**：如果手写 HTTP 调用，每次都要这样（伪代码）：
- **client 模块：服务间的「接口契约」**：第 18 课提到每个服务旁边都有一个 xxx-client 模块（比如 demo-basic-client、demo-billing-client）。

## 参考资料

- [Dev.java 学习路径](https://dev.java/learn/)
- [Spring Boot 文档](https://docs.spring.io/spring-boot/)
