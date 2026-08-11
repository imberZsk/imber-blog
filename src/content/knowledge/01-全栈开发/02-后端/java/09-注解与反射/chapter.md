# Java（8）- 注解与反射

> 注解（@xxx）是 Spring 的基础。你在 demo 代码里见过的 @RestController、@Autowired 全是注解。

# 一、注解是什么？

注解就是代码里的 `@xxx` 标记。你已经见过一堆了：

```java
@RestController              // 标记：这是个 REST 接口类
@RequestMapping("/organization")  // 标记：处理 /organization 请求
public class OrganizationController {

    @Autowired               // 标记：这个字段要框架注入
    private OrganizationService organizationService;

    @GetMapping("/getById")  // 标记：处理 GET 请求
    public R<OrganizationOut> getOrganization(@RequestParam("id") int id) { ... }
}
```

**注解的本质**：给代码"贴标签"，标签本身不干活，是**框架读取这些标签后决定怎么处理**。

---

# 二、用前端类比理解

注解很像前端的**装饰器（decorator）**，如果你用过 Angular 或 TS 装饰器：

```typescript
// Angular（概念几乎一样）
@Component({
    selector: 'app-user'
})
export class UserComponent { }

// Vue 装饰器写法
@Component
export default class MyComponent extends Vue { }
```

或者更通俗的类比：注解像**快递单上的标签**——"易碎"、"加急"、"冷藏"。包裹本身没变，但快递公司看到标签会用不同方式处理。

```
@RestController  → 框架看到：哦，这个类要当接口处理
@Autowired       → 框架看到：哦，这个字段我要塞个对象进去
@GetMapping      → 框架看到：哦，这个方法处理 GET 请求
```

---

# 三、demo 常见注解速查

## 3.1 Spring Web 注解（接口层）

| 注解 | 作用 | 前端类比 |
|------|------|---------|
| `@RestController` | 声明 REST 接口类 | Express router |
| `@RequestMapping("/x")` | 类/方法的路径前缀 | `app.use('/x')` |
| `@GetMapping("/y")` | 处理 GET 请求 | `router.get('/y')` |
| `@PostMapping("/y")` | 处理 POST 请求 | `router.post('/y')` |
| `@RequestParam` | 取 URL 参数 ?id=1 | `req.query.id` |
| `@RequestBody` | 取请求体 JSON | `req.body` |
| `@PathVariable` | 取路径参数 /user/{id} | `req.params.id` |

## 3.2 Spring 容器注解（管理对象）

| 注解 | 作用 |
|------|------|
| `@Service` | 标记这是个 Service，交给框架管理 |
| `@Component` | 通用组件标记 |
| `@Autowired` | 自动注入依赖 |
| `@Repository` | 标记数据访问层 |

## 3.3 其他常见

| 注解 | 作用 |
|------|------|
| `@Slf4j` | Lombok：自动生成日志对象 log |
| `@Data` | Lombok：自动生成 getter/setter |
| `@Transactional` | 数据库事务（要么全成功要么全回滚） |
| `@Valid` / `@Validated` | 参数校验 |

---

# 四、@RequestParam vs @RequestBody（前端联调必懂）

这两个直接关系到你前端怎么传参，重点讲：

## 4.1 @RequestParam —— 接收 URL 参数

```java
@GetMapping("/getById")
public R<OrganizationOut> getOrganization(@RequestParam("id") int id) { ... }
```

前端这样调：

```javascript
axios.get('/organization/getById?id=123')  // 参数在 URL 上
```

## 4.2 @RequestBody —— 接收 JSON 请求体

```java
@PostMapping("/listByGroup")
public R<List<OrganizationOut>> listByGroup(@RequestBody OrganizationIn organizationIn) { ... }
```

前端这样调：

```javascript
axios.post('/organization/listByGroup', {  // 参数在请求体
    groupId: 1,
    ids: [1, 2, 3]
})
```

**对照：**

| 注解 | 参数位置 | 适用 | 前端写法 |
|------|---------|------|---------|
| `@RequestParam` | URL ?xx=yy | 简单参数、GET | `get('/api?id=1')` |
| `@RequestBody` | 请求体 JSON | 复杂对象、POST | `post('/api', {...})` |

**联调踩坑**：如果后端用 `@RequestBody`，前端却把参数拼在 URL 上，后端收不到（反之亦然）。这是前后端联调最常见的问题之一。

---

# 五、Lombok 注解：少写样板代码

demo 大量用 Lombok 自动生成代码。最常见的 `@Data`：

```java
@Data   // ← 这一个注解，自动生成下面所有 getter/setter
public class OrganizationOut {
    private Integer id;
    private String name;
}

// 等价于手写：
// public Integer getId() { return id; }
// public void setId(Integer id) { this.id = id; }
// public String getName() { return name; }
// public void setName(String name) { this.name = name; }
// ... 还有 toString、equals 等
```

类比：就像 TS 不用手写一堆样板代码。`@Data` 帮你把 getter/setter 全生成了，所以 demo 的实体类看起来很干净，只有字段。

常见 Lombok 注解：

| 注解 | 作用 |
|------|------|
| `@Data` | getter + setter + toString + equals |
| `@Slf4j` | 生成日志对象 `log` |
| `@NoArgsConstructor` | 生成无参构造方法 |
| `@AllArgsConstructor` | 生成全参构造方法 |
| `@Builder` | 生成建造者模式 |

---

# 六、反射：注解能生效的底层原理（了解即可）

**反射**是 Java 的一种能力：程序运行时，能"反过来"检查和操作类的结构（有哪些字段、方法、注解）。

为什么需要它？因为注解只是"标签"，得有人在运行时**读取**这些标签才能生效。这个读取动作就靠反射：

```
框架启动时：
1. 反射扫描所有类
2. 发现 @RestController → 注册成接口
3. 发现 @Autowired → 找到对应对象塞进去
4. 发现 @GetMapping("/getById") → 建立 URL 到方法的映射
```

类比：注解是快递标签，反射是快递员的"识别标签并据此处理"的能力。

**你现在不用深究反射的写法**，只需理解：
> 注解（标签）+ 反射（读取标签的能力）= Spring 框架的魔法基础

平时开发几乎不用手写反射，框架都封装好了。

---

# 七、本课小结

- **注解 `@xxx`** = 给代码贴标签，本身不干活，框架读取后决定怎么处理
- 类比前端的**装饰器**，或快递单上的"易碎/加急"标签
- 必记：`@RestController`/`@GetMapping`/`@RequestParam`(URL参数)/`@RequestBody`(JSON体)
- `@Service`/`@Autowired` 让框架管理和注入对象
- **Lombok**（`@Data`/`@Slf4j`）自动生成样板代码，所以 demo 实体类很干净
- **反射** = 运行时读取标签的能力，是注解生效的底层原理（了解即可）
- 阶段二完成！下一阶段：Spring Boot 入门（第 9 课 IoC/DI）

# 八、总结

- **反射：注解能生效的底层原理（了解即可）**：反射是 Java 的一种能力：程序运行时，能"反过来"检查和操作类的结构（有哪些字段、方法、注解）。
- **注解是什么？**：注解就是代码里的 @xxx 标记。
- **用前端类比理解**：注解很像前端的装饰器（decorator），如果你用过 Angular 或 TS 装饰器：
- **@RequestParam vs @RequestBody（前端联调必懂）**：这两个直接关系到你前端怎么传参，重点讲：

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“Java（8）- 注解与反射”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
