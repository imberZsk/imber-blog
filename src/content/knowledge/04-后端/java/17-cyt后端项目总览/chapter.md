# 第 17 课：cyt 后端项目总览

> 学了 16 课的 Java 基础，是时候打开真实的"地图"了——这一课带你俯瞰 cyt 整个后端项目群，看清每个服务的位置和它们之间怎么说话。

前面 01-16 课，我们一直在打 Java 语法和工具的地基。从这一课开始进入**阶段五：cyt 真实项目导读**。导读的第一步不是钻进某个文件，而是先爬到山顶看全景——搞清楚 cyt 后端到底有多少个服务、用什么技术、谁调用谁。

就像你接手一个陌生的前端 monorepo，第一件事不是看某个组件，而是看 `package.json` 的 workspaces、看目录结构、看 `apps/` 和 `packages/` 怎么分。后端也一样。

---

## 一、先建立一个心智模型：cyt 不是单体，是"混合舰队"

前端同学最熟悉的后端形态，可能是"一个 Node 服务 + 一个数据库"。cyt 不是这样。它是一支**混合技术栈的舰队**，由四种语言/形态的服务拼成：

```
                    ┌──────────────────────────────┐
   浏览器 / App ───▶ │  cyt-openresty-gateway 网关   │  ← 所有请求的统一大门
                    │  (OpenResty = Nginx + Lua)    │
                    └───────────────┬──────────────┘
                                    │ 按路由分发
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                        ▼
   ┌─────────────────┐   ┌────────────────────┐   ┌──────────────────┐
   │  PHP 单体        │   │  Java 微服务群       │   │  Go 服务          │
   │  cyt-tms (核心)  │   │  十几个 Spring 服务  │   │  cyt-notify(告警) │
   │  cyt-admin(后台) │   │  cyt-basic/finance.. │   │                  │
   │  (ThinkPHP 3.x)  │   │  (Spring Cloud)      │   │  (Gin)           │
   └─────────────────┘   └────────────────────┘   └──────────────────┘
```

### 【前端类比】这就是一个超大号的 monorepo + 微前端

| 前端世界 | cyt 后端 |
|---------|---------|
| Nginx / Vite dev server 反向代理 | cyt-openresty-gateway（网关，统一入口） |
| 老的 jQuery 祖传后台，没人敢重写 | cyt-tms / cyt-admin（PHP 单体，历史最久） |
| 新功能拆成独立的微前端子应用 | Java 微服务群（每个服务独立部署） |
| 某个用 Rust 写的高性能工具 | cyt-notify（Go 写的告警服务） |
| `packages/` 里被各 app 共享的工具库 | cyt-common / cyt-parent（公共组件，不独立部署） |

关键认知：**cyt 是"老 PHP 单体 + 新 Java 微服务"并存的渐进式架构**。新业务用 Java 微服务写，老业务还躺在 PHP 里。两边通过网关和 SDK 互通。这在大公司很常见——不是推倒重来，而是边跑边换轮子。

---

## 二、四类成员：服务清单

### 1. 网关层（1 个）

| 服务 | 技术 | 干啥的 |
|------|------|--------|
| cyt-openresty-gateway | OpenResty（Nginx + Lua） | 所有 API 的统一入口，负责路由转发、鉴权、限流 |

> 还记得第 04 课讲的「HTTP 五站」吗？第一站「网关」就是它。前端发出的每个请求，都先经过这道门，再被分发到后面的 PHP 或 Java。

### 2. PHP 单体（祖传核心，3 个）

| 服务 | 技术 | 干啥的 |
|------|------|--------|
| cyt-tms | PHP / ThinkPHP 3.x | **最核心**的业务系统：运单、车辆、财务、司机、仓储等 30+ 模块 |
| cyt-admin | PHP / ThinkPHP 3.x | 运营管理后台（Bms、统计、脚本、监控） |
| cyt-workerman | PHP / Workerman | WebSocket 实时消息推送 |

cyt-tms 是整个系统跑了最久、业务最重的代码库，前端直接调用的很多接口都来自这里。

### 3. Java 微服务群（新业务主力，17 个左右可独立部署）

全部基于 **Spring Boot 2.x + Spring Cloud**。下面是核心几个，按职责分组：

| 服务 | 职责 | 你前面学的接口在哪 |
|------|------|---------|
| **cyt-basic** | 公共基础信息（组织、人员、车辆基础数据） | 第 04/05 课的 `CompanyController.getById` 就在这 |
| cyt-vehiclebiz | 车务中心（车辆业务，Spring Cloud + Kafka） | |
| cyt-batch | 订单管理聚合（批量操作、聚合查询） | |
| cyt-finance | 财务服务（对账、结算、费用） | |
| cyt-financesalary | 司机工资（薪资计算与发放） | |
| cyt-pricesys | 计价系统（运费计算规则引擎） | |
| cyt-pay | 支付服务（支付渠道对接） | |
| cyt-intransit | 在途服务（运输状态跟踪） | |
| cyt-messagechannel | 消息中心（站内信、推送分发） | |
| cyt-transfer | 消息中转（异步消息投递与重试） | |
| cyt-export | 通用导出（Excel/CSV 异步导出） | |
| cyt-openapi | 开放 API（对外标准化接口） | |
| cyt-uow-link | UOW 链路服务（工作单元关联） | |
| cyt-waybill | 运单费用分摊（DDD 架构，Java + Kotlin 混合） | |
| cyt-xxljob | 分布式定时任务调度平台 | |

### 4. Go 服务（1 个）

| 服务 | 技术 | 干啥的 |
|------|------|--------|
| cyt-notify | Go / Gin | 告警规则管理、飞书通知推送 |

### 5. 公共依赖（不独立部署，被别人引用）

| 项目 | 类比前端 | 说明 |
|------|---------|------|
| cyt-parent | 根 `package.json` + 版本锁 | Maven 父 POM，统一管理依赖版本 |
| cyt-common | `packages/shared-utils` | 公共组件库（core/db/feign/oss/log/web 等子模块） |
| cyt-parent-enums | `packages/constants` | 公共枚举类 |
| cyt-tms-sdk | 调老服务的封装 client | 供 Java 微服务调用 PHP 接口的 SDK |

> 注意"不独立部署"这个词。前端的 `packages/utils` 不会自己起一个服务器，它只是被 `apps/web` import 进去打包。cyt-common 一样——它是被各个 Java 服务 `import` 的库（Maven 依赖），自己不跑进程。

---

## 三、一个 Java 微服务长什么样：四件套结构

前端的子应用通常是 `src/ + public/ + package.json`。Java 微服务也有它固定的"四件套"。以真实的 **cyt-basic** 为例（目录确实如此）：

```
cyt-basic/
├── cyt-basic-biz       ← 启动入口（main 函数 + 配置）+ Controller + 定时任务，相当于 app 的 main.tsx
├── cyt-basic-service   ← 业务逻辑层（Service/Repository/Mapper/Entity 都在这）
├── cyt-basic-common    ← 公共 DTO（出入参对象 in/out）、枚举、工具类
├── cyt-basic-client    ← Feign 接口：给"别的服务"调用我的入口
├── pom.xml             ← 模块的依赖声明，类似 package.json
└── Dockerfile          ← 打包成镜像部署
```

> 这里有个反直觉的点要记牢：**启动类（`main` + `@SpringBootApplication`）住在 `-biz` 里，不在 `-service` 里**。`-biz` 是"应用启动 + Controller + 定时任务"层，`-service` 才是"纯业务逻辑（Service/Mapper/Entity）"层。模块依赖方向是 `biz → service → common ← client`。别被 `-service` 这个名字骗了，它不是启动模块。

### 【前端类比】`-client` 模块 ≈ 你导出给别人用的 SDK

最值得理解的是 `-client`。想象你写了一个前端 SDK 包，对外 export 一堆函数签名，别人 `npm install` 后直接调用，不用关心你内部怎么实现。

cyt-basic-client 就是这个角色：它**只放接口定义**（方法签名），其它 Java 服务把它当依赖引入后，就能像调本地方法一样调用 cyt-basic 的远程接口。这套机制叫 **Feign**（下一阶段会专门讲）。

| 前端 SDK 包 | Java 的 `-client` 模块 |
|------------|----------------------|
| `export function getPrice(query): Promise<Price>` | `R<List<...>> queryByParam(query)` 接口方法 |
| 内部用 `fetch` 发 HTTP | Feign 底层也发 HTTP，但你看不到 |
| 别人 `import { getPrice }` | 别的服务 `@Autowired RemoteGoodsPriceService` |

---

## 四、服务之间怎么说话：Feign 远程调用

微服务最大的特点：业务被拆开了，于是经常要**跨服务调数据**。比如计价系统要算运费，得先问 cyt-basic「这条油站的商品价格是多少」。

cyt 用的是 **Feign**——它把"发一个 HTTP 请求到另一个服务"包装成"调一个本地接口方法"。下面是 cyt-basic-client 里的**真实代码**（`RemoteGoodsPriceService.java`）：

```java
// @FeignClient 声明这是一个远程服务调用接口
// value = "cyt-basic" 表示目标服务名（通过 Eureka 注册中心找到它的真实地址）
// fallbackFactory 是降级兜底：目标服务挂了时走这里，避免雪崩
@FeignClient(contextId = "remoteGoodsPriceService", value = "cyt-basic",
        fallbackFactory = RemoteGoodsPriceServiceFallbackFactory.class)
public interface RemoteGoodsPriceService {

    /**
     * 批量查询油站商品价格
     * @param query 查询条件（封装在 common 模块的入参对象里）
     * @return R 是统一响应包装，里面装着商品价格列表
     */
    @PostMapping("/japi/bs_oil_station_goods_price/query_by_param")
    R<List<OilStationGoodsPriceOut>> queryByParam(@RequestBody OilStationGoodsPriceQuery query);
}
```

### 【前端类比】Feign 就是"自动生成的 axios 封装"

你在前端肯定写过 API 层：

```ts
// 前端：手写一个 axios 封装
export async function queryByParam(query: Query): Promise<Price[]> {
  const res = await axios.post('/japi/bs_oil_station_goods_price/query_by_param', query)
  return res.data
}
```

Feign 做的是同一件事，但**你只写接口签名，不写实现**——Spring 在运行时自动帮你生成发请求的代码。

| 关键点 | 前端 axios 封装 | Java Feign |
|--------|---------------|-----------|
| 目标地址 | 写死 URL 或 baseURL | `value="cyt-basic"` 服务名，Eureka 解析成真实 IP |
| 请求方法 | `axios.post(...)` | `@PostMapping("/japi/...")` |
| 请求体 | `axios.post(url, query)` | `@RequestBody ... query`（见第 08 课） |
| 响应类型 | `Promise<Price[]>` | `R<List<...>>`（R 是统一响应壳） |
| 服务挂了 | `try/catch` 自己处理 | `fallbackFactory` 自动降级兜底 |

这里出现的 `value="cyt-basic"` 引出了下一个关键角色——**Eureka 注册中心**。

---

## 五、撑起微服务的基础设施

光有一堆服务还不够，得有"中间件"把它们组织起来。这些就是面试常被问、但前端较少接触的概念：

```
┌─────────────────────────────────────────────────────────────┐
│                     基础设施（中间件）                          │
├─────────────────────────────────────────────────────────────┤
│  Eureka   ─ 服务注册发现：每个服务启动时来"报到登记地址"        │
│  Apollo   ─ 配置中心：所有服务的配置集中管理，改了实时下发      │
│  Kafka    ─ 消息队列：服务间异步通信，A 发消息 B 慢慢消费      │
│  xxl-job  ─ 定时任务调度：统一管理所有定时任务（对账、清理等）   │
│  Redis    ─ 缓存：热点数据放内存，扛高并发                     │
│  ES       ─ Elasticsearch 搜索引擎：复杂查询、全文检索        │
│  MySQL    ─ 关系型数据库：业务数据的最终归宿（第 04 课第五站）   │
└─────────────────────────────────────────────────────────────┘
```

### 【前端类比】用你熟悉的东西理解它们

| 基础设施 | 干啥的 | 前端世界里类似的东西 |
|---------|--------|---------------------|
| **Eureka** | 服务"通讯录"：谁在线、地址多少 | 类似 DNS / 服务发现；前端的 micro-app 注册子应用清单 |
| **Apollo** | 配置中心，集中管理+热更新 | 类似远程 feature flag / 远程 `.env`，改了不用重新部署 |
| **Kafka** | 异步消息队列，削峰解耦 | 类似前端的 EventBus / 消息订阅，但是跨服务、可持久化 |
| **xxl-job** | 定时任务统一调度平台 | 类似 cron，但有 Web 界面、能看执行日志、能重试 |
| **Redis** | 内存缓存 | 类似前端的 localStorage + 内存缓存，但在服务端、超快 |
| **Elasticsearch** | 搜索引擎，扛复杂查询 | 类似你接过的「带高亮的全文搜索接口」的后端 |

为什么需要 Eureka？因为微服务部署在不同机器、IP 会变、还会多副本。服务不能把对方地址写死。所以每个服务启动时去 Eureka「登记」，调用方只报服务名（`cyt-basic`），由 Eureka 翻译成真实地址。这就是上面 Feign 代码里 `value="cyt-basic"` 能工作的原因。

---

## 六、串起来看：一个请求的完整旅程

把第 04 课的「HTTP 五站」放进微服务全景，一个跨服务的请求大致是这样：

```
浏览器
  │ POST /japi/...
  ▼
cyt-openresty-gateway  ← 第一站：网关鉴权、路由
  │ 路由到 Java 服务群
  ▼
cyt-pricesys (计价服务)  ← 接到请求，开始算运费
  │ 发现：算价需要油站商品价格
  │ 通过 Feign 调用 RemoteGoodsPriceService
  ▼ (Eureka 把 "cyt-basic" 解析成真实地址)
cyt-basic (基础服务)
  │ Controller → Service → Mapper
  ▼
MySQL / Redis / ES  ← 取数据，原路返回
```

一句话：**网关是大门，Eureka 是通讯录，Feign 是服务间打电话的方式，Apollo/Kafka/xxljob 是后勤班子，MySQL/Redis/ES 是数据仓库。**

---

## 七、给前端转全栈的实用建议

接手 cyt 后端时，别想着一口吃下所有服务。按这个顺序认路：

1. **先认 cyt-basic**：它是公共基础数据服务，结构标准（四件套齐全），第 04/05 课的接口就在这，最适合作为入门样本。
2. **看到一个服务，先看它的 `-client` 模块**：那是它对外暴露的"API 目录"，比一头扎进 biz 实现高效得多。
3. **遇到不认识的服务，回来查这张总览表**：知道它是 PHP 还是 Java、独立部署还是公共库，就不会找错地方。
4. **看到 `@FeignClient` 不要慌**：那只是"调另一个服务"，本质就是你熟悉的 axios 跨服务版。

---

## 本课小结

- cyt 后端是**混合舰队**：网关（OpenResty）+ PHP 单体（cyt-tms/cyt-admin，祖传核心）+ Java 微服务群（十几个，新业务主力）+ Go 服务（cyt-notify）。这是渐进式架构，新旧并存。
- 类比理解：网关 = 反向代理，PHP 单体 = 不敢重写的祖传后台，Java 微服务 = 微前端子应用，cyt-common = `packages/` 共享库。
- 一个 Java 微服务的**四件套**：`-biz`（启动入口 + Controller，住着 `main` 函数）、`-service`（业务逻辑 Service/Mapper）、`-client`（对外 Feign 接口，类似 SDK）、`-common`（DTO）。看新服务先看 `-client`。
- 服务间通过 **Feign** 通信：只写接口签名，Spring 自动生成 HTTP 调用代码，本质是"自动版 axios 封装"。真实例子见 cyt-basic 的 `RemoteGoodsPriceService`。
- 基础设施记住对应关系：**Eureka**（服务通讯录）、**Apollo**（远程配置/feature flag）、**Kafka**（跨服务 EventBus）、**xxl-job**（带界面的 cron）、**Redis**（服务端缓存）、**ES**（搜索引擎）。
- 入门建议：从 cyt-basic 这个标准样本入手，遇到陌生服务回查总览表。

> **下一课预告**：第 18 课《Spring Boot 启动与项目结构》——我们将真正钻进 cyt-basic，从 `main` 函数和那个 `@SpringBootApplication` 注解讲起，看 Spring Boot 是怎么"开机"的，以及 Controller/Service/Mapper 这三层目录在真实项目里如何组织。
