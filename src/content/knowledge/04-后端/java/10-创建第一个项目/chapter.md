# 第 10 课：创建第一个项目 —— Spring Boot 项目结构详解

> 前 9 课你已经会写 Java 代码、用集合、抛异常、读注解了。但真正的后端项目不是一个 `Main.java` 跑天下，它有一套和前端工程化高度类似的"骨架"。这一课我们把 cyt-basic 这个真实项目拆开，看清 Maven 骨架、`pom.xml`、`application` 配置、启动类和目录约定，让你从"会写 Java"过渡到"会搭 Java 项目"。

---

## 一、先建立一个总览类比

你在前端创建一个项目，脑子里有一张固定的图：`package.json` 管依赖、`vite.config.ts` 管构建配置、`src/` 放源码、`main.ts` 是入口。Spring Boot 项目几乎是一一对应的，只是换了名字。

| 前端（你已会） | Spring Boot（要学的） | 作用 |
| --- | --- | --- |
| `package.json` | `pom.xml` | 声明依赖、项目元信息、构建配置 |
| `node_modules/` | `~/.m2/repository/`（本地仓库） | 下载下来的第三方依赖存放地 |
| `npm install`（先装依赖再开发） | 无需单独命令（任何构建命令首次运行时自动下载缺失依赖） | 拉取依赖到本地仓库 |
| `vite.config.ts` / `.env` | `application.yml` / `bootstrap.yml` | 运行时配置（端口、数据库、环境变量） |
| `src/main.ts`（入口） | `XxxApplication.java`（启动类） | 程序唯一入口，`main` 方法启动 |
| `src/` | `src/main/java/` | 源码根目录 |
| `public/` / 静态资源 | `src/main/resources/` | 配置文件、SQL、静态资源 |
| `import { x } from 'pkg'` | `import com.xxx.X;` | 引入依赖里的类 |

记住这张表，后面每一节都是在填它的细节。

一个**容易踩的差异**：前端 `node_modules/` 是**每个项目一份**（所以动辄几百 MB、可以随手删），而 Maven 的 `~/.m2/repository/` 是**整台机器共享一份**——所有 Java 项目下载的依赖都堆在这里，按 GAV 坐标存放、跨项目复用。所以你不会在某个 Java 项目里看到 `node_modules` 那样的依赖文件夹。

---

## 二、Maven 项目骨架：约定优于配置

Maven（见第 01 课，它 ≈ npm + 构建工具）有一套**雷打不动的目录约定**。你不需要像 webpack 那样手写 entry/output 路径，Maven 默认就知道源码在哪、测试在哪、资源在哪。

```
cyt-basic-service/                    # 一个 Maven 模块
├── pom.xml                           # 模块的"package.json"
└── src/
    ├── main/                         # 主代码（会打进最终的 jar）
    │   ├── java/                     # Java 源码根（≈ src/）
    │   │   └── com/huoyunren/cyt/basic/service/
    │   │       ├── service/          # 业务逻辑层
    │   │       ├── repository/       # 数据访问封装
    │   │       ├── mapper/           # MyBatis 接口（直连 SQL）
    │   │       ├── entity/           # 数据库实体（表结构映射）
    │   │       ├── dto/              # 数据传输对象
    │   │       ├── enums/            # 枚举
    │   │       └── config/           # 配置类
    │   └── resources/                # 资源根（≈ public/ + 配置）
    │       ├── mapper/               # MyBatis 的 XML（手写 SQL）
    │       └── *.json                # 各种配置数据文件
    └── test/                         # 测试代码（不会打进 jar）
        └── java/
```

> 真实路径来自 `/Users/imber/Desktop/work/cyt/cyt-projects/cyt-basic/cyt-basic-service`。这是 cyt-basic 项目里负责"基础数据服务"的模块。

**前端类比**：这就像 Next.js 的约定式路由——你把文件放进 `pages/` 它就自动成为路由，不用手动注册。Maven 把代码放进 `src/main/java` 它就自动编译，放进 `src/test/java` 就只在测试时跑。约定省掉了大量配置。

```
src/main/java   → 主源码，编译进产物
src/main/resources → 配置/静态资源，会被拷进产物的 classpath
src/test/java   → 测试源码，mvn test 时才编译运行，不进产物
```

---

## 三、多模块项目：Monorepo 的 Java 版

打开 cyt-basic 你会发现它不是单个模块，而是**一个父项目带四个子模块**，这正是前端 monorepo（pnpm workspace / lerna）的思路。

cyt-basic 的 `pom.xml`（父）里这样声明子模块：

```xml
<!-- 文件：cyt-basic/pom.xml -->
<artifactId>cyt-basic</artifactId>
<version>5.1.0-SNAPSHOT</version>
<!-- packaging=pom 表示这是个"聚合父项目"，本身不产出 jar，只管理子模块 -->
<packaging>pom</packaging>

<modules>
    <module>cyt-basic-common</module>   <!-- 公共常量/工具 -->
    <module>cyt-basic-service</module>  <!-- 业务逻辑实现 -->
    <module>cyt-basic-client</module>   <!-- 对外暴露的接口定义（给别的服务调用）-->
    <module>cyt-basic-biz</module>      <!-- 启动入口 + Controller -->
</modules>
```

| 前端 monorepo | cyt-basic 多模块 |
| --- | --- |
| 根 `package.json`（workspaces 字段） | 父 `pom.xml`（`<modules>` + `packaging=pom`） |
| `packages/utils`（公共包） | `cyt-basic-common`（公共常量/工具） |
| `packages/core`（核心逻辑） | `cyt-basic-service`（业务实现） |
| `packages/sdk`（给外部用的包） | `cyt-basic-client`（对外接口定义） |
| `apps/web`（可启动的应用） | `cyt-basic-biz`（带启动类的应用层） |

模块之间通过依赖串起来。比如 `cyt-basic-biz/pom.xml` 里声明它依赖 `service` 模块：

```xml
<!-- 文件：cyt-basic-biz/pom.xml -->
<dependencies>
    <dependency>
        <groupId>com.huoyunren.cyt</groupId>
        <artifactId>cyt-basic-service</artifactId>   <!-- biz 依赖 service -->
        <version>5.1.0-SNAPSHOT</version>
    </dependency>
    ...
</dependencies>
```

这和你在 `apps/web` 的 `package.json` 里写 `"@my/core": "workspace:*"` 是一个意思：让应用层用上核心包的能力。

**记住这条调用链**（和第 04 课的五站接力一致）：
```
请求 → cyt-basic-biz(Controller) → cyt-basic-service(Service/业务)
     → cyt-basic-service(Mapper) → MySQL
```
`biz` 是门面，`service` 是干活的，`common`/`client` 是被共享的零件。

---

## 四、pom.xml 逐段拆解（对照 package.json）

`pom.xml` 是 XML 格式（比 JSON 啰嗦，但结构清晰）。我们对照 `package.json` 来读。

### 4.1 项目坐标 = name + version

```xml
<!-- 一个依赖/模块的唯一身份 = groupId + artifactId + version -->
<groupId>com.huoyunren.cyt</groupId>      <!-- ≈ npm 的 scope，如 @huoyunren -->
<artifactId>cyt-basic</artifactId>         <!-- ≈ 包名 -->
<version>5.1.0-SNAPSHOT</version>          <!-- ≈ version；SNAPSHOT=开发版，类似 npm 的 -beta -->
```

前端用 `@scope/name@1.2.3` 唯一定位一个包，Maven 用 **groupId + artifactId + version**（简称 GAV）三段定位。`SNAPSHOT` 后缀表示"开发中、可能频繁变动"，每次构建都会去拉最新的，正式发布版则去掉它。

### 4.2 parent = 继承一份公共配置

```xml
<!-- 文件：cyt-basic/pom.xml -->
<parent>
    <groupId>com.huoyunren.cyt</groupId>
    <artifactId>cyt-parent</artifactId>     <!-- 公司级父 pom，统一管 Spring Boot 版本等 -->
    <version>5.1.0-SNAPSHOT</version>
</parent>
```

前端没有完全对应的概念，最接近的是 `tsconfig.json` 的 `"extends"`：继承一份基础配置，自己只写差异部分。`cyt-parent` 帮所有子项目统一规定了 Spring Boot 版本、编译插件、编码格式，避免每个项目各写一遍。

### 4.3 dependencies = dependencies

```xml
<!-- 文件：cyt-basic/pom.xml，根 <dependencies> -->
<dependencies>
    <dependency>
        <groupId>com.ctrip.framework.apollo</groupId>
        <artifactId>apollo-client</artifactId>   <!-- 注意：没写 version -->
    </dependency>
</dependencies>
```

这里 `apollo-client` **没有写版本号**——版本被 parent 或下面的 `dependencyManagement` 统一管了。这正是 Maven 比 `package.json` 强的地方。

### 4.4 dependencyManagement = 版本统一锁定

```xml
<!-- 文件：cyt-basic/pom.xml -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.huoyunren.cyt</groupId>
            <artifactId>cyt-common-core</artifactId>
            <version>5.1.0-SNAPSHOT</version>      <!-- 在这里集中声明版本 -->
        </dependency>
        ...
    </dependencies>
</dependencyManagement>
```

| 前端做法 | Maven 做法 |
| --- | --- |
| `package-lock.json` / `pnpm-lock.yaml` 锁版本 | `dependencyManagement` 集中声明版本 |
| `overrides` / `resolutions` 强制统一传递依赖版本 | `dependencyManagement` 同时起到统一传递依赖版本的作用 |

差别在于：lock 文件是工具**自动生成**的，而 `dependencyManagement` 是**人工维护**的"版本字典"。子模块用依赖时只写 GAV 的前两段，版本由这里统一拍板，杜绝了"同一个库在不同模块里版本打架"的问题。

### 4.5 build/plugins = scripts + devDependencies

```xml
<!-- 文件：cyt-basic/pom.xml -->
<build>
    <plugins>
        <plugin>
            <artifactId>maven-surefire-plugin</artifactId>  <!-- 跑单元测试，≈ "test" 脚本 -->
        </plugin>
        <plugin>
            <artifactId>jacoco-maven-plugin</artifactId>    <!-- 统计测试覆盖率 -->
        </plugin>
    </plugins>
</build>
```

前端的"能力"分两块：`scripts` 写命令、`devDependencies` 装工具。Maven 把两者合成了 `plugins`——每个插件既是工具又绑定到某个构建阶段（编译/测试/打包）。`mvn test` 会自动触发 surefire 插件跑测试，不需要你像 npm 那样手写 `"test": "jest"`。

常用 Maven 命令对照：

| 前端 | Maven | 作用 |
| --- | --- | --- |
| `npm install` | `mvn install` | 装依赖并把本项目装进本地仓库 |
| `npm run build` | `mvn package` | 打包产出 jar |
| `npm test` | `mvn test` | 跑测试 |
| `rm -rf dist` | `mvn clean` | 清理上次构建产物（target/ 目录） |
| `npm run build && ...` | `mvn clean package` | 命令可串联，按生命周期顺序执行 |

---

## 五、配置文件：bootstrap.yml / application.yml

前端用 `.env`、`.env.development`、`.env.production` 区分环境。Spring Boot 用 YAML 配置文件 + **profile（环境标签）**，思路完全一样。

### 5.1 YAML 语法（你大概率已经见过）

YAML 靠缩进表达层级，比 JSON 干净：

```yaml
spring:
  application:
    name: cyt-basic        # 等价 JSON: { "spring": { "application": { "name": "cyt-basic" } } }
```

### 5.2 看 cyt-basic 的真实 bootstrap.yml

```yaml
# 文件：cyt-basic-biz/src/main/resources/bootstrap.yml
spring:
  application:
    name: cyt-basic-${user.name}-local   # ${user.name} 是占位符，会被替换成系统用户名
  profiles:
    active: dev                          # 默认激活 dev 环境（≈ NODE_ENV=development）

app:
  id: cyt-basic

apollo:                                  # Apollo 是配置中心（远程配置），见下方说明
  bootstrap:
    enabled: true
    namespaces: biz,sys,datasource,...   # 要从远程拉取哪些配置命名空间
```

注意 `${user.name}` 这种**占位符**——和前端 `.env` 里 `VITE_API=${BASE}/api` 的变量替换一个道理。

### 5.3 多环境：`---` 分隔的多文档

YAML 用 `---` 在一个文件里写多段配置，每段绑定一个 profile：

```yaml
# 文件：cyt-basic-biz/src/main/resources/bootstrap.yml（节选）
---
spring:
  profiles: dev                          # 这一段只在 dev 环境生效
apollo:
  meta: http://apollo-api.dev.chinawayltd.com:8080   # dev 用开发环境配置中心

---
spring:
  profiles: k8sprod                      # 这一段只在生产环境生效
apollo:
  meta: http://apollo.merak.chinawayltd.com:8000     # 生产用生产配置中心
```

| 前端 | Spring Boot |
| --- | --- |
| `.env.development` / `.env.production` | `application-dev.yml` / `application-prod.yml`（或一个文件用 `---` 分段） |
| `NODE_ENV=production` 切换环境 | `spring.profiles.active=k8sprod` 切换 profile |
| `import.meta.env.VITE_X` 读变量 | `@Value("${apollo.meta}")` 或配置类读变量 |

### 5.4 bootstrap.yml vs application.yml

cyt-basic 这里只有 `bootstrap.yml`，因为它把大部分配置放到了**远程配置中心 Apollo**（类似一个集中管理所有服务配置的后台）。两个文件的分工：

```
bootstrap.yml   → 启动最早期加载，决定"去哪拉远程配置"（连 Apollo 的地址）
application.yml  → 应用级配置（端口、数据源等），如果用配置中心，很多项会从远程下发
```

**前端类比**：`bootstrap.yml` 像是 `.env` 里那条 `CONFIG_SERVER_URL=...`——先知道去哪取配置，再把真正的配置拉回来。对前端学习者，初期你只需记住：**本地能跑就行的配置写在 application.yml，连配置中心的引导信息写在 bootstrap.yml**。

---

## 六、启动类：程序的 main.ts

每个 Spring Boot 应用有且只有一个启动类，它就是 `src/main.ts`。看 cyt-basic 的真实启动类：

```java
// 文件：cyt-basic-biz/src/main/java/com/huoyunren/cyt/basic/biz/CytBasicAdminApplication.java
package com.huoyunren.cyt.basic.biz;

import org.springframework.boot.SpringApplication;
import org.springframework.cloud.client.SpringCloudApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.cache.annotation.EnableCaching;

// @EnableFeignClients：开启声明式 HTTP 客户端，扫描指定包下的 Feign 接口（跨服务调用用）
@EnableFeignClients(basePackages = {"com.huoyunren.cyt"})
// @ComponentScan：指定要扫描哪些包下的 Spring 组件（@Service/@Controller 等）
@ComponentScan({"com.huoyunren.cyt"})
// @SpringCloudApplication：组合注解，等价于 @SpringBootApplication + 微服务相关能力
@SpringCloudApplication
// @EnableScheduling：开启定时任务能力（@Scheduled 才生效）
@EnableScheduling
// @EnableTransactionManagement：开启声明式事务（@Transactional 才生效）
@EnableTransactionManagement
// @EnableCaching：开启缓存抽象（@Cacheable 才生效）
@EnableCaching
public class CytBasicAdminApplication {

    // main 方法：JVM 的唯一入口，等同 node 执行 main.ts 的第一行
    public static void main(String[] args) {
        // 这一行做了海量工作：创建 Spring 容器、扫描所有组件、
        // 启动内嵌 Tomcat、加载配置、连接数据库……相当于 createApp().mount()
        SpringApplication.run(CytBasicAdminApplication.class, args);
    }
}
```

### 6.1 拆解 @SpringBootApplication

前端 `createApp(App).use(router).use(store).mount('#app')` 这一串"开启各种能力"的写法，在 Java 里变成了**类上方堆叠的注解**（见第 08 课，注解 ≈ 装饰器 / 元信息标签）。

`@SpringCloudApplication` 内部其实包含了 `@SpringBootApplication`，而 `@SpringBootApplication` 又是三个注解的组合：

| 注解 | 作用 | 前端类比 |
| --- | --- | --- |
| `@SpringBootConfiguration` | 标记这是配置来源 | `vite.config.ts` 的角色 |
| `@EnableAutoConfiguration` | 根据依赖自动配置（看到 web 依赖就配 Tomcat） | 约定式自动装配，像零配置脚手架 |
| `@ComponentScan` | 扫描并注册组件到容器 | 自动 import 所有 `*.vue` 组件 |

### 6.2 那一串 @EnableXxx 是什么

它们是**功能开关**。Spring 默认很多能力是关着的，你想用就贴一个 `@EnableXxx`：

```
@EnableScheduling              → 之后用 @Scheduled 写定时任务才会被执行
@EnableTransactionManagement   → 之后用 @Transactional 标的方法才会有数据库事务
@EnableCaching                 → 之后用 @Cacheable 标的方法返回值才会被缓存
@EnableFeignClients            → 之后定义的 Feign 接口才能发起跨服务 HTTP 调用
```

类比 Vue：`app.use(router)` 之后才能用 `<router-view>`，`app.use(pinia)` 之后才能用 store。**先开开关，后用功能**，逻辑完全一致。

### 6.3 启动时发生了什么（ASCII 图）

```
java -jar cyt-basic-biz.jar
        │
        ▼
  main() → SpringApplication.run(...)
        │
        ├─ 1. 读 bootstrap.yml → 连 Apollo 配置中心，拉远程配置
        ├─ 2. @ComponentScan 扫描 com.huoyunren.cyt 下所有组件
        │       └─ 把 @Service/@Controller/@Component 实例化，放进"容器"
        ├─ 3. @Autowired 自动把依赖注入到各组件（见第 05 课）
        ├─ 4. 处理 @EnableXxx 开关，装配事务/缓存/定时/Feign
        ├─ 5. 启动内嵌 Tomcat，监听端口
        └─ 6. 应用就绪，开始接收 HTTP 请求
        ▼
   等价于前端：createApp().use(...).mount('#app') 完成挂载
```

---

## 七、目录约定：每一层放什么

cyt-basic-service 的真实目录展示了一套标准分层。这套约定不是 Maven 强制的，而是**团队/Spring 社区的共识**，类似前端约定 `components/`、`composables/`、`stores/`、`api/` 各放什么。

| 目录 | 职责 | 前端类比 |
| --- | --- | --- |
| `controller/` | 接收 HTTP 请求、参数校验、调 service | 路由处理 / API route handler |
| `service/` | 核心业务逻辑（最重的一层） | composables / 业务逻辑层 |
| `repository/` | 对数据访问的封装，给 service 调 | 数据访问封装 |
| `mapper/` | MyBatis 接口，直接对应 SQL | `api/` 里发请求的函数 |
| `entity/` | 数据库表结构映射对象 | TS interface（描述后端返回的数据形状） |
| `dto/` | 各层之间传输数据的对象 | 组件间传递的 props / 中间数据类型 |
| `enums/` | 枚举常量 | TS 的 `enum` / 常量对象 |
| `config/` | Java 配置类 | 各种 `*.config.ts` |

请求在这些目录间的流动（和第 04 课五站接力对应）：

```
HTTP 请求
   │
   ▼
controller/CompanyController     ← 收请求、校参数（在 cyt-basic-biz 模块）
   │
   ▼
service/CompanyService           ← 业务逻辑、组合数据（在 cyt-basic-service 模块）
   │
   ▼
mapper/CompanyMapper (+ XML SQL) ← 拼/执行 SQL
   │
   ▼
MySQL                            ← 真正的数据
```

> 真实印证：`CompanyController` 位于 `cyt-basic-biz/src/main/java/com/huoyunren/cyt/basic/biz/controller/CompanyController.java`，正是第 04 课用到的 `getById` 接口的所在地。而 service、mapper、entity 则分布在 `cyt-basic-service` 模块。这印证了上一节说的——`biz` 是门面层、`service` 是干活层。

**一个关键认知**：包名（package）就是目录路径。`com.huoyunren.cyt.basic.service.entity` 这个包，对应的就是 `src/main/java/com/huoyunren/cyt/basic/service/entity/` 这个文件夹。Java 强制两者一致，不像前端可以随意摆放再用相对路径 import。

---

## 八、动手把这张图连起来

如果让你从零理解一个陌生的 Spring Boot 项目，按这个顺序看就不会乱：

```
1. 找 packaging=pom 的那个 pom.xml   → 看 <modules> 知道有几个模块、怎么分工
2. 找带 main() 的 XxxApplication.java → 这是启动入口，看它上面的 @EnableXxx 知道开了什么能力
3. 看 bootstrap.yml / application.yml → 知道连了哪些外部资源（数据库、配置中心、端口）
4. 进 controller/ 目录                → 顺着请求往下追 service → mapper → SQL
```

这套方法对任何 Spring Boot 项目都通用，就像你拿到一个陌生前端项目会先看 `package.json` 的 scripts、再看 `main.ts` 挂了什么插件、最后从路由切入业务一样。

---

## 本课小结

- **整体类比**：`pom.xml` ≈ `package.json`，`application.yml` ≈ `.env`，`XxxApplication.java` ≈ `main.ts`，`src/main/java` ≈ `src/`。建立这张对照表是理解 Spring Boot 工程的钥匙。
- **Maven 约定优于配置**：源码固定在 `src/main/java`、资源在 `src/main/resources`、测试在 `src/test/java`，无需手动配置路径。
- **多模块 = Java 版 monorepo**：cyt-basic 父 pom 用 `packaging=pom` + `<modules>` 聚合 common/service/client/biz 四个子模块，`biz` 是带启动类的门面层，`service` 是业务实现层。
- **pom.xml 核心段落**：GAV 坐标定位包、`parent` 继承公共配置、`dependencyManagement` 集中锁版本（人工版 lock 文件）、`build/plugins` 合并了 scripts 与 devDependencies。
- **配置与多环境**：YAML 靠缩进表达层级，`---` 分段绑定 profile，`spring.profiles.active` 切换环境，对应前端的 `NODE_ENV` 与多份 `.env`。`bootstrap.yml` 负责引导（连配置中心），`application.yml` 放应用配置。
- **启动类靠注解开能力**：`@SpringBootApplication` = 配置 + 自动装配 + 组件扫描；一串 `@EnableXxx` 是功能开关，先开开关后用功能，等价于 Vue 的 `app.use(...)`。
- **目录分层约定**：controller→service→repository/mapper→entity 对应请求流动的各站；包名必须与目录路径严格一致。
- **真实代码出处**：本课全部取自 `cyt-basic` 项目——父 `pom.xml`、`cyt-basic-biz/CytBasicAdminApplication.java`、`bootstrap.yml`、`controller/CompanyController.java` 及 `cyt-basic-service` 的目录结构。

**下一课预告**：第 11 课我们正式动手写代码——从零创建一个 Controller，定义 REST 接口，让你的第一个 HTTP 接口真正跑起来并能用浏览器/Postman 访问。这一课搭好的骨架，下一课就要往里填血肉了。
