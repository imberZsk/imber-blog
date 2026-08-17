# Java（04） - HTTP 请求的完整生命周期

> 读完后，你应能完成以下任务：
> - 绘制“Java（04） - HTTP 请求的完整生命周期 / 前端发起的请求”的关键对象与数据流，解释“这一个请求，在后端经历了 5 站。”，并用源码位置、日志或 Trace 标注证据。
> - 为“Java（04） - HTTP 请求的完整生命周期 / 完整链路图”设计正常与异常输入，验证“类比："门卫（Controller）→ 工人（Service）→ 仓库管理员（Mapper）→ 仓库（MySQL）"”，输出首个偏差位置与回归测试结果。
> - 实现“Java（04） - HTTP 请求的完整生命周期 / 第 1 站：网关（demo-openresty-gateway）”的最小代码或配置，检验“请求先到网关，网关看 URL 决定转发给哪个服务。”，输出命令、结果与 Diff，并说明不适用边界。

> 用 demo-basic 示例接口 `getById`，走完"前端请求 → 数据库 → 返回"全链路，建立后端思维模型。

# 一、前端发起的请求

```javascript
// 前端代码（你熟悉的部分）
const data = await axios.get('/organization/getById?id=123')
console.log(data.data)  // { code: 0, data: { id: 123, name: "北京网点" } }
```

这一个请求，在后端经历了 **5 站**。

---

# 二、完整链路图

```text
浏览器                                                          数据库
  │  GET /organization/getById?id=123                                 │
  ▼                                                              ▼
┌─────────┐   ┌──────────────┐   ┌──────────┐   ┌─────────┐   ┌──────┐
│ 1.网关   │──▶│2.Controller  │──▶│3.Service │──▶│4.Mapper │──▶│5.MySQL│
│ 路由转发 │   │  接收请求     │   │ 业务逻辑  │   │ 数据访问 │   │ 存数据│
└─────────┘   └──────────────┘   └──────────┘   └─────────┘   └──────┘
                     ▲                                            │
                     └────────── 数据原路返回 ────────────────────┘
```

类比："门卫（Controller）→ 工人（Service）→ 仓库管理员（Mapper）→ 仓库（MySQL）"

---

# 三、第 1 站：网关（demo-openresty-gateway）

请求先到网关，网关看 URL 决定转发给哪个服务。`/organization/...` 转发给 `demo-basic`。

> 暂时不用深究，知道"有个交通警察按 URL 分流"即可。

---

# 四、第 2 站：Controller（门卫，只负责收发）

匿名化示例代码 `OrganizationController.java:38-41`：

```java
@RestController                          // ① 声明这是 REST 接口类
@RequestMapping("/organization")              // ② 负责 /organization 开头的请求
public class OrganizationController {

    @Autowired                           // ③ 自动注入 Service（不用 new）
    private OrganizationService organizationService;

    @GetMapping("/getById")              // ④ 处理 GET /organization/getById
    public R<OrganizationOut> getOrganization(@RequestParam("id") int id) {  // ⑤ 接收 id
        return R.ok(organizationService.getOrganization(id));  // ⑥ 调 Service，包装返回
    }
}
```

**逐行翻译（前端视角）：**

| 代码 | 含义 | 前端类比 |
|------|------|---------|
| `@RestController` | 声明接口处理类 | Express 的 router |
| `@RequestMapping("/organization")` | 管 /organization 开头的请求 | `app.use('/organization')` |
| `@GetMapping("/getById")` | 处理 GET /organization/getById | `router.get('/getById')` |
| `@RequestParam("id")` | 取 URL 的 ?id=123 | `req.query.id` |
| `organizationService.getOrganization(id)` | 把活交给 Service | 调 service 函数 |
| `R.ok(...)` | 包装成统一返回格式 | `data.json({code:0, data})` |

**职责：只负责"收发"，不写业务逻辑。** 像前端路由层，接请求、调函数、返结果。

---

# 五、第 3 站：Service（工人，真正干活）

匿名化示例代码 `OrganizationService.java:76-90`：

```java
public OrganizationOut getOrganization(Integer id) {
    // ① 参数校验：id 必须有意义（非空、大于0）
    if (!CommonFunctions.meaningfulInt.test(id)) {
        throw new BusinessException("网点id不能为空");
    }

    // ② 准备返回对象
    OrganizationOut organizationOut = new OrganizationOut();

    // ③ 调数据库层，按 id 查
    Organization organization = baseMapper.selectById(id);

    // ④ 查不到就报错
    if (Objects.isNull(organization)) {
        throw new BusinessException("不存在的网点,请检查");
    }

    // ⑤ 把数据库对象的字段拷贝到返回对象
    BeanUtils.copyProperties(organization, organizationOut);

    return organizationOut;
}
```

**职责：写业务逻辑。** 校验、判断、调数据库、组装数据都在这层，是后端最核心的一层。

## 5.1 关键设计：为什么有 Organization 又有 OrganizationOut？

```text
Organization    = 数据库表对应的对象（几十个字段，含内部字段）
OrganizationOut = 返回给前端的对象（只挑前端需要的字段）
```

`BeanUtils.copyProperties(organization, organizationOut)` 把数据库对象字段拷到返回对象。

**为什么不直接返回 Organization？** 数据库表可能有敏感字段（内部备注、删除标记），不该全暴露给前端。这是后端安全实践，前端没有这个概念。（详见 19 课）

---

# 六、第 4 站：Mapper（仓库管理员，访问数据库）

Service 里那行 `baseMapper.selectById(id)` 就是 Mapper 层：

```java
Organization organization = baseMapper.selectById(id);
```

框架（MyBatis-Plus）自动翻译成 SQL：

```sql
SELECT * FROM organization WHERE id = 123;
```

**职责：把方法调用翻译成 SQL，执行后把结果变回 Java 对象。** 不用手写 SQL，框架自动生成。

> `selectById` 是框架内置方法，藏在父类 `ServiceImpl` 里（见 `OrganizationService` 第 62 行 `extends ServiceImpl<OrganizationMapper, Organization>`）。详见 15 课。

---

# 七、第 5 站：MySQL（数据真正存的地方）

```sql
SELECT * FROM organization WHERE id = 123;
```

数据库返回一行数据，框架自动装进 `Organization` 对象，原路返回。

---

# 八、返回链路（原路返回）

```text
MySQL 返回一行数据
  → Mapper 装进 Organization 对象
    → Service 拷贝成 OrganizationOut，做业务处理
      → Controller 用 R.ok() 包装
        → 网关转发回前端
          → 前端拿到 { code: 0, data: {...} }
```

**R.ok() 是后端的统一返回格式：**

```json
{
  "code": 0,        // 0=成功，非0=错误码
  "msg": "success",
  "data": { ... }   // 真正的数据
}
```

前端 `data.data.data` 取的就是这个 `data` 字段。（R 对象详见 20 课）

---

# 九、后端思维 vs 前端思维（核心收获）

| 维度 | 前端思维 | 后端思维 |
|------|---------|---------|
| 关注点 | 数据怎么**展示** | 数据从哪**来**、怎么**存**、对不对 |
| 分层 | 组件/页面 | Controller / Service / Mapper |
| 数据校验 | 提升体验（可绕过） | 安全底线（绝不可少） |
| 对象设计 | 一个 data 走天下 | In / Out / Entity 分开 |
| 错误处理 | try-catch 提示 | 抛异常 + 统一错误码 |

---

# 十、本课小结

- 一个请求经过 **5 站**：网关 → Controller → Service → Mapper → MySQL
- **三层分工**：门卫（Controller 收发）→ 工人（Service 业务）→ 仓管（Mapper 数据库）
- 后端用 **In/Out/Entity** 区分入参、出参、数据库对象，不像前端一个对象走天下
- 统一返回格式 `R = { code, msg, data }`
- 下一课：Java 类与对象（面向对象核心，理解 Controller/Service 为什么是"类"）

# 十一、总结

- **前端发起的请求**：这一个请求，在后端经历了 5 站。
- **完整链路图**：类比："门卫（Controller）→ 工人（Service）→ 仓库管理员（Mapper）→ 仓库（MySQL）"
- **第 1 站：网关（demo-openresty-gateway）**：请求先到网关，网关看 URL 决定转发给哪个服务。
- **第 2 站：Controller（门卫，只负责收发）**：职责：只负责"收发"，不写业务逻辑。
- **第 3 站：Service（工人，真正干活）**：校验、判断、调数据库、组装数据都在这层，是后端最核心的一层。
- **第 4 站：Mapper（仓库管理员，访问数据库）**：Service 里那行 baseMapper.selectById(id) 就是 Mapper 层：

## 参考资料

- [Dev.java 学习路径](https://dev.java/learn/)
- [Spring Boot 文档](https://docs.spring.io/spring-boot/)
