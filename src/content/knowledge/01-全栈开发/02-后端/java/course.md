# 全栈开发学习路线

> 读完你能：围绕“全栈开发学习路线”理解“学习方式”与“目录（tree）”，并结合正文示例完成实践与排障。

> 前端 → 全栈，主攻 Java，边学边看 demo 匿名化示例代码
> 开始日期：2026/06/09

## 学习方式

- 边讲边看匿名化示例代码（demo-projects）
- 每个概念配前端类比，降低上手成本
- 文档按需记录，学到该记的再写

## 目录（tree）

```
全栈开发总结/
├── README.md                        # 本文件：学习路线总览
│
├── # 阶段一：环境与基础概念
├── 02-Java环境配置.md               # JDK、IDEA、Maven
├── 03-第一个Java程序.md             # HelloWorld 详解
├── 04-Java与JavaScript对比.md       # 语法对照（前端视角）
├── 05-HTTP请求的完整生命周期.md     # 从浏览器到数据库
│
├── # 阶段二：Java 语法速成
├── 06-类与对象.md                   # 面向对象核心
├── 07-集合与泛型.md                 # List/Map（对比JS数组/对象）
├── 08-异常处理.md                   # try-catch
├── 09-注解与反射.md                 # Spring 的基础
│
├── # 阶段三：Spring Boot 入门
├── 10-Spring-Boot是什么.md          # IoC、DI、自动配置
├── 11-创建第一个项目.md             # 脚手架、项目结构
├── 12-MVC三层架构.md                # Controller/Service/Mapper
├── 13-RESTful-API设计.md            # URL、HTTP方法、状态码
├── 14-常用注解详解.md               # @RestController 等
│
├── # 阶段四：数据库操作
├── 15-MySQL基础.md                  # SQL CRUD、事务
├── 16-MyBatis入门.md                # XML映射、动态SQL
│
├── # 阶段五：demo 项目代码导读（重点）
├── 18-企业级后端项目总览.md            # 架构、服务清单
├── 19-基础服务项目结构.md          # biz/client/common/service
├── 20-读懂一个完整接口.md           # Controller→数据库全追踪
├── 21-公共组件设计.md         # 工具类、统一返回
│
├── # 阶段六：微服务架构
├── 22-微服务是什么.md               # 单体 vs 微服务
├── 23-Eureka注册发现.md             # 服务注册
├── 24-Feign远程调用.md              # client 模块的作用
├── 25-Apollo配置中心.md             # 动态配置
│
├── # 阶段七：中间件
├── 26-Redis缓存.md                  # 缓存策略
├── 27-Kafka消息队列.md              # 生产/消费
├── 28-Elasticsearch搜索.md          # 全文检索
├── 29-xxl-job定时任务.md            # 任务调度
│
├── # 阶段八：全栈实战
├── 30-前后端联调流程.md             # 环境、代理、Mock
├── 31-实战-开发一个接口.md          # 需求→表→接口→前端
├── 32-实战-加缓存.md                # Redis 实战
├── 33-全链路问题排查.md             # 日志追踪、调试
│
└── # 附录（appendices/，前端视角迁移工具书）
    ├── JS到Java速查表.md    # A3 JS/TS↔Java 双向对照，卡壳时翻
    ├── Java陷阱对照.md      # A1 前端转 Java 高频四类翻车
    └── 常用命令.md         # A2 java/javac/mvn ↔ node/npm 对照
```

## 进度追踪

| 阶段 | 内容 | 状态 |
|------|------|------|
| 一 | 环境与基础 | 🚀 进行中 |
| 二 | Java 语法 | ⏳ |
| 三 | Spring Boot | ⏳ |
| 四 | 数据库 | ⏳ |
| 五 | demo 代码导读 | ⏳ |
| 六 | 微服务 | ⏳ |
| 七 | 中间件 | ⏳ |
| 八 | 全栈实战 | ⏳ |

## 参考

- demo 项目：`~/projects/demo-services`
- 知识地图：`知识地图-前端.md`、`知识地图-后端.md`
- 核心概念：`系统核心概念说明.md`

<!-- knowledge-lab-merged -->

# 动手实践：Java Demo 示例集

这是 Java 学习的代码示例目录，配套 `../java小册/`，每个示例都有详细中文注释和「前端类比」，可独立编译运行。

## 目录结构

```
java-demo/
├── README.md                          # 本文件
├── 运行指南.md                        # 编译运行命令与常见问题
│
├── 01-basics/                         # 基础语法（对应小册 02、03）
│   ├── HelloWorld.java               # 入门第一课：程序结构、main、输出
│   ├── DataTypes.java                # 8 种基本类型、引用类型、类型转换
│   ├── ControlFlow.java              # if/switch、for/while、break/continue
│   ├── Operators.java                # 算术/比较/逻辑/位/三元运算符，拼接陷阱
│   ├── StringDemo.java               # 字符串常用方法、StringBuilder、格式化
│   └── ArrayDemo.java                # 数组声明遍历、Arrays 工具类、二维数组
│
├── 02-oop/                           # 面向对象（对应小册 05）
│   ├── ClassAndObject.java           # 类、对象、构造方法、this
│   ├── Inheritance.java              # extends、方法重写、向上/向下转型
│   ├── Encapsulation.java            # private 封装、getter/setter、static 静态成员
│   ├── Polymorphism.java             # 父类引用指向子类对象、运行时多态
│   └── InterfaceDemo.java            # 接口、抽象类、default 方法、面向接口编程
│
├── 03-collections/                   # 集合与泛型（对应小册 06）
│   ├── ListDemo.java                 # List 增删改查、遍历、Stream
│   ├── MapDemo.java                  # Map 键值对、遍历、词频统计、嵌套
│   ├── SetDemo.java                  # Set 去重、三种实现差异、集合运算
│   ├── GenericDemo.java              # 泛型类、泛型方法、类型安全
│   └── StreamDemo.java               # filter/map/collect/groupingBy（对照 demo 写法）
│
├── 04-exception/                     # 异常处理（对应小册 07）
│   ├── ExceptionDemo.java            # try-catch-finally、throw、异常传播
│   └── CustomException.java          # 自定义业务异常（对照 demo BusinessException）
│
└── 05-annotation/                    # 注解与反射（对应小册 08）
    └── AnnotationDemo.java           # 自定义注解 + 反射读取，模拟 Spring 原理
```

## 快速运行

```bash
# 进入某个 demo 所在目录，编译 + 运行
cd 01-basics
javac -encoding UTF-8 HelloWorld.java && java HelloWorld
```

> 当前环境是 Java 8，必须先 `javac` 编译再 `java` 运行，详见 `运行指南.md`。

## 学习路径

1. **基础语法**（01-basics）：变量、数据类型、运算符、流程控制、字符串、数组
2. **面向对象**（02-oop）：类与对象、继承、封装、多态、接口
3. **集合与泛型**（03-collections）：List、Map、Set、泛型、Stream
4. **异常处理**（04-exception）：try-catch、自定义业务异常
5. **注解与反射**（05-annotation）：理解 Spring 框架的基础原理

学完这 5 个阶段，就具备了读懂 demo 后端代码的 Java 语法基础，可以进入小册第 09 课「Spring Boot 是什么」。

## 与小册对应关系

| Demo 目录 | 对应小册章节 |
|----------|------------|
| 01-basics | 03-第一个Java程序、04-Java与JavaScript对比 |
| 02-oop | 06-类与对象 |
| 03-collections | 07-集合与泛型 |
| 04-exception | 08-异常处理 |
| 05-annotation | 09-注解与反射 |

## 验收状态

全部 19 个 demo 已用 Java 8 全量编译 + 运行验证通过（19/19）。

## 关于 Spring Boot

小册第 09 课起的 Spring Boot 部分需要 Maven 管理依赖、联网拉取依赖包，无法用单文件 `javac`/`java` 直接运行，因此不放在本目录。学到该阶段时，参考小册「11-创建第一个项目」用 IDEA + Maven 创建标准工程。
