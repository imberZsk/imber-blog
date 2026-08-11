# Java（12）- RESTful API 设计规范

> 你在前端写了无数 `axios.get('/api/user/1')`，但接口为什么有的用 GET 有的用 POST、URL 该怎么命名、返回的 `code` 到底是什么含义？这一课站在后端视角把这些规则讲透，让你写出的接口前端同学一看就懂。

---

# 一、为什么前端工程师更要懂 RESTful

你在前端调接口时，其实一直在「消费」后端定下的规则：

```js
// 你每天都在写这样的代码
const data = await axios.get('/organization/getById', { params: { id: 100 } })
if (data.data.code === 0) {
  console.log(data.data.data)   // 拿到真正的数据
}
```

这里面藏着三个后端决策：用 **GET** 还是 POST、URL 叫 **/organization/getById**、返回体里为什么有个 **code**。现在你转全栈，这些决策要由你来做。RESTful 就是一套被广泛接受的「接口设计约定」，让前后端不用反复对齐就能默契协作。

【前端类比】RESTful 之于接口，就像 ESLint + Prettier 之于代码风格——它不是语法强制（不遵守接口照样能跑），而是一套团队共识，让所有接口长得「可预测」。

---

# 二、HTTP 方法的语义：不只是「能用就行」

REST 的核心思想：把后端的一切都看作**资源（Resource）**，用 **HTTP 方法**表达你想对资源做什么「动作」。

| HTTP 方法 | 语义（动作） | 类比数据库 | 类比前端数组操作 | 幂等性 |
|-----------|------------|-----------|----------------|--------|
| `GET` | 查询资源 | `SELECT` | `arr.find()` | 幂等（查 N 次结果一样） |
| `POST` | 新建资源 | `INSERT` | `arr.push()` | 非幂等（调 N 次建 N 条） |
| `PUT` | 整体更新资源 | `UPDATE` | `arr[i] = newObj` | 幂等（覆盖 N 次结果一样） |
| `DELETE` | 删除资源 | `DELETE` | `arr.splice(i, 1)` | 幂等（删了就没了） |

> **幂等性**（idempotent）是后端高频词：同样的请求发送一次和发送多次，对服务器的最终影响一致。GET/PUT/DELETE 幂等，POST 不幂等。这就是为什么前端「防重复提交」通常防的是 POST 按钮——重复 POST 会建出重复数据。

【前端类比】你在 React 里区分「读 state」和「写 state（setState）」；HTTP 方法就是在区分「读资源」和「各种写资源」，只是写又细分成了「建/改/删」三种。

## 2.1 理论 vs demo 现实

教科书的标准 REST 长这样：

```
GET    /companies/100      # 查 id=100 的网点
POST   /companies          # 新建网点
PUT    /companies/100      # 更新 id=100 的网点
DELETE /companies/100      # 删除 id=100 的网点
```

但你打开 demo 的匿名化示例代码会发现「不太一样」。看 `DepartmentController.java`（部门管理，路径 `demo-basic/demo-basic-biz/.../controller/DepartmentController.java`）：

```java
@RestController
@RequestMapping("/department")          // 这个 Controller 下所有接口都以 /department 开头
public class DepartmentController extends BaseController {

    // 查询：用 GET，动作写在 URL 路径里（/getById），而非标准的 GET /department/{id}
    @GetMapping("/getById")
    public R<DepartmentOut> getById(@RequestParam("id") Integer id) {
        return R.ok(departmentService.getDepartmentById(id));
    }

    // 新增：用 POST，这点符合 REST
    @PostMapping("/add")
    public R save(@RequestBody Department department) {
        return R.ok(departmentService.save(department));
    }

    // 修改：demo 用 POST + /update，而非标准的 PUT
    @PostMapping("/update")
    public R update(@RequestBody Department department) {
        return R.ok(departmentService.updateById(department));
    }

    // 删除：demo 甚至用 GET + /delete，这是和标准 REST 偏离最大的地方
    @GetMapping("/delete")
    public R removeById(Integer id) {
        return R.ok(departmentService.removeById(id));
    }
}
```

可以看到 demo 走的是 **RPC 风格**（动作即 URL）而非纯 REST 风格（动作即 HTTP 方法）。这在国内企业项目里极其常见。

| 维度 | 标准 REST | demo 实际风格（RPC 味） |
|------|-----------|----------------------|
| 表达动作 | 靠 HTTP 方法（GET/POST/PUT/DELETE） | 靠 URL 里的动词（/getById、/add、/update、/delete） |
| 用到的方法 | 四种都用 | 几乎只用 GET 和 POST |
| 删除 | `DELETE /x/100` | `GET /department/delete?id=100` |
| 资源命名 | 名词复数 `/companies` | 名词 + 动作 `/organization/getById` |

**为什么 demo 这样做？** 历史原因 + 务实考量：早期很多浏览器/网关对 PUT/DELETE 支持不一，POST 能传复杂 body（PUT 也行但团队习惯统一用 POST），动作写进 URL 让接口列表「一眼看懂」。作为转全栈的你，要点是：**先读懂团队约定，再谈标准**。新项目可以推标准 REST，但进存量项目务必跟随既有风格，保持一致性比「更正确」更重要。

---

# 三、GET vs POST：demo 里到底怎么选

抛开标准 REST，看 demo 工程师实际是怎么在 GET 和 POST 之间做选择的。看 `OrganizationController.java`（网点管理，第 04 课用过的 `getById` 就在这）：

```java
@RestController
@RequestMapping("/organization")
public class OrganizationController extends BaseController {

    // 场景一：参数简单（就一个 id），用 GET + @RequestParam
    @GetMapping("/getById")
    public R<OrganizationOut> getOrganization(@RequestParam("id") int id) {
        return R.ok(organizationService.getOrganization(id));
    }

    // 场景二：参数稍多但仍是简单类型，依然 GET，多个 @RequestParam 平铺
    @GetMapping("/getByName")
    public R<OrganizationOut> getByName(@RequestParam("groupId") int groupId,
                                   @RequestParam("name") String name) {
        return R.ok(organizationService.getByName(groupId, name));
    }

    // 场景三：参数是一个复杂对象（OrganizationTreeIn），改用 POST + @RequestBody
    @PostMapping("/driver/tree")
    public R<DrOrganizationTreeOut> buildOrganizationTree(@RequestBody OrganizationTreeIn organizationTreeIn) {
        return R.ok(organizationService.buildOrganizationTree(organizationTreeIn));
    }
}
```

提炼出 demo 的**实用选择规则**（@RequestParam vs @RequestBody 的区别见第 08 课）：

| 情况 | 选 | 参数接收方式 | 前端怎么传 |
|------|-----|------------|-----------|
| 纯查询 + 参数少且简单（id、name） | `GET` | `@RequestParam` | `axios.get(url, { params })` → 拼到 query string |
| 查询但参数是复杂对象/数组/嵌套 | `POST` | `@RequestBody` | `axios.post(url, body)` → 放进 JSON body |
| 新增/修改/删除等写操作 | `POST` | `@RequestBody` | `axios.post(url, body)` |

【前端类比】这跟你的直觉一致：能用 query string 表达的就 GET（参数会出现在 URL 上，可被收藏、可被缓存）；body 里要塞一坨 JSON 对象的就 POST。注意 `OrganizationController` 里甚至有同名的 `getByIds` 同时存在 GET 版（`@RequestParam("ids") List ids`）和 POST 版（`@RequestBody OrganizationIn`）——分别服务「ids 不多直接拼 URL」和「ids 很多走 body」两种调用场景。

```
前端调用决策树
┌─────────────────────────────────────┐
│  我要调一个接口                        │
└───────────────┬─────────────────────┘
                │
       是查询还是写操作?
        ┌───────┴────────┐
      查询              写(增/改/删)
        │                  │
   参数复杂吗?          一律 POST
   ┌────┴────┐         @RequestBody
 简单       复杂
  │          │
 GET        POST
@RequestParam @RequestBody
```

---

# 四、URL 设计规范

即便走 RPC 风格，好的 URL 仍有章法。对照 demo 的实际命名：

| 规范 | 说明 | demo 实例 |
|------|------|---------|
| 模块前缀统一 | `@RequestMapping` 定义资源域 | `/organization`、`/department` |
| 动作语义清晰 | 路径里的动词表达意图 | `/getById`、`/getByName`、`/listByIds` |
| 层级表达关系 | 用 `/` 表达从属/分类 | `/organization/driver/tree`、`/organization/loan/tree` |
| 全小写 + 驼峰混用 | demo 用驼峰动作名 | `/getByGroupId`、`/incrementUpdateSettleRemainderById` |

【前端类比】这跟你设计 Vue Router / React Router 的路由表是一个思路：`/user/:id/orders` 这种层级表达「用户的订单」。后端 URL 的 `/organization/driver/tree` 同理，表达「网点模块下，司机端用的组织树」。

**几条避坑提示：**
- URL 里不要放动词以外的「状态/动态值拼接混乱」，简单类型参数交给 query string（`?id=100`），别硬塞进路径。
- 同一资源的接口聚到同一个 Controller（同一个 `@RequestMapping` 前缀下），别让 `/organization` 的接口散落到别的 Controller。
- 命名风格在一个项目里要统一。demo 用驼峰（`getById`），你就别突然来个下划线（`get_by_id`）。

---

# 五、HTTP 状态码：两套「码」别搞混

这是前端转全栈最容易踩的概念坑。你需要区分**两层完全不同的「码」**：

## 5.1 第一层：HTTP 状态码（协议层，由网关/框架决定）

| 状态码 | 含义 | 何时出现 |
|--------|------|---------|
| `200` | 请求成功到达并被处理 | 接口正常走完（哪怕业务失败也常返回 200） |
| `400` | 请求参数格式错误 | 校验不通过、JSON 解析失败 |
| `401` | 未认证 | 没登录 / token 失效 |
| `403` | 已认证但无权限 | 登录了但不能访问该资源 |
| `404` | 资源不存在 | URL 写错、接口不存在 |
| `500` | 服务器内部错误 | 后端代码抛了未捕获异常 |

【前端类比】你在 axios 里 `catch` 到的、或者用 `data.status` 判断的就是这一层。`axios` 默认把非 2xx 当作 reject 抛进 catch。

## 5.2 第二层：业务状态码（应用层，由后端业务逻辑决定）

关键认知：**demo（以及大量国内项目）的接口，HTTP 状态码几乎永远是 200**，真正的成功/失败靠返回 body 里的业务码判断。这就是下一节的 `R` 对象。

```
一次请求的「双码」流转

前端 axios.post('/department/add', body)
        │
        ▼
   ┌─────────┐  HTTP 200（协议层：请求成功送达）
   │ 后端处理 │ ───────────────────────────────►  body: { code: 0,   ... } 业务成功
   └─────────┘                                    body: { code: 1,   ... } 业务失败(如"名称重复")
                                                   body: { code: 403, ... } 业务级无权限
        │
   只有真正崩了（代码抛异常没接住）才会返回 HTTP 500
```

所以你在前端的判断逻辑常常是「双重」的：

```js
try {
  const data = await axios.post('/department/add', body)
  // 第一层已过（能进 then 说明 HTTP 2xx）；现在判第二层业务码
  if (data.data.code === 0) {
    // 业务成功
  } else {
    // 业务失败，message 里有给用户看的提示
    message.error(data.data.message)
  }
} catch (e) {
  // HTTP 4xx/5xx 才到这（网络错、500 等）
}
```

---

# 六、demo 的统一返回对象 R

所有接口都返回一个泛型包装类 `R<T>`，源码在 `demo-parent/demo-common/demo-common-core/.../entity/R.java`。这是你和后端协作的「数据契约」，必须吃透。

> ⚠️ **重要更正**：很多教程（包括需求里）说统一返回是 `{ code, msg, data }`，但 **demo 示例字段名是 `{ code, message, data }`**。以匿名化示例代码为准，别在前端写错字段名。

| 通用教科书字段 | demo 示例字段 | 类型 | 含义 |
|--------------|-------------|------|------|
| `code` | `code` | `int` | 业务状态码，**0 = 成功**，非 0 = 各类失败 |
| `msg` | `message` | `String` | 提示文案，失败时给用户看的话术 |
| `data` | `data` | `T`（泛型） | 真正的业务数据 |

`R` 里的业务码来自 `ResponseEnum` 枚举（注意 SUCCESS 是 **0** 不是 200）：

```java
// 摘自 ResponseEnum：code 的可能取值
SUCCESS(0, "成功"),          // 业务成功，前端就认这个 0
FAIL(1, "失败"),             // 通用业务失败
FAIL_VALIDATE(400, "校验失败"),
FAIL_401(-1, "请先登录"),     // 注意是 -1，不是 HTTP 的 401
FAIL_403(403, "无权限"),
FAIL_500(500, "接口出错了，请刷新重试一下！");
```

## 6.1 Controller 里怎么构造 R

你在前面所有 demo 代码里看到的 `R.ok(...)`，就是构造成功响应的工厂方法（`R.java` 第 74 行）：

```java
// 成功：把业务数据塞进 data，code 自动设为 0
@GetMapping("/getById")
public R<DepartmentOut> getById(@RequestParam("id") Integer id) {
    return R.ok(departmentService.getDepartmentById(id));
    // 等价于返回 body: { "code": 0, "message": null, "data": {部门对象} }
}
```

> ⚠️ 细节提醒：`message` 字段声明时默认值是 `"success"`，但 `R.ok(data)` 内部调用 `restResult(0, null, data)`，把 message 传成 `null` 覆盖掉了默认值。也就是说**成功响应里 message 通常是 null（或被框架按 null 序列化省略）**。所以前端判断成功只认 `code === 0`，别去读 message 文案——它只有失败时（`R.error(msg)`）才有内容。

`R` 提供的核心静态工厂方法（都在 `R.java`）：

| 方法 | 产出 | 用途 |
|------|------|------|
| `R.ok(data)` | `code=0`，`data=data` | 业务成功，带数据返回 |
| `R.ok()` | `code=0`，`data=null` | 成功但无需返回数据 |
| `R.ok(data, msg)` | `code=0`，附带提示文案 | 成功且想给前端一句提示 |
| `R.error(message)` | `code=1`，`message=...` | 通用业务失败 |
| `R.error(code, message)` | 自定义码和文案 | 精确控制失败类型 |

【前端类比】`R<T>` 就是后端版的「统一响应拦截器约定」。你在前端写 `axios.interceptors.response.use` 统一处理 `data.data`；后端则用 `R` 这个类**强制所有接口返回同构的结构**，让前端拦截器能用一套逻辑处理所有接口。泛型 `<T>`（见第 06 课）保证了 `data` 字段的类型——`R<DepartmentOut>` 告诉调用方「data 里装的是 DepartmentOut」，前端拿 TS 类型对齐时就照这个来。

```
R<T> 结构 = 信封模型
┌────────────────────────────────────┐
│  R 信封                              │
│  ┌──────────────────────────────┐  │
│  │ code: 0      ← 这趟成功没？    │  │
│  │ message: null  ← 出错才有文案     │  │
│  │ data: <T>      ← 真正的货在这    │  │
│  │      { id:1, name:"研发部" }   │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
前端只需拆信封：先看 code，再取 data
```

---

# 七、把一个接口从前到后串起来

用 `DepartmentController.add`（新增部门）走一遍完整契约，体会前后端如何靠 RESTful 约定 + R 对象协作：

```
① 前端发起（你写的代码）
   axios.post('/department/add', {
     name: '研发二部',
     organizationId: 100
   })
        │  POST 因为是写操作；body 因为参数是对象
        ▼
② 后端 Controller 接住（@RequestBody 把 JSON 反序列化成 Department 对象，见第 08 课）
   @PostMapping("/add")
   public R save(@RequestBody Department department) {
       return R.ok(departmentService.save(department));
   }
        │  Service 落库后返回结果，R.ok 包装成统一信封
        ▼
③ HTTP 响应（协议层 200 + body）
   HTTP/1.1 200 OK
   {
     "code": 0,
     "message": null,
     "data": true          // save 成功返回 true
   }
        │
        ▼
④ 前端拆信封
   if (data.data.code === 0) { message.success('新增成功') }
```

整条链路里，RESTful 规范决定了**第①②步的方法与 URL**，`R` 对象决定了**第③④步的数据形态**。两者合起来就是前后端的完整契约。

---

# 八、本课小结

- **REST 的核心**：把后端资源化，用 HTTP 方法表达「读/建/改/删」动作；GET/PUT/DELETE 幂等，POST 不幂等。
- **标准 REST vs demo 现实**：demo 走 RPC 风格——动作写进 URL（`/getById`、`/add`、`/update`、`/delete`），几乎只用 GET 和 POST。进存量项目要**跟随既有约定**，一致性优先于「更标准」。
- **GET vs POST 的实用规则**：纯查询 + 简单参数用 GET + `@RequestParam`；复杂对象参数或写操作用 POST + `@RequestBody`。
- **两层「码」别混**：HTTP 状态码（协议层，demo 基本恒为 200）≠ 业务状态码（应用层，在 R 的 `code` 里）。前端判断常需「双重」逻辑。
- **demo 统一返回 `R<T>`**：示例字段是 `{ code, message, data }`（不是教科书的 `{code, msg, data}`），`code=0` 表示业务成功；用 `R.ok(data)` / `R.error(msg)` 构造，泛型 `<T>` 锁定 `data` 的类型。
- 引用匿名化示例代码：`OrganizationController.java`、`DepartmentController.java`、`R.java`、`ResponseEnum.java`。

**下一课预告**：第 13 课进入数据持久层——MyBatis 与 Mapper。我们会拆开第 04 课「五站」里最后一站，看 `R.ok(service.getById(id))` 背后 Service 调 Mapper、Mapper 里的 SQL 是怎么把数据库一行记录变成 `DepartmentOut` 对象的，并对比你熟悉的前端 ORM（如 Prisma）思路。

# 九、总结

- **为什么前端工程师更要懂 RESTful**：你在前端调接口时，其实一直在「消费」后端定下的规则：
- **HTTP 方法的语义：不只是「能用就行」**：REST 的核心思想：把后端的一切都看作资源（Resource），用 HTTP 方法表达你想对资源做什么「动作」。
- **GET vs POST：demo 里到底怎么选**：抛开标准 REST，看 demo 工程师实际是怎么在 GET 和 POST 之间做选择的。
- **URL 设计规范**：即便走 RPC 风格，好的 URL 仍有章法。

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“Java（12）- RESTful API 设计规范”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
