# 第 09 课：Spring Boot 是什么

> 前八课我们学的都是 Java「语言」本身；从这一课起，我们进入 Java「生态」——而 Spring Boot 就是 Java 后端世界的事实标准框架，类比一下，它在 Java 里的地位约等于 Nest.js + Vite 之于 Node。

在第 04 课我们追踪过一个 HTTP 请求穿过「网关→Controller→Service→Mapper→MySQL」五站，在第 05 课你写下了 `@Autowired` 却被告知「先记住，第 9 课揭晓」。这一课就来还债：把 **IoC（控制反转）、DI（依赖注入）、Bean、容器、自动配置、starter** 这一整套 Spring Boot 的核心概念讲透。

---

## 一、先回答：没有 Spring Boot 之前有多痛

作为前端，你早就习惯了「框架帮你管生命周期」这件事。回忆一下 Vue：

```js
// 你从来不需要手动 new 一个组件实例
// 你只是写好 <MyComponent />，Vue 帮你：
//   1. 实例化组件
//   2. 注入 props
//   3. 挂载到 DOM
//   4. 在合适时机销毁
const app = createApp(App)
app.mount('#app')   // 把一切交给框架管理
```

你**没有**写过 `const c = new MyComponent(); c.init(); c.bindEvents(); ...`。组件的「创建、装配、销毁」全交给了 Vue 实例。

而在没有 Spring 的「裸 Java」里，你得自己干所有这些脏活：

```java
// 裸 Java 时代：每用一个对象都要自己 new，还要自己拼装依赖
OrganizationMapper mapper = new OrganizationMapper();          // 自己造 Mapper
DriverOrganizationService driverSvc = new DriverOrganizationService(); // 自己造依赖
OrganizationService service = new OrganizationService(mapper, driverSvc); // 手动塞进去
OrganizationController controller = new OrganizationController(service);  // 一层层往上拼
// 如果 DriverOrganizationService 自己又依赖 3 个对象呢？嵌套地狱。
```

每一层都要手动 `new`、手动把依赖塞进去。对象一多就是一张盘根错节的「依赖网」，改一处牵一片。Spring Boot 要解决的核心痛点就是这个。

---

## 二、IoC：控制反转——把「谁来 new」的权力交出去

**IoC（Inversion of Control，控制反转）** 是整套体系的灵魂。名字唬人，意思极朴素：

> **原来「对象的创建和装配」由你的代码控制，现在反转过去，交给框架控制。**

### 前端类比

| 维度 | 自己掌控（裸 Java） | 控制反转（Spring / Vue） |
|------|---------------------|--------------------------|
| 谁创建对象 | 你写 `new Xxx()` | 框架替你 new |
| 谁装配依赖 | 你手动一层层塞 | 框架自动塞进去 |
| 谁管销毁 | 你自己管 | 框架在合适时机销毁 |
| 前端对应 | 手写 `new MyComponent()` | `createApp(App).mount()` 后交给 Vue |

Vue 帮你管组件实例的「生老病死」，Spring 帮你管 Java 对象的「生老病死」。这就是控制反转——你交出了控制权，换来了不用操心。

### ASCII 图解：控制权的反转

```
【裸 Java：控制权在你手里】
  你的代码 ──new──> Mapper
          ──new──> Service ──手动塞──> Mapper
          ──new──> Controller ──手动塞──> Service
          （每个箭头都是你亲手写的）

【Spring IoC：控制权交给容器】
  ┌─────────────── Spring 容器（IoC Container）───────────────┐
  │   它来 new、它来装配、它来管理生命周期                       │
  │   Mapper ──自动注入──> Service ──自动注入──> Controller    │
  └────────────────────────────────────────────────────────┘
  你的代码：只需声明「我需要 Service」，剩下的别管
```

---

## 三、容器与 Bean：框架管理的对象池

### Bean 是什么

**Bean** 就是「由 Spring 容器创建并管理的对象」。普通对象你自己 `new`；Bean 是 Spring 替你 new 出来、放进「池子」里统一管理的对象。

### 容器是什么

**容器（Container / ApplicationContext）** 就是装所有 Bean 的那个「池子」。应用一启动，Spring 就扫描你的代码，把所有标了「我是 Bean」的类实例化好，放进容器。之后谁要用，从容器里取，不用自己造。

### 前端类比

| 前端概念 | Spring 概念 | 说明 |
|----------|-------------|------|
| Pinia / Vuex 的 store 实例 | Bean | 全局唯一、被框架托管的对象 |
| `app` 应用实例 / store 注册表 | 容器（ApplicationContext） | 持有并管理所有实例的中心 |
| `provide / inject` | DI 依赖注入 | 不用自己传，从上层注入下来 |
| 默认单例 store | 默认单例 Bean | 全应用共享同一个实例 |

> 默认情况下，一个 Bean 在整个容器里是**单例（singleton）**的——和 Pinia 里 `useUserStore()` 无论调多少次拿到的都是同一个 store 实例，是一个道理。

### 怎么把一个类变成 Bean？

靠注解（第 08 课讲过注解是「贴在代码上的标签」）。看 demo 匿名化示例代码 `OrganizationService`：

```java
// 文件：demo-basic/demo-basic-service/.../service/OrganizationService.java
@Slf4j                         // Lombok：自动生成日志对象 log（见第 08 课）
@Service("organizationService")     // 关键：告诉 Spring「我是一个 Bean，名字叫 organizationService」
public class OrganizationService extends ServiceImpl<OrganizationMapper, Organization> {
    // ...
}
```

那个 `@Service` 就是「登记成 Bean」的标签。常见的几种「登记标签」：

| 注解 | 贴在哪类 Bean 上 | 前端类比 |
|------|------------------|----------|
| `@Component` | 通用组件，最基础 | 一个被注册的通用模块 |
| `@Service` | 业务逻辑层（如 OrganizationService） | service 层模块 |
| `@Repository` / Mapper | 数据访问层 | 数据请求封装层 |
| `@RestController` | 接口层（见第 08 课） | 路由 controller |

> 它们本质都是 `@Component`，只是语义不同，方便人和框架区分这个 Bean 属于哪一层。

---

## 四、DI：依赖注入——揭晓 `@Autowired` 之谜

第 05 课的伏笔现在揭晓。**DI（Dependency Injection，依赖注入）** 是 IoC 的具体实现手段：

> 一个 Bean 需要用到另一个 Bean 时，**不用自己 `new`，只要「声明需要」，容器就自动把对应的 Bean 塞进来。**

看 demo 匿名化示例代码，`OrganizationService` 里那几个 `@Autowired`：

```java
@Service("organizationService")
public class OrganizationService extends ServiceImpl<OrganizationMapper, Organization> {

    // @Autowired：向容器说「我需要 DriverOrganizationService 这个 Bean，请注入给我」
    // 我没 new 它，容器从池子里取出现成的实例赋值给这个字段
    @Autowired
    private DriverOrganizationService driverOrganizationService;

    // 同理：注入一个远程调用客户端 Bean
    @Autowired
    private SideCarClient sideCarClient;

    // 注入远程权限服务（这是一个 Feign 客户端 Bean，本质也是容器管的对象）
    @Autowired
    private RemotePermissionService remotePermissionService;

    // ...业务方法里直接 driverOrganizationService.xxx() 用，从没出现过 new
}
```

注意：整个 `OrganizationService` 里**没有一行 `new DriverOrganizationService()`**。它只是「声明需要」，容器在创建 `OrganizationService` 这个 Bean 时，发现它要 `DriverOrganizationService`，就从池子里找出来塞进去。这就是 DI。

### 前端类比：DI ≈ Vue 的 provide/inject，但更彻底

```js
// Vue：祖先 provide，后代 inject，不用一层层传 props
// 祖先组件
provide('userService', userServiceInstance)
// 任意后代组件
const userService = inject('userService')   // 直接拿，不用自己 new
```

```java
// Spring：你只管 @Autowired「inject」，谁「provide」的容器帮你搞定
@Autowired
private UserService userService;   // 直接拿，不用自己 new
```

区别在于：Vue 的 inject 你还得有人手动 provide；Spring 里「provide」这步被 `@Service`/`@Component` 自动完成了——只要那个类是 Bean，它就自动进池子可被注入。

### ASCII 图解：一次注入的全过程

```
应用启动
   │
   ├─ Spring 扫描代码，发现 @Service 标记的类
   │     → new OrganizationService()、new DriverOrganizationService() ... 放进容器
   │
   ├─ 创建 OrganizationService 时发现它有 @Autowired DriverOrganizationService
   │     → 去容器里找 DriverOrganizationService 这个 Bean
   │     → 找到，塞进 OrganizationService 的字段  ✅ 注入完成
   │
   └─ 容器就绪，所有 Bean 装配完毕，应用开始接收请求
```

> **常见疑问：为什么提倡用 DI 而不是自己 new？** 因为容器统一管理后：① 默认单例，省内存；② 依赖关系由框架维护，改依赖不用改一堆 `new`；③ 测试时可以轻松「换成假的 Bean」（Mock），这对写单元测试至关重要（见第 08 课测试相关）。

---

## 五、起步依赖 starter：一句话装好一整套

回到前端。当你要做一个项目，你不会一个个手动装 `webpack`、`babel-loader`、`@babel/preset-env`、`css-loader`…… 而是装一个「全家桶」让它把配套依赖和默认配置一并带来。Spring Boot 的 **starter（起步依赖）** 就是这个全家桶。

### 看 demo 示例 pom.xml

```xml
<!-- 文件：demo-basic/demo-basic-biz/pom.xml -->

<!-- web 模块：一句话引入「做 Web 接口」所需的一整套 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>   <!-- 起步依赖 -->
    <exclusions>
        <!-- 排除默认的 Tomcat 容器，因为下面要换成 Undertow -->
        <exclusion>
            <artifactId>spring-boot-starter-tomcat</artifactId>
            <groupId>org.springframework.boot</groupId>
        </exclusion>
    </exclusions>
</dependency>

<!-- 换用 Undertow 作为内嵌 Web 容器（又一个 starter） -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-undertow</artifactId>
</dependency>

<!-- 测试全家桶：JUnit、Mockito、断言库一次性带齐 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

一个 `spring-boot-starter-web`，背后自动带来了 Spring MVC、JSON 序列化（Jackson）、内嵌 Web 服务器等一整套，你不用一个个声明版本号。

### 前端类比

| 前端 | Spring Boot | 说明 |
|------|-------------|------|
| `package.json` 的 dependencies | `pom.xml` 的 `<dependencies>`（见第 01 课 Maven≈npm） | 依赖清单 |
| 装一个 `vite` 带来一堆配套 | 装一个 `starter` 带来一整套 | 全家桶 |
| `create-vite` 脚手架的默认配置 | starter 自带的「自动配置」 | 开箱即用 |

> 命名规律：官方 starter 都叫 `spring-boot-starter-xxx`（如 `-web`、`-data-redis`、`-test`）。看到这个前缀，就知道它是个「起步全家桶」。

---

## 六、自动配置：约定优于配置

starter 带来依赖只是第一步，**自动配置（Auto Configuration）** 才是 Spring Boot 真正「省心」的地方。

> **自动配置 = Spring Boot 根据你引入了哪些 starter，自动猜出你想要什么，并替你配置好。**

比如你引入了 `spring-boot-starter-web`，Spring Boot 就自动：
- 启动一个内嵌 Web 服务器（默认 Tomcat，demo 这里换成了 Undertow）
- 配好 JSON 的序列化/反序列化
- 注册好处理请求的各种组件

你**一行配置都没写**，接口就能跑起来。这就是 Spring Boot 的口号「**约定优于配置（Convention over Configuration）**」——只要你按约定来，框架就用合理的默认值替你配置好。

### 前端类比

```js
// Vite 的「零配置」哲学：你不写 webpack.config.js 那一大坨
// Vite 约定 src/main.js 是入口、约定 .vue 文件怎么处理……
// 约定优于配置 = 不偏离约定时，配置文件可以几乎为空
```

Vite「零配置」能跑起来 ≈ Spring Boot「自动配置」能跑起来，是同一种设计哲学。

### 启动类：一切的开关

回到 demo 示例的启动类，它就是「打开自动配置开关」并启动容器的地方：

```java
// 文件：demo-basic/demo-basic-biz/.../DemoBasicAdminApplication.java
@EnableFeignClients(basePackages = {"com.example.platform"})  // 开启 Feign 远程调用扫描
@ComponentScan({"com.example.platform"})                       // 指定扫描哪些包来找 Bean
@SpringCloudApplication                                     // 综合注解，内含自动配置开关
@EnableScheduling           // 开启定时任务能力
@EnableTransactionManagement // 开启声明式事务（@Transactional 才能生效）
@EnableCaching              // 开启缓存能力
public class DemoBasicAdminApplication {

    // main 方法：整个应用的入口（见第 02 课 main 是 Java 程序起点）
    public static void main(String[] args) {
        // SpringApplication.run：启动 Spring 容器 → 扫描并创建所有 Bean
        //   → 完成依赖注入 → 启动内嵌 Web 服务器 → 开始接收请求
        // 这一行，等价于前端的 createApp(App).mount('#app')
        SpringApplication.run(DemoBasicAdminApplication.class, args);
    }
}
```

几个关键点：
- `@ComponentScan({"com.example.platform"})`：告诉容器「去 `com.example.platform` 这个包下面扫，凡是带 `@Service`/`@Component` 等标签的都登记成 Bean」。这就是为什么 `OrganizationService` 不用注册就能被注入——它在被扫描的包里。
- `@SpringCloudApplication`：一个「组合注解」，内部组合了开启自动配置等多个注解（标签上贴标签，第 08 课讲过元注解的概念）。
- `SpringApplication.run(...)`：按下启动键，IoC 容器从这一行开始建立。

### ASCII 图解：启动到就绪的全景

```
main() 执行 SpringApplication.run()
        │
        ▼
┌──────────────────────────────────────────────┐
│ 1. 读取 starter → 触发自动配置（约定的默认值）   │
│ 2. @ComponentScan 扫描 com.example.platform 包     │
│ 3. 把 @Service/@Component... 类 new 成 Bean     │
│ 4. 处理 @Autowired，完成依赖注入（DI）          │
│ 5. 启动内嵌 Undertow Web 服务器                 │
└──────────────────────────────────────────────┘
        │
        ▼
   容器就绪，监听端口，等待第 04 课讲的那个 HTTP 请求进来
```

---

## 七、概念总览：一张表串起来

| 概念 | 一句话定义 | 前端类比 | demo 示例例子 |
|------|------------|----------|--------------|
| IoC 控制反转 | 把「创建/装配对象」的控制权交给框架 | Vue 帮你管组件生命周期 | 整个 demo-basic 应用 |
| 容器 | 装并管理所有 Bean 的池子 | Pinia store 注册表 / app 实例 | `SpringApplication.run` 建立的容器 |
| Bean | 被容器创建和管理的对象 | 被托管的 store 实例（默认单例） | `@Service("organizationService")` 的 OrganizationService |
| DI 依赖注入 | 声明需要即自动塞入，不用自己 new | Vue `provide/inject` | `@Autowired DriverOrganizationService` |
| starter 起步依赖 | 一个全家桶带来配套依赖 | 装 `vite` 带来一堆配套 | `spring-boot-starter-web` |
| 自动配置 | 按引入的 starter 自动配置好 | Vite 零配置开箱即用 | 引 web starter 即自动起服务器 |
| 启动类 | 打开开关、启动容器的入口 | `createApp(App).mount()` | `DemoBasicAdminApplication` |

---

## 本课小结

- **IoC（控制反转）** 是核心思想：把「谁来 new、谁来装配对象」的控制权从你的代码反转给框架，类比 Vue 帮你管组件实例的生老病死。
- **容器** 是装所有 **Bean**（被框架管理的对象）的池子；用 `@Service`/`@Component`/`@RestController` 等标签把类登记成 Bean，Bean 默认是**单例**。
- **DI（依赖注入）** 是 IoC 的落地手段，也就是第 05 课 `@Autowired` 的真相：只「声明需要」，容器自动把对应 Bean 塞进来，全程不用 `new`——demo 的 `OrganizationService` 里三个 `@Autowired` 字段就是活例子。
- **starter（起步依赖）** 是全家桶，一个 `spring-boot-starter-web` 带来做 Web 接口的一整套依赖；**自动配置** 让你「约定优于配置」，几乎零配置就能跑起来。
- **启动类** 的 `SpringApplication.run(...)` 是一切的开关，等价于前端的 `createApp(App).mount('#app')`，它建立容器、扫描并创建 Bean、完成注入、启动 Web 服务器。

> **下一课预告**：第 10 课《Spring Boot 项目结构与分层》。我们会把第 04 课那条 Controller→Service→Mapper 的请求链路，对应到 demo 示例的多模块工程结构（你已经见过 demo-basic 拆成 biz/service/client/common 四个模块了），讲清每一层的职责、为什么要这样分层，以及前端工程师该如何快速读懂一个陌生的 Java 后端项目目录。
