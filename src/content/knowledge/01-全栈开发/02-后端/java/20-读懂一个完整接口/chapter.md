# Java（19）- 读懂一个完整接口

> 前面 18 课把零件一个个拆给你看了。这一课我们把零件装回去——拿 demo-basic 的 `GET /organization/getById` 这个示例接口，从 Controller 一路追到数据库，再追回来，彻底搞懂数据在每一层换了几次"马甲"，以及为什么要换。

---

# 一、先回到第 4 课埋的那个伏笔

第 4 课讲 HTTP 生命周期时，我们画过这张"五站图"：

```
浏览器/前端
   │  GET /organization/getById?id=123
   ▼
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ 网关      │ → │Controller│ → │ Service  │ → │ Mapper   │ → MySQL
│ Gateway  │   │ 收请求    │   │ 业务逻辑  │   │ 拼SQL     │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
```

当时我说了一句话："数据在每一层之间传递时，长得不太一样，这个我们后面专门讲。" —— 就是这一课。

那时候你可能会想：前端不就是 `axios.get(...)` 拿到一个 JSON 对象，然后整条链路都用这一个对象吗？为什么 Java 要搞那么多类？

答案是：**同一份"公司数据"，在不同的层有不同的身份，Java 用三种不同的类来表达这三种身份。** 这三种类就是今天的主角：`Entity`、`Out`、`In`。

---

# 二、三种 DTO：In / Out / Entity

先上对照表，建立整体印象，后面逐个拆：

| 角色 | demo 里的命名 | 它代表什么 | 类比前端 |
| --- | --- | --- | --- |
| Entity（实体） | `Organization` | 数据库一张表的一行，字段和表列一一对应 | 数据库 ORM 的 model / Prisma 的 model |
| In（入参） | `OrganizationIn` | 前端**传进来**的请求参数 | `axios.post(url, body)` 里的 `body` 的 TS 类型 |
| Out（出参） | `OrganizationOut` | 返回**给前端**的响应数据 | 接口响应 `data.data` 的 TS 类型 |

> 「DTO」= Data Transfer Object，数据传输对象。你可以理解成"专门用来在两个地方之间搬运数据的纯数据结构"，等价于前端里那种只有字段、没有方法的 `interface`。

## 2.1 前端类比：你其实早就在分了，只是没起名字

在 TS 项目里写一个"获取公司详情"的接口，认真的人会写三个类型：

```typescript
// 1) 请求参数类型 —— 对应 Java 的 In
interface GetOrganizationParams {
  id: number;
}

// 2) 响应数据类型 —— 对应 Java 的 Out
//    理想情况下，这里应该只放前端要展示的字段，
//    刻意不放 credentialDigest（凭证摘要）这类敏感字段
interface OrganizationVO {
  id: number;
  organizationName: string;
}

// 3) 后端数据库里的样子 —— 前端通常看不到，对应 Java 的 Entity
```

Java 只是把这套"分类型"的纪律，从"可选的好习惯"变成了"强制的工程结构"——每种身份都是一个独立的 `.java` 文件，放在不同的包里。

---

# 三、逐个拆：从数据库那一端往前端方向看

## 3.1 Entity：`Organization` —— 数据库表的镜子

文件：`demo-basic-service/.../service/entity/Organization.java`

```java
@Data                                    // Lombok：自动生成 getter/setter，见第 8 课
@EqualsAndHashCode(callSuper = true)
@TableName("organization")                    // WHY: 告诉 MyBatis-Plus 这个类对应数据库的 organization 表
public class Organization extends Model<Organization> {   // 继承 Model 后自带 insert/updateById 等方法

    @TableId                             // WHY: 标记这个字段是主键，主键策略由它决定
    private Integer id;                  // 主键id，对应表的 id 列

    private Integer groupId;             // 集团id，对应表的 group_id 列
    private String organizationName;          // 物流公司名称，对应 organization_name 列
    private String organizationCode;          // 物流公司代码
    // ... 后面还有 70 多个字段，和 organization 表的列一一对应
    private String credentialDigest;        // 凭证摘要，只能留在服务内部
    private String internalRemark;           // 内部备注，不应暴露给前端
}
```

几个关键点：

- `@TableName("organization")`、`@TableId` 这些是 **MyBatis-Plus 的注解**（第 8 课讲过注解是"贴在代码上的标签"）。它们的存在说明：**Entity 是和数据库强绑定的**。
- 字段命名遵循 Java 的驼峰 `organizationName`，数据库列名是下划线 `organization_name`，MyBatis-Plus 自动帮你做这个映射（就像有些 ORM 帮你做 `camelCase ↔ snake_case`）。
- Entity 可能包含 `credentialDigest`、`internalRemark` 等内部字段，因为它需要完整表达数据库记录；这不代表这些字段可以直接返回给客户端。

```
┌─────────────────────────┐        ┌──────────────────────┐
│  MySQL: organization 表       │        │  Java: Organization 实体    │
│  id          INT         │ ─映射→ │  Integer id           │
│  organization_name VARCHAR    │        │  String  organizationName  │
│  credential_digest VARCHAR│       │  String credentialDigest│
│  ...70+ 列               │        │  ...70+ 字段           │
└─────────────────────────┘        └──────────────────────┘
            一行 = 一个 Organization 对象
```

## 3.2 Out：`OrganizationOut` —— 给前端看的那一面

文件：`demo-basic-common/.../common/out/OrganizationOut.java`

```java
@Data
public class OrganizationOut {
    private Integer id;                  // 主键id
    private Integer groupId;             // 集团id
    private String organizationName;          // 物流公司名称
    // ... 大部分字段和 Organization 一样

    /**
     * 子网点 —— 注意！Entity 里没有这个字段
     * WHY: 返回组织树时，要把下级网点嵌套进来，这是"给前端拼好的形状"
     */
    private List<OrganizationOut> childrenList;
}
```

对比一下你会发现两件事：

1. **它没有 MyBatis 注解**（没有 `@TableName`、没有 `@TableId`、不继承 `Model`）。因为它跟数据库没关系，它只是个纯数据袋子，专门用来装"要返回的东西"。
2. **它的字段可以和 Entity 不完全一样**。`OrganizationOut` 多了一个 `childrenList`（子网点列表），这是数据库表里**没有**的——它是后端把多行数据"组装成树"之后才有的形状，是专门为前端的渲染需求拼出来的。

## 3.3 In：`OrganizationIn` —— 前端传进来的那一面

文件：`demo-basic-common/.../common/in/OrganizationIn.java`

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationIn {
    private List<Integer> ids;     // 前端传进来的一批公司id（批量查询用）
    private Integer groupId;       // 前端传进来的集团id
}
```

看这个类有多"小"——只有 2 个字段。这正是 In 的精髓：

> **前端要传什么，In 里才有什么。** 前端批量查公司只需要传一组 `ids`，那 `OrganizationIn` 就只放 `ids`（和顺带的 `groupId`）。它绝不会有 `credentialDigest`、`internalRemark` 这些字段——前端根本不该传这些。

对比一下 Entity 有 70+ 字段，In 只有 2 个字段，这个体量差距本身就在说明问题：**它们服务的对象完全不同。**

---

# 四、串起来：getById 这条链路完整走一遍

现在把三种 DTO 放进完整的调用链。这是 demo 里 `GET /organization/getById?id=123` 的完整代码。

## 4.1 Controller：收请求、定契约

文件：`demo-basic-biz/.../controller/OrganizationController.java`

```java
@RestController
@RequestMapping("/organization")          // 这个 Controller 下所有接口都以 /organization 开头
public class OrganizationController extends BaseController {

    @Autowired                       // 注入 Service，见第 5 课依赖注入
    private OrganizationService organizationService;

    @GetMapping("/getById")          // 完整路径 GET /organization/getById
    public R<OrganizationOut> getOrganization(@RequestParam("id") int id) {
        // @RequestParam: 从 URL 的 ?id=123 里取值，见第 8 课
        // 返回类型 R<OrganizationOut>: 用 Out 而不是 Entity —— 这是今天的重点
        return R.ok(organizationService.getOrganization(id));
    }
}
```

注意方法签名 `public R<OrganizationOut> getOrganization(...)`：

- 入参用 `int id`（简单参数直接接，没必要包成 In）。
- **出参用 `R<OrganizationOut>`，不是 `R<Organization>`**。`R` 是统一响应包装（demo 里它的字段是 `{ code, message, data }`，类似前端常约定的 `{ code, msg, data }`），`OrganizationOut` 是真正塞进 `data` 的业务数据。

前端拿到的 JSON 长这样：

```json
{
  "code": 0,
  "message": "success",
  "data": { "id": 123, "organizationName": "上海分公司", "childrenList": null }
}
```

（`getById` 只做了字段对拷、没给 `childrenList` 赋值，所以它是 `null`；只有 `/organization/tree` 那种查组织树的接口才会把它填上。注意 demo 的 `R` 用的字段名是 `code`/`message`/`data`，不是常见的 `code`/`msg`/`data`，真正的业务数据装在 `data` 里。）

## 4.2 Service：业务逻辑 + 换马甲的关键一步

文件：`demo-basic-service/.../service/OrganizationService.java`

```java
// OrganizationService 继承 ServiceImpl，自带 baseMapper（即 OrganizationMapper），见第 5 课
public class OrganizationService extends ServiceImpl<OrganizationMapper, Organization> {

    public OrganizationOut getOrganization(Integer id) {
        // 分支1: 校验 id 是否有意义（null 或非正数都不行），不合法直接抛业务异常，见第 7 课
        if (!CommonFunctions.meaningfulInt.test(id)) {
            throw new BusinessException("网点id不能为空");
        }

        // 准备一个空的"出参袋子"，待会儿往里装数据
        OrganizationOut organizationOut = new OrganizationOut();

        // 调 Mapper 查数据库，拿回来的是 Entity（Organization），不是 Out
        Organization organization = baseMapper.selectById(id);

        // 分支2: 数据库查不到这条记录，说明 id 不存在，抛异常提示用户
        if (Objects.isNull(organization)) {
            throw new BusinessException("不存在的网点,请检查");
        }

        // ★关键★ 把 Entity 的字段一个个拷进 Out。这一步就是"换马甲"
        BeanUtils.copyProperties(organization, organizationOut);

        return organizationOut;     // 返回 Out，Entity 到此为止，不再往外走
    }
}
```

这就是整条链路的核心。注意数据的身份变化：

```
selectById 返回      copyProperties        return
   Organization    ─────────────────────────→  OrganizationOut
   (Entity)        字段对拷                  (Out)
   带 70+ 字段                              准备返给前端
   含 credentialDigest
```

## 4.3 Mapper + 数据库：第 4 课讲过，这里不重复

`baseMapper.selectById(id)` 由 MyBatis-Plus 自动生成 `SELECT * FROM organization WHERE id = 123`，把结果行映射成一个 `Organization` 对象。这部分第 4 课已经详细讲过，按下不表。

## 4.4 一张图看清整条链路上的身份切换

```
前端 axios.get('/organization/getById?id=123')
        │  请求只带一个 id
        ▼
┌─────────────────────────────────────────────┐
│ Controller.getOrganization(int id)                │  入参: 简单 int
│   return R<OrganizationOut>                        │  约定出参形状为 Out
└───────────────┬─────────────────────────────┘
                │ 传 id
                ▼
┌─────────────────────────────────────────────┐
│ Service.getOrganization(id)                        │
│   ① 校验 id                                    │
│   ② Organization c = baseMapper.selectById(id) ←── │ 拿到 Entity（带敏感字段）
│   ③ BeanUtils.copyProperties(c, out)          │ ★换马甲：Entity → Out★
│   ④ return out                                │
└───────────────┬─────────────────────────────┘
                │ 返回 OrganizationOut
                ▼
┌─────────────────────────────────────────────┐
│ Mapper / MySQL                                │  SELECT * FROM organization
│   一行数据 → Organization 对象                       │
└─────────────────────────────────────────────┘

数据身份: int id  →  Organization(Entity)  →  OrganizationOut(Out)  →  JSON
```

---

# 五、灵魂拷问：为什么不直接返回 Entity？

你现在一定憋着这个问题：`Organization` 里字段更全，直接 `return organization` 不就完事了？干嘛多写一个 `OrganizationOut`，还要 `copyProperties` 拷一遍，这不脱裤子放屁吗？

有四个实打实的理由，每一个都能在生产事故里找到对应的血泪：

## 5.1 理由 1：安全 —— Out 给了你一个能裁剪敏感字段的"过滤层"

回看 `Organization` 实体，它有这些字段：

```java
private String credentialDigest;    // 凭证摘要
private String internalRemark;      // 内部备注
```

如果直接 `return organization`，**这些字段会原样序列化进 JSON 返回给前端**，任何人打开浏览器 F12 看 Network 就能看到凭证摘要。这是一级安全事故。

而 Out 是一个你**完全可控**的纯数据类：它放哪些字段由接口契约决定。只要不在 Out 里声明内部字段，序列化结果就不会包含它们。例如 `AccountSummaryOut` 只保留展示所需字段：

```java
// AccountSummaryOut：只挑前端要的字段，敏感字段一个不放
public class AccountSummaryOut {
    private Integer id;          // 主键id
    private String groupName;    // 集团名称
    private String shortName;    // 简称
    private String phone;        // 联系电话
    private String address;      // 地址
    // 只保留调用方需要的展示字段
}
```

> **安全规则**：不要先复制完整 Entity 再临时排除敏感字段。应从接口契约出发建立白名单 DTO，只声明调用方确实需要的数据。

> 前端类比：相当于后端给前端的数据做了一次"脱敏"。Entity 是原始档案，Out 应该是对外公开版——前提是你真的把敏感字段删掉。

## 5.2 理由 2：解耦 —— 数据库改了，不该惊动前端

假设有一天 DBA 把 `organization` 表的 `organization_name` 列改名成 `org_name`，或者拆成两张表。

- 如果接口直接返回 Entity：Entity 字段跟着表变，**返回的 JSON 字段名也跟着变**，前端代码全得跟着改，线上直接炸。
- 如果返回的是 Out：你只要在 Service 的 `copyProperties` 那一层把新字段映射到 Out 的老字段名，**前端完全无感**。

这就是分层解耦：**数据库的变化被挡在 Service 这一层，不会穿透到前端。** Out 是后端对前端的"承诺/契约"，这个契约不该因为数据库内部重构而改变。

```
没有 Out（紧耦合）：           有 Out（解耦）：
表结构变 → JSON 变 → 前端炸     表结构变 → 改 copyProperties → 前端无感
```

## 5.3 理由 3：形状自由 —— Out 可以装 Entity 装不下的东西

还记得 `OrganizationOut` 多出来的 `childrenList` 吗？

```java
private List<OrganizationOut> childrenList;   // 子网点，数据库表里没有这一列
```

数据库的 `organization` 表是平的（每行一个公司），没有"嵌套子网点"这种结构。但前端渲染组织树需要嵌套结构。`OrganizationOut` 可以自由地多挂这种"组装出来的字段"，而 Entity 被 `@TableName` 绑死了，**多一个字段就和表对不上**，不能乱加。

> 一句话：Entity 的形状由数据库决定，Out 的形状由前端需求决定。两者诉求不同，所以要拆成两个类。

## 5.4 理由 4：职责单一 —— In/Out/Entity 各管一段，改起来不打架

| | Entity `Organization` | In `OrganizationIn` | Out `OrganizationOut` |
| --- | --- | --- | --- |
| 谁定义它的字段 | 数据库表结构 | 前端要传什么 | 前端要展示什么 |
| 改动它的原因 | 表结构变更 | 请求参数调整 | 返回内容调整 |
| 有数据库注解吗 | 有（`@TableName`） | 没有 | 没有 |
| 字段数量 | 全（70+） | 极少（按需） | 按展示需要裁剪 |
| 在哪个模块 | `-service` | `-common/in` | `-common/out` |

三个类各有各的变化原因，互不干扰。这正是软件设计里的"单一职责"：**一个类只因为一个理由而改变。** 把三种身份揉进一个类，等于让这个类同时为数据库、前端入参、前端出参三个老板打工，迟早精神分裂。

---

# 六、关于 `BeanUtils.copyProperties` 的几句实话

```java
BeanUtils.copyProperties(organization, organizationOut);
//                       ↑源       ↑目标（注意：源在前，目标在后）
```

它干的事：**把源对象里所有"名字相同"的字段值，逐个拷贝到目标对象。** 名字对不上的字段（比如 Out 独有的 `childrenList`）就保持不动。

前端类比：非常像浅拷贝合并对象——

```typescript
Object.assign(organizationOut, organization);  // 把 organization 的同名属性拷进 organizationOut
// 或
const organizationOut = { ...organization };   // 思路类似
```

几个**必须记住的坑**：

| 坑 | 说明 |
| --- | --- |
| 参数顺序 | Spring 的 `BeanUtils.copyProperties(源, 目标)`，**源在前**。但有些库（如 Apache 的）顺序相反，别搞混 |
| 按字段名匹配 | 靠 getter/setter 的名字对应，名字拼错就静默拷不过去，不报错——排查很痛苦 |
| 浅拷贝 | 拷的是引用，嵌套对象不会深拷贝，改目标可能影响源 |
| 类型要兼容 | 同名但类型不同（如一个 `Integer` 一个 `String`）会拷贝失败或出错 |

所以你会看到 demo 里的固定套路：`new OrganizationOut()` → `copyProperties` → `return`。批量的时候就是 for 循环里对每个 Entity 都来这么一遍（见 `getOrganizationOutByIds`）：

```java
List<OrganizationOut> resultList = new ArrayList<>();
for (Organization organization : organizationList) {     // 遍历查出来的每个 Entity
    OrganizationOut organizationOut = new OrganizationOut();
    BeanUtils.copyProperties(organization, organizationOut);  // 逐个换马甲
    resultList.add(organizationOut);
}
return resultList;
```

---

# 七、回到全局：DTO 三件套在模块里的摆放

demo 是多模块项目，三种 DTO 放的位置也有讲究（这也回答了"它们为什么在不同的包"）：

```
demo-basic/
├── demo-basic-common/          ← 对外暴露的"契约"放这里，别的服务也能依赖
│   └── common/
│       ├── in/OrganizationIn.java        ← In：前端/调用方传进来
│       └── out/OrganizationOut.java      ← Out：返回给前端/调用方
│
├── demo-basic-service/         ← 内部实现，不对外
│   ├── entity/Organization.java          ← Entity：紧贴数据库，藏在内部
│   └── service/OrganizationService.java  ← 在这里做 Entity → Out 的转换
│
└── demo-basic-biz/
    └── controller/OrganizationController.java  ← 入口，只认 In/Out，碰不到 Entity
```

注意一个微妙但重要的设计：**`Organization`(Entity) 放在 `-service` 模块里，不对外暴露。** Controller 所在的包甚至不该直接 import Entity。这从物理结构上保证了"Entity 不会泄露到前端"。In/Out 放在 `-common`，因为它们是公开契约，其他微服务通过 Feign 调用时也要用到（见第 4 课提到的服务间调用）。

---

# 八、本课小结

- **同一份数据在不同层有不同身份**，Java 用三种类表达：
  - `Entity`（`Organization`）= 数据库表的镜子，字段全、带 `@TableName`/`@TableId`，藏在 `-service` 内部。
  - `In`（`OrganizationIn`）= 前端传进来的入参，按需裁剪，通常很小。
  - `Out`（`OrganizationOut`）= 返回给前端的出参，可裁剪敏感字段、可加组装字段（如 `childrenList`）。
- **完整链路**：Controller 定契约 `R<OrganizationOut>` → Service 校验 + `selectById` 拿 Entity → `BeanUtils.copyProperties` 换马甲成 Out → 返回。Entity 走到 Service 为止，绝不外泄。
- **为什么不直接返回 Entity**，四个理由：① 安全（Out 采用字段白名单）② 解耦（数据库改了前端无感）③ 形状自由（Out 能装表里没有的嵌套字段）④ 职责单一（各因各的理由而变）。
- **`BeanUtils.copyProperties(源, 目标)`** 按同名字段浅拷贝，注意参数顺序、名字匹配、浅拷贝三个坑。
- **模块摆放** 也在为安全和解耦服务：In/Out 在 `-common`（公开契约），Entity 在 `-service`（内部不外泄）。

引用的 demo 匿名化示例代码：`OrganizationController.getOrganization`、`OrganizationService.getOrganization` / `getOrganizationOutByIds`、`Organization`(Entity)、`OrganizationOut`、`OrganizationIn`。

**下一课预告**：第 20 课《自己动手写一个完整接口》——读懂之后该上手了。我们仿照 `getById` 的套路，从零写一个新接口：建 In/Out、写 Controller、写 Service、调 Mapper，把这一课学到的分层结构亲手敲一遍。

# 九、总结

- **串起来：getById 这条链路完整走一遍**：现在把三种 DTO 放进完整的调用链。
- **灵魂拷问：为什么不直接返回 Entity？**：你现在一定憋着这个问题：Organization 里字段更全，直接 return organization 不就完事了？
- **先回到第 4 课埋的那个伏笔**：第 4 课讲 HTTP 生命周期时，我们画过这张"五站图"：
- **三种 DTO：In / Out / Entity**：先上对照表，建立整体印象，后面逐个拆：

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“Java（19）- 读懂一个完整接口”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
