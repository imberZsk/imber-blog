# 第 29 课：前后端联调实战流程

> 写完代码不代表搞定了，能跑通一整条「前端点按钮 → 后端返回数据」的链路才算交付。这一课把你最熟悉的前端调试经验，平移到 demo 虚构的前后端联调环境里。

前面 28 课你已经会写 Controller、Service、Mapper，也理解了一次 HTTP 请求经过的五个站（见第 4 课）。但真到了项目里，你会发现：接口写好了，前端却拿不到数据；前端代理配了，请求却 404。这一课就讲清楚整条联调链路怎么搭、怎么排查。

---

## 一、先建立全局心智模型

联调的本质，是让「跑在你电脑上的前端」和「某个地方的后端」对上话。先看清楚有几种组合：

```
┌─────────────────────────────────────────────────────────────┐
│  组合 A：前端本地  +  后端测试环境（最常用，90% 时间用这个）   │
│                                                               │
│   localhost:8080 ──proxy──►  https://*.test.example.com   │
│   (你的前端)                  (公司测试环境后端，别人维护)      │
│                                                               │
│  组合 B：前端本地  +  后端本地（你自己改了后端代码要验证）      │
│                                                               │
│   localhost:8080 ──proxy──►  http://localhost:8082            │
│   (你的前端)                  (你 IDEA 里跑起来的 demo-basic)   │
└─────────────────────────────────────────────────────────────┘
```

【前端类比】这跟你在 React/Vue 项目里干的事一模一样：`vite.config.ts` 里写 `server.proxy` 把 `/api` 转发到后端。Java 这边没有变魔术，proxy 还是前端工程在配，后端只是换成了 Spring Boot 服务而已。

唯一的新东西是：**组合 B 里那个 `localhost:8082`，需要你自己在 IDEA 里把 Java 后端跑起来**。这是本课跟纯前端联调最大的区别。

---

## 二、本地启动后端服务（组合 B 的前提）

### 2.1 后端「启动」对应前端的什么

| 前端动作 | Java 后端动作 | 说明 |
| --- | --- | --- |
| `npm run dev` 启动 dev-server | 在 IDEA 里运行 `XxxApplication.java` 的 `main` 方法 | 都是起一个常驻进程监听端口 |
| Vite 监听 `5173` | Spring Boot 监听 `8082`（示例） | 端口由配置决定 |
| 改代码热更新 | 改代码要重启（或装 JRebel 热部署） | Java 默认不热更新，这点要适应 |
| 控制台打印编译信息 | 控制台打印 Spring 启动日志 | 看到 `Started Application` 才算起来了 |

【前端类比】`main` 方法 ≈ 前端项目的入口 `main.ts`。区别是前端入口挂载组件到 DOM，Java 入口是把整个 Spring 容器拉起来、扫描所有 `@RestController`、开始监听端口。

### 2.2 demo-basic 的启动入口

demo-basic 的启动类是常见的：

```
demo-basic/demo-basic-biz/src/main/java/com/example/platform/basic/biz/
    └── DemoBasicAdminApplication.java   ← 右键 Run 这个文件
```

启动配置在 `demo-basic-biz/src/main/resources/bootstrap.yml`，这是 demo 示例配置：

```yaml
spring:
  application:
    # 服务名带上你的用户名，避免和同事注册到同一个服务实例冲突
    name: demo-basic-${user.name}-local
  profiles:
    # 默认激活 dev 环境，决定连哪个 apollo 配置中心
    active: dev

app:
  id: demo-basic   # apollo 配置中心里这个应用的标识

apollo:
  bootstrap:
    enabled: true
    # 启动时要拉取的配置命名空间：数据库、缓存、oss 等都从这里读
    namespaces: biz,sys,datasource,demo-platform.oss,...

---
spring:
  profiles: dev
apollo:
  # dev profile 下连这个 apollo，配置（数据库地址、密码等）都在云端
  meta: http://apollo-api.dev.example.com:8080
```

【前端类比】`bootstrap.yml` ≈ 前端的 `.env.local` + `vite.config.ts` 合体。`spring.profiles.active: dev` ≈ 前端的 `NODE_ENV=development`，决定加载哪一套环境变量。

注意一个 Java 特有的坑：**很多配置（数据库密码、Redis 地址）不在代码里，而在 Apollo 配置中心**。所以本地启动后端，机器必须能连上示例内网的 `apollo-api.dev.example.com`，否则启动直接报错连不上配置中心。这跟前端把配置全塞 `.env` 文件不一样，要有心理准备。

### 2.3 启动成功的标志

看 IDEA 控制台日志，出现这行就算起来了：

```
... Tomcat started on port(s): 8082 (http) ...
... Started DemoBasicAdminApplication in 23.456 seconds ...
```

【前端类比】等价于前端控制台那行 `VITE ready in 800 ms ➜ Local: http://localhost:5173/`。看到端口号，就可以去测接口了。

---

## 三、前端代理配置（proxy 指向后端）

这是你的主场，但 demo 用 webpack-dev-server，配置位置和 Vite 略有不同。

### 3.1 demo-frontend-pc-web 的示例代理配置

demo PC 端的代理写在 `demo-frontend-pc-web/build/devServer/devServer.js`，下面是匿名化示例代码节选（加了中文注释）：

```js
const DemoDevProxy = require('demo-dev-proxy');

// target：默认把请求转发到的后端测试环境（示例租户测试域名）
const target = 'https://tenant-a.test.example.com';
// api_url：另一套后端测试域名（示例平台测试域名）
const api_url = 'https://api.test.example.com';

module.exports = {
  host: '0.0.0.0',
  historyApiFallback: {
    // 前端路由兜底：非静态资源的路径都回退到 index.html（SPA 必备）
    rewrites: [{ from: /^\/.*/, to: '/static/index.html' }],
  },
  proxy: {
    // 高德地图服务接口，转发到 target
    '/_AMapService': {
      target,
      changeOrigin: true,   // 改写请求头 Host，绕过后端的域名校验
      secure: false,        // 允许转发到自签名 https，不校验证书
    },
    // partner-api 网关请求：转发到 api_url，并把路径前缀去掉
    '/partner-api-gw': {
      target: api_url,
      changeOrigin: true,
      pathRewrite: {
        '^/partner-api-gw': '/',   // /partner-api-gw/xxx → /xxx 再发给后端
      },
      router: () => api_url,
    },
  },
};
```

### 3.2 三个核心字段，对照 Vite 理解

| webpack-dev-server | Vite `server.proxy` | 作用 |
| --- | --- | --- |
| `target` | `target` | 转发到哪个后端地址 |
| `changeOrigin: true` | `changeOrigin: true` | 把请求头里的 `Host` 改成 target 的域名，否则后端按域名校验会拒绝 |
| `pathRewrite: { '^/partner-api-gw': '/' }` | `rewrite: p => p.replace(/^\/partner-api-gw/, '')` | 转发前重写路径，去掉前端约定的前缀 |
| `secure: false` | `secure: false` | 目标是 https 且证书不受信任时，跳过证书校验 |

【前端类比】`pathRewrite` 就是 Vite 里那个 `rewrite` 函数，思路完全一致：前端用 `/partner-api-gw/order/list` 发请求，代理转发给后端时去掉前缀变成 `/order/list`。后端 Controller 上 `@RequestMapping` 写的是不带前缀的路径，所以必须 rewrite 对齐。

### 3.3 把代理指向你的本地后端（组合 B）

默认 `target` 指的是测试环境。当你改了 demo-basic 后端代码、想用本地后端联调时，把 target 临时改成本地端口：

```js
// 临时改成本地后端，验证完记得改回去，别提交！
const target = 'http://localhost:8082';
```

```
改前（组合 A）：浏览器 → localhost:8080 → proxy → test.example.com  (别人的后端)
改后（组合 B）：浏览器 → localhost:8080 → proxy → localhost:8082        (你 IDEA 里的后端)
```

【前端类比】这跟你平时把 `.env.local` 里的 `VITE_API_BASE` 从测试地址改成 `localhost` 是同一个操作。

### 3.4 启动前端

`demo-frontend-pc-web/package.json` 里的示例脚本：

```json
{
  "scripts": {
    // 用 webpack-dev-server 起本地服务，分配 4G 内存防止 OOM
    "dev": "cross-env NODE_ENV=development node --max_old_space_size=4096 node_modules/.bin/webpack-dev-server --config ./build/webpack.config.js --progress"
  }
}
```

跑 `yarn dev` 起前端，它会读 `env.local` 里的环境变量（示例文件里有 `PARTNER_API_URL`、各种测试域名等），再叠加上面的 proxy 规则。

---

## 四、看接口文档：先搞清楚要调什么

代理通了不等于知道调哪个接口。联调第一步永远是「读接口文档」。

### 4.1 从 Controller 直接读出接口契约

Java 的好处是 Controller 代码本身就是最准的接口文档。看 demo-basic 示例的 `OrganizationController`（见第 4 课用过的接口）：

```java
@RestController
@RequestMapping("/organization")   // 类级前缀，所有接口都带 /organization
public class OrganizationController extends BaseController {

    // GET /organization/getById?id=123
    @GetMapping("/getById")
    public R<OrganizationOut> getOrganization(@RequestParam("id") int id) {
        return R.ok(organizationService.getOrganization(id));
    }

    // POST /organization/listByGroup，body 是 OrganizationIn 的 JSON
    @PostMapping("/listByGroup")
    public R<List<OrganizationOut>> listByGroup(@RequestBody OrganizationIn organizationIn) {
        return R.ok(organizationService.listByGroup(organizationIn));
    }
}
```

从这段代码，你能读出一次请求的全部契约：

| 你要知道的 | 从哪读出来 | 例子 |
| --- | --- | --- |
| 请求方法 | `@GetMapping` / `@PostMapping` | GET / POST |
| 完整路径 | 类上 `@RequestMapping` + 方法上的路径 | `/organization/getById` |
| 参数怎么传 | `@RequestParam`（拼 URL） vs `@RequestBody`（放 body） | 见第 8 课 |
| 入参结构 | `OrganizationIn` 这个类的字段 | 点进去看 |
| 返回结构 | `R<OrganizationOut>` 里的 `OrganizationOut` | 点进去看 |

【前端类比】`@RequestParam` ≈ axios 的 `params`（拼到 URL 上 `?id=123`）；`@RequestBody` ≈ axios 的 `data`（放进请求体 JSON）。这点第 8 课讲过，联调时最容易踩的坑就是这俩搞反，导致后端收到 `null`。

### 4.2 返回结构 R 的统一格式

demo 后端所有接口都用 `R<T>`（`com.example.platform.common.core.entity.R`）包一层。**注意：demo 的字段名不是常见的 `code`/`msg`/`data`，而是 `code`/`message`/`data`**，这是最容易踩的坑。前端拿到的示例 JSON 长这样：

```json
{
  "code": 0,          // 0 表示成功，非 0 是业务错误码（见第 7 课异常处理）
  "message": "success",
  "data": {             // 真正的业务数据，对应 R<OrganizationOut> 里的 OrganizationOut
    "id": 123,
    "name": "北京分公司",
    "groupId": 1
  }
}
```

字段名直接对应 `R.java` 里的三个属性：`int code`（默认取 `ResponseEnum.SUCCESS` 的 0）、`String message`（默认 `"success"`）、`T data`（泛型业务数据）。

【前端类比】这就是你前端 axios 拦截器里判断成功的那一层，只是字段名换了：demo 前端真实写法是 `const { code, message, data } = await postJAVA(...); if (code === 0 && data) {...}`，对应你以前的 `response.data.code === 0 ? response.data.data : reject()`。后端的 `R.ok(xxx)` 就是把数据塞进 `data`、把 `code` 设成 0。

---

## 五、用 Postman / Apifox 单独测接口

不要一上来就在浏览器里点页面调。**先用 Postman/Apifox 把后端接口单独测通**，这样能把「前端的问题」和「后端的问题」彻底切开。

### 5.1 为什么要单独测

```
页面点不出数据时，问题可能在三个地方：
   前端代码？   代理配置？   后端接口？
        └────────────┴───────────┘
              不知道是哪个

用 Postman 直接打后端接口：
   通了（`code: 0`）→ 后端没问题，去查前端/代理
   不通（`code != 0` 或直接报错）→ 后端的锅，把 Postman 截图甩给后端（或自己查日志）
```

【前端类比】等价于你绕过前端、直接用 Postman 验证后端契约，跟你以前调第三方 API 一个套路。区别是现在后端可能就是你自己写的。

### 5.2 测 GET 接口（`@RequestParam`）

```
Method: GET
URL:    https://api.test.example.com/organization/getById?id=123
Headers:
  Authorization: Bearer <你的登录 token>   ← 关键，没有会被网关拦
```

- 参数拼在 URL 的 `?id=123`，对应 Java 的 `@RequestParam("id")`。
- token 哪来：先在测试环境网页登录，从浏览器 DevTools 的请求头里复制一个。demo 网关会校验登录态（见第 4 课的「网关」这一站），裸请求会被打回。

### 5.3 测 POST 接口（`@RequestBody`）

```
Method: POST
URL:    https://api.test.example.com/organization/listByGroup
Headers:
  Content-Type: application/json
  Authorization: Bearer <token>
Body (raw JSON):
  {
    "groupId": 1
  }
```

- body 里的 JSON 字段要和 Java 类 `OrganizationIn` 的字段名对上，Spring 会自动反序列化成对象（见第 8 课 `@RequestBody` 原理）。
- 字段名拼错不会报错，只会让对应字段是 `null`——这是联调里最隐蔽的坑。

### 5.4 联调环境对照表

| 环境 | 后端域名 | token 来源 | 用途 |
| --- | --- | --- | --- |
| 示例平台测试 | `https://api.test.example.com` | 测试环境登录后复制 | 日常联调主战场 |
| 示例租户测试 | `https://tenant-a.test.example.com` | 对应环境登录 | 多租户/白标场景 |
| 本地后端 | `http://localhost:8082` | 配置允许时可跳过校验 | 验证自己改的后端 |

这几个域名都不是编的，就是 `devServer.js` 里 `target` 和 `api_url` 配的示例测试域名。

---

## 六、查看后端日志定位问题

接口报错时，前端只能看到 `code != 0` 和一句 `message`，**真正的错误堆栈在后端日志里**。学会看日志是后端联调的核心技能。

### 6.1 本地后端：看 IDEA 控制台

后端跑在你 IDEA 里时，每次请求都会在控制台滚动日志。重点找这几类：

```
# 1. 正常请求日志（确认请求到没到后端）
2026-06-11 10:23:01.123  INFO  [http-nio-8082] com.example.platform.basic.biz.controller.OrganizationController : getById id=123

# 2. 业务异常（对应第 7 课的 BusinessException）
2026-06-11 10:23:05.456  WARN  ... BusinessException: 网点不存在, code=10001

# 3. 报错堆栈（NullPointerException 之类，要顺着 Caused by 往下看）
2026-06-11 10:23:09.789  ERROR ...
java.lang.NullPointerException: ...
    at com.example.platform.basic.service.service.OrganizationService.getOrganization(OrganizationService.java:88)
    ...
Caused by: ...   ← 真正的根因往往在最后一个 Caused by
```

【前端类比】Java 的堆栈跟你看浏览器 console 里的红色报错 + Call Stack 是一回事，但阅读顺序相反：**从上往下找你自己写的那个文件名 + 行号（`OrganizationService.java:88`），那一行就是出事现场**。底部的 `Caused by` 是根因，比顶部的表面错误更重要。

### 6.2 关键技巧：用请求到没到后端来切割问题

```
浏览器发了请求
      │
      ▼
后端日志里能看到这条请求吗？
   ├── 看不到 → 请求根本没到后端 → 查【代理配置】或【网关拦截/token】
   └── 看得到 → 请求到了 → 查【后端日志里的报错堆栈】
```

这个判断能帮你 5 秒钟定位「到底是前端代理的锅还是后端逻辑的锅」，是联调里最值钱的一招。

### 6.3 测试环境后端：日志在哪

后端跑在测试服务器上时（组合 A），你看不到 IDEA 控制台。这时候日志在公司的日志平台（如 Kibana/ELK），按 `traceId` 搜索。实操中通常的做法是：把出错请求的 `traceId`（响应头或网关返回里一般带）发给后端同事，或自己去日志平台按 traceId 检索整条调用链。

---

## 七、Mock 数据：后端没就绪时不被卡住

联调最常见的阻塞：「后端接口还没写完，前端干等着」。Mock 让你先用假数据把前端流程跑通。

### 7.1 demo 项目的 mock 目录

`demo-frontend-pc-web` 里有真实的 `__mocks__` 目录（用于单测和组件 mock）。但联调阶段更常用的是「接口级 mock」，几种方案对照：

| 方案 | 适用场景 | 前端类比 |
| --- | --- | --- |
| Apifox/Postman 的 Mock Server | 后端只给了接口文档、还没实现 | 等价于你以前用的 mockjs / msw |
| 前端代码里写死假数据 | 临时快速验证 UI | 在 service 里 `return Promise.resolve(假数据)` |
| 代理层拦截返回假数据 | 想保留真实请求链路 | webpack 的 `setupMiddlewares` 拦截 |

### 7.2 按接口契约造 mock 数据

Mock 数据的字段必须严格对齐后端的 `R<OrganizationOut>` 结构，否则后端真接口好了一对接又得返工：

```js
// mock /organization/getById 的返回，结构严格对齐后端 R<OrganizationOut>
const mockOrganization = {
  code: 0,            // 必须 0，前端判断 code === 0 才认为成功
  message: 'success',
  data: {               // 对齐 OrganizationOut 的字段，字段名一个都不能错
    id: 123,
    name: '北京分公司（mock）',  // 加 mock 标记，避免误以为是真数据
    groupId: 1,
  },
};
```

【前端类比】这跟你用 msw 写 handler、用 mockjs 拦 axios 完全一样（demo 自己的 `src/mocks/handlers.js` 就是这么写的，返回体也是 `code: 0`）。唯一要强调的是：**外层用 demo 的 `code`/`message`/`data`，里层 `data` 的字段名和层级照着 Java 的 `OrganizationOut` 类抄**，因为后端真接口一定按那个类返回，对齐了才能无缝切换。

### 7.3 用完记得撤掉

Mock 是临时脚手架，后端就绪后要第一时间切回真接口验证。常见事故就是「mock 没撤，上线后页面永远显示假数据」——这跟前端忘删 `mockjs` 是同一类低级但致命的错误。

---

## 八、完整联调流程串一遍

把前面所有步骤串成一条 checklist，这就是你以后每次联调的标准动作：

```
┌─ 1. 读接口契约 ─────────────────────────────────┐
│   打开 Controller，读出 method / 路径 / 入参 / 出参 │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─ 2. Postman 单测后端 ───────────────────────────┐
│   带 token 直打后端域名，确认接口本身通不通          │
└──────────────────┬──────────────────────────────┘
              通过 │ 不通 → 查后端日志堆栈 / 找后端
                   ▼
┌─ 3. 配 / 改前端代理 ────────────────────────────┐
│   devServer.js 的 target 指向目标后端，对齐 path    │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─ 4. 启动前后端 ─────────────────────────────────┐
│   后端：IDEA Run Application；前端：yarn dev        │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─ 5. 页面联调 + 排查 ────────────────────────────┐
│   页面点不出数据 → 看请求到没到后端 → 切前端/后端   │
│   后端还没好 → 用 mock 顶上，就绪后切回真接口        │
└─────────────────────────────────────────────────┘
```

---

## 本课小结

- **联调有两种组合**：前端本地 + 后端测试环境（最常用），前端本地 + 后端本地（验证自己改的后端代码）。
- **启动后端 ≈ 前端 `npm run dev`**：在 IDEA 里 Run `DemoBasicAdminApplication` 的 main 方法，看到 `Started ... Tomcat started on port 8082` 才算成功；配置很多在 Apollo 配置中心，本地启动要能连内网。
- **前端代理是你的主场**：demo 示例配置在 `demo-frontend-pc-web/build/devServer/devServer.js`，`target` / `changeOrigin` / `pathRewrite` 三个字段和 Vite proxy 一一对应；改 `target` 就能在测试后端和本地后端之间切换。
- **Controller 就是最准的接口文档**：从 `@GetMapping`/`@PostMapping`、`@RequestParam`/`@RequestBody`、`R<T>` 里读出完整契约（见第 4、7、8 课）。
- **先用 Postman/Apifox 单测后端**，把前端的锅和后端的锅切开；GET 拼 URL、POST 放 body，别忘了带登录 token。
- **看后端日志定位问题**：本地看 IDEA 控制台，重点找你自己文件名 + 行号那一行和最后的 `Caused by`；用「请求到没到后端」快速切割是前端代理问题还是后端逻辑问题。
- **Mock 数据顶住阻塞**：字段严格对齐后端的出参类，加 mock 标记，后端就绪后第一时间切回真接口。

下一课预告：**第 30 课 · 数据库操作入门（MyBatis / MyBatis-Plus）**。我们会顺着这一课联调时碰到的 Mapper 层往下钻，看 demo 是怎么用 MyBatis-Plus 把一个 Java 对象映射成一条 SQL、再把查出来的行变回 `OrganizationOut` 的——你前端写过的 ORM（如 Prisma）经验会很好用。
