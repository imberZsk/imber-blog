# Java（12） - MVC 三层架构

> 读完你能：围绕“MVC 三层架构”理解“先用前端的话讲清楚：你早就在分层了”与“三层的职责边界（核心）”，并结合正文示例完成实践与排障。

> 第 4 课你已经跟着一个请求跑完了网关→Controller→Service→Mapper→MySQL 这五站；这一课我们停下来，专门讲清楚中间这三层为什么要这么分、各自只该干什么，以及该把代码写在哪一层。

---

# 一、先用前端的话讲清楚：你早就在分层了

写 React/Vue 的时候，一个稍微像样的项目你绝不会把「发请求 + 改状态 + 渲染按钮」全塞进一个组件里。你会自然地拆成三摊：

```
页面组件 (View)      ← 只管渲染 + 收集用户操作
   │
store / hooks       ← 管业务状态、编排逻辑
   │
api / request.ts    ← 只管跟后端 HTTP 通信
```

Java 后端的 MVC 三层，本质是同一个思路，只是「上下游」反过来了——前端的最下游是「调后端」，后端的最下游是「调数据库」：

| 前端分层 | 职责 | Java 后端对应层 | 职责 |
|---|---|---|---|
| 页面组件 / View | 收集输入、展示结果 | **Controller** | 收 HTTP 请求、返响应 |
| store / hooks / service | 业务编排、状态流转 | **Service** | 业务规则、事务、流程编排 |
| api / request.ts | 跟服务端通信 | **Mapper (DAO)** | 跟数据库通信 |

记住一句话就够了：**Controller 收发、Service 思考、Mapper 取数**。下面逐层拆。

---

# 二、三层的职责边界（核心）

## 2.1 整体数据流向

```
HTTP 请求
   │
   ▼
┌─────────────────────────────────────────────┐
│  Controller    收发层 / 接待员                 │
│  · 解析参数 (@RequestParam / @RequestBody)     │
│  · 调用 Service                               │
│  · 把结果包成统一响应 R 返回                     │
│  ✗ 不写业务规则、不碰数据库                       │
└───────────────────┬─────────────────────────┘
                    │  传入参数 / 拿回结果对象
                    ▼
┌─────────────────────────────────────────────┐
│  Service       业务层 / 大脑                    │
│  · 校验业务规则、抛 BusinessException           │
│  · 编排多个 Mapper / 其他 Service              │
│  · 管事务 @Transactional                       │
│  · 实体 Organization → 出参 OrganizationOut 的转换         │
│  ✗ 不解析 HTTP、不写 SQL 细节                    │
└───────────────────┬─────────────────────────┘
                    │  调 baseMapper.xxx(...)
                    ▼
┌─────────────────────────────────────────────┐
│  Mapper        数据层 / 仓库管理员               │
│  · 只负责一件事：把 SQL 跑出来                    │
│  · selectById / selectList / 自定义 SQL        │
│  ✗ 不懂业务，不知道"网点"是干嘛的                 │
└───────────────────┬─────────────────────────┘
                    ▼
                 MySQL
```

## 2.2 一句话职责对照表

| 层 | 该做的 | 绝对不该做的 | 前端类比 |
|---|---|---|---|
| Controller | 参数解析、调 Service、包响应 | 写 if-else 业务判断、直接查库 | 组件里只调 store，不写业务 |
| Service | 业务校验、流程编排、事务 | 解析 HTTP header、拼 JSON 响应 | store action 里编排逻辑 |
| Mapper | 执行 SQL | 任何业务判断 | `request.ts` 只发请求 |

---

# 三、用 demo-basic 示例链路串一遍

我们拿第 4 课见过的 `/organization/getById` 接口，把三层的匿名化示例代码摆在一起看。三个文件分别是：

- Controller：`demo-basic/demo-basic-biz/.../controller/OrganizationController.java`
- Service：`demo-basic/demo-basic-service/.../service/OrganizationService.java`
- Mapper：`demo-basic/demo-basic-service/.../mapper/OrganizationMapper.java`

## 3.1 第 1 层 Controller —— 薄薄一层，只做收发

```java
@RestController                       // 声明这是个 REST 控制器，返回值自动转 JSON（见第 8 课注解）
@RequestMapping("/organization")           // 该类下所有接口的统一前缀
public class OrganizationController extends BaseController {

    @Autowired                        // 由 Spring 注入 Service 实例（见第 5 课依赖注入）
    private OrganizationService organizationService;

    @GetMapping("/getById")           // GET /organization/getById?id=123
    public R<OrganizationOut> getOrganization(@RequestParam("id") int id) {
        // 注意：这里一行业务逻辑都没有
        // 收到 id → 丢给 Service → 把结果用 R.ok() 包成统一响应返回
        return R.ok(organizationService.getOrganization(id));
    }
}
```

看出门道了吗？这个方法体只有一行。Controller 像餐厅接待员：接过你的点单，转身递给后厨，不自己炒菜。

**前端类比**：这正是你写的 Vue 组件里 `@click="userStore.fetchUser(id)"`——组件只负责把事件转给 store，不在 `<template>` 里写业务判断。

> ⚠️ 新手最常见的坏味道：在 Controller 里写 `if (id == null) throw...` 加一堆业务校验，再直接 `new QueryWrapper()` 查库。这等于在 React 组件里直接写 `fetch` 加数据清洗——能跑，但层就乱了。

## 3.2 第 2 层 Service —— 真正干活的大脑

```java
@Slf4j
@Service("organizationService")            // 声明为业务层 Bean，名字叫 organizationService
public class OrganizationService extends ServiceImpl<OrganizationMapper, Organization> {

    public OrganizationOut getOrganization(Integer id) {
        // ① 业务校验：id 必须是有意义的正整数，否则抛业务异常（见第 7 课 BusinessException）
        //    WHY 放这层：参数"合不合业务规矩"是业务知识，Controller 和 Mapper 都不该懂
        if (!CommonFunctions.meaningfulInt.test(id)) {
            throw new BusinessException("网点id不能为空");
        }

        // ② 调数据层取数据——注意 baseMapper 就是 Mapper，Service 只管"要数据"，不管 SQL 怎么写
        Organization organization = baseMapper.selectById(id);

        // ③ 业务校验：查不到要给出业务含义明确的提示，而不是返回 null 让前端猜
        if (Objects.isNull(organization)) {
            throw new BusinessException("不存在的网点,请检查");
        }

        // ④ 实体转出参：Organization 是数据库实体，OrganizationOut 是对外的视图对象
        //    WHY 要转：实体里可能有不该暴露给前端的字段（如内部状态、密钥）
        OrganizationOut organizationOut = new OrganizationOut();
        BeanUtils.copyProperties(organization, organizationOut);   // 同名字段自动拷贝

        return organizationOut;
    }
}
```

Service 这一层把四件事做全了：**业务校验 → 取数 → 再校验 → 数据转换**。这就是「大脑」该干的：决策和编排。

**Entity vs Out 对象**——前端读者很容易忽略的一点：

| 对象 | 角色 | 前端类比 |
|---|---|---|
| `Organization` (Entity) | 跟数据库表一一对应的「原始数据」 | 后端原始 response，字段全 |
| `OrganizationOut` (Out/VO) | 给前端看的「裁剪后视图」 | 你在 api 层 `transform` 后吐给组件的 DTO |

为什么不直接把 `Organization` 返给前端？因为实体字段可能含敏感信息（内部状态码、结算密钥），也可能字段名和前端期望不一致。`BeanUtils.copyProperties` 就是那道「过滤+整形」的关口，等价于你在 `request.ts` 里写的 `data => ({ id: data.id, name: data.organizationName })`。

### 进阶看一眼：Service 编排能有多复杂

`getById` 只是入门款。同一个 `OrganizationService` 里的 `buildOrganizationTree`（查司机所属集团树形结构）才是 Service 层威力的体现——它一口气编排了多个数据源：

```java
public DrOrganizationTreeOut buildOrganizationTree(OrganizationTreeIn organizationTreeIn) {
    // 1. 先查司机关联的集团（调 driverOrganizationService，另一个 Service）
    List<DriverOrganization> driverOrganizationList = driverOrganizationService.list(...);

    // 2. 业务规则：极速版客户不能上报在途费用，过滤掉（这是纯业务知识）
    filterOutTopSpeed(driverOrganizationList);
    if (CollectionUtils.isEmpty(driverOrganizationList)) {
        throw new BusinessException("未查询到司机信息");
    }

    // 3. 业务规则：客户数据排前面、测试集团排后面（排序背后是业务诉求）
    // 4. 再查网点、按 group 分组、递归组装成树形结构 ...
    Map<Integer, List<Organization>> groupComs =
        organizationList.stream().collect(Collectors.groupingBy(Organization::getGroupId));
    // ...
}
```

注意这里面**没有一行 HTTP 代码，也没有一行手写 SQL**。它做的全是「业务决策 + 编排多个数据源」。这正是 Service 层存在的意义：把分散的数据攒起来、按业务规则加工成一个完整结果。

**前端类比**：就像你的 `dashboardStore` 里一个 action 同时 `await` 了用户、订单、权限三个 api，再 merge 成页面要的数据结构——编排逻辑放 store，不放组件，也不放 api 层。

## 3.3 第 3 层 Mapper —— 只跟数据库说话

```java
// 继承 MyBatis-Plus 的 BaseMapper，白送 selectById / selectList / updateById 等一堆方法
public interface OrganizationMapper extends BaseMapper<Organization> {

    // 简单 CRUD 不用写，继承就有；只有复杂 SQL 才需要自己声明方法
    // 这是一个自定义分页查询，具体 SQL 写在配套的 XML 里
    IPage<Organization> getOrganizationPage(Page page, @Param("organization") Organization organization);

    // 悲观锁查询（select ... for update），余额并发更新时用
    // @Param 给参数起个名字，方便 XML 里的 SQL 用 #{id} 引用
    Organization selectOrganizationForUpdate(@Param("id") Integer id);
}
```

`Mapper` 是个**接口**，没有方法体——这是 Java 后端一个让前端同学惊讶的点。`getOrganization` 里调的 `baseMapper.selectById(id)`，方法体在哪？答案是 MyBatis-Plus 框架在运行时用动态代理（见第 8 课反射）帮你生成了实现，自动拼出类似 `SELECT id, organization_name, ... FROM organization WHERE id = ?` 的语句（MyBatis-Plus 会按实体字段列出具体列名，而不是 `SELECT *`）。

**前端类比**：像你只声明一份 `interface UserApi { getUser(id): Promise<User> }`，具体的 `fetch` 实现由某个工具（比如自动生成的 SDK）填上。你只管「声明要什么数据」，不管 SQL 字符串怎么拼。

Mapper 的铁律：**它不懂业务**。`selectById` 不知道「网点」是什么、也不知道「id 为空要报错」——那是 Service 的事。Mapper 只回答一个问题：「这条 SQL 的结果是什么」。

---

# 四、为什么非要分这三层？

前端读者可能会问：「`getById` 就三行逻辑，分三个文件不是脱裤子放屁吗？」我们用四个工程场景回答。

## 4.1 复用：业务方法被多处调用

`OrganizationService.getOrganization(id)` 不只被 `getById` 接口调用。翻一下同文件，`buildOrganizationTree` 内部也调了它：

```java
OrganizationOut organization = organizationService.getOrganization(driverOrganizationList.get(0).getOrganizationId());
```

如果当初把「校验 + 取数 + 转换」全写在 Controller 里，那么每个需要这段逻辑的地方都得复制一遍。抽到 Service，一处定义、处处复用。**这跟你把请求逻辑抽进 `useUser()` hook 而不是每个组件各写一遍 `fetch`，是一模一样的动机。**

## 4.2 替换：换数据来源不影响业务

哪天 `organization` 表要分库分表、或者改成调远程服务取数据，**只动 Mapper 层**，Service 和 Controller 一行不改。因为 Service 只依赖「`baseMapper.selectById` 能给我一个 Organization」这个约定，不关心底层是 MySQL 还是别的。

**前端类比**：你的 store 只依赖 `userApi.getUser()` 的返回结构。后端从 REST 换成 GraphQL，你只改 `api` 层适配，组件和 store 不用动。

## 4.3 关注点分离：改一处不怕崩另一处

```
改 HTTP 协议（GET 改 POST、加个 header）   → 只动 Controller
改业务规则（极速版也能上报了）             → 只动 Service
改 SQL（加个索引提示、改查询条件）          → 只动 Mapper
```

层与层之间靠「方法签名」这个契约连接，改动被锁在单层内，不会牵一发动全身。

## 4.4 事务边界天然落在 Service

数据库事务（要么全成功要么全回滚）应该包住「一组业务操作」，而一组业务操作恰好就是 Service 的一个方法。看示例：

```java
@Transactional(rollbackFor = Exception.class, timeout = 6)   // 事务注解加在 Service 方法上
public void updateBalanceWithLock(IncrementUpdateSettleRemainderIn updateReq) {
    Organization organization = baseMapper.selectOrganizationForUpdate(...);  // select for update 加锁
    // ... 算新余额 ...
    baseMapper.updateById(organizationUpdate);                      // 更新
    // 这一查一改要么都成、要么都回滚，事务边界正好是这个 Service 方法
}
```

事务为什么不放 Controller？因为 Controller 该薄。不放 Mapper？因为单条 SQL 谈不上「一组操作」。**Service 是唯一合适的事务边界**——它正好对应一个完整的业务动作。

---

# 五、demo 项目里层是怎么落到目录上的

demo 是个多模块 Maven 工程（见第 1 课 Maven），三层物理上分在不同模块/包里：

```
demo-basic/
├── demo-basic-biz/                    ← 对外暴露的「业务入口」模块
│   └── .../controller/
│       └── OrganizationController.java    ← Controller 层在这
│
├── demo-basic-service/                ← 核心业务实现模块
│   └── .../service/
│   │   └── OrganizationService.java       ← Service 层在这
│   └── .../mapper/
│       └── OrganizationMapper.java        ← Mapper 层在这
│
└── demo-basic-common/                 ← 共享的数据传输对象
    └── .../in/  /out/                ← OrganizationIn(入参) / OrganizationOut(出参)
```

包名里的 `controller` / `service` / `mapper` 不是装饰，是团队约定：**看到包名就知道这个类属于哪一层、该写什么、不该写什么**。新人 review 代码时，一个「业务校验出现在 controller 包里」一眼就能揪出来。

**前端类比**：等价于你项目里的 `views/`、`stores/`、`api/` 目录约定——文件放哪个目录，就该承担那个目录的职责，混了就是坏味道。

---

# 六、动手判断：这段代码该写在哪一层？

给你几道判断题，答案在后面。

1. 「id 为空时抛异常提示用户」→ 写在哪层？
2. 「把 GET 接口改成 POST」→ 改哪层？
3. 「查询时加一个 `state = 启用` 的过滤条件」→ 改哪层？
4. 「把 Organization 实体的敏感字段过滤掉再返回」→ 哪层？

<details>
<summary>看答案</summary>

1. **Service**。这是业务校验，是「业务知识」。
2. **Controller**。HTTP 方法/协议属于收发层，业务逻辑一行不用动。
3. **Mapper**（或 Service 里构造 QueryWrapper 时）。这是数据查询条件。demo 里很多查询用 `Wrappers.<Organization>lambdaQuery().eq(Organization::getState, ...)` 在 Service 里拼条件，简单查询拼在 Service、复杂 SQL 落到 Mapper 的 XML，都可接受。
4. **Service**。用 `BeanUtils.copyProperties(organization, organizationOut)` 做 实体→出参 的裁剪，是业务层的数据整形职责。

</details>

---

# 七、本课小结

- **三层职责一句话**：Controller 收发、Service 思考、Mapper 取数。
- **Controller 要薄**：只解析参数、调 Service、用 `R.ok()` 包响应；不写业务、不碰数据库。demo 的 `getOrganization` 方法体只有一行。
- **Service 是大脑**：业务校验（抛 `BusinessException`）、流程编排（如 `buildOrganizationTree` 攒多个数据源）、事务边界（`@Transactional`）、实体→出参转换（`BeanUtils.copyProperties`）都在这层。
- **Mapper 只取数**：是个接口，简单 CRUD 由 MyBatis-Plus 的 `BaseMapper` 白送，复杂 SQL 才自己声明方法；它不懂任何业务。
- **分层的四个理由**：复用、可替换数据源、关注点分离、事务边界天然落在 Service。
- **前端心智映射**：Controller≈组件、Service≈store/hooks、Mapper≈api/request.ts；Entity≈后端原始 response、Out≈裁剪后给组件的 DTO。
- 示例链路引用：`demo-basic` 的 `OrganizationController.getOrganization` → `OrganizationService.getOrganization` → `OrganizationMapper(extends BaseMapper).selectById`，外加 `buildOrganizationTree`、`updateBalanceWithLock` 展示了复杂编排与事务。

> **下一课预告**：第 12 课《Spring 的 IOC 与 DI》。这一课你反复看到 `@Autowired private OrganizationService organizationService`——这些对象到底是谁、在什么时候、怎么塞进来的？我们会拆开 Spring 容器，讲清楚「控制反转」和「依赖注入」这两个让前端同学一开始最懵、但真正理解后会拍大腿的核心概念。

# 八、总结

- **为什么非要分这三层？**：前端读者可能会问：「getById 就三行逻辑，分三个文件不是脱裤子放屁吗？
- **先用前端的话讲清楚：你早就在分层了**：写 React/Vue 的时候，一个稍微像样的项目你绝不会把「发请求 + 改状态 + 渲染按钮」全塞进一个组件里。
- **用 demo-basic 示例链路串一遍**：我们拿第 4 课见过的 /organization/getById 接口，把三层的匿名化示例代码摆在一起看。
- **demo 项目里层是怎么落到目录上的**：demo 是个多模块 Maven 工程（见第 1 课 Maven），三层物理上分在不同模块/包里：

## 参考资料

- [Dev.java 学习路径](https://dev.java/learn/)
- [Spring Boot 文档](https://docs.spring.io/spring-boot/)
