# 全栈开发学习路线

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
├── 01-Java环境配置.md               # JDK、IDEA、Maven
├── 02-第一个Java程序.md             # HelloWorld 详解
├── 03-Java与JavaScript对比.md       # 语法对照（前端视角）
├── 04-HTTP请求的完整生命周期.md     # 从浏览器到数据库
│
├── # 阶段二：Java 语法速成
├── 05-类与对象.md                   # 面向对象核心
├── 06-集合与泛型.md                 # List/Map（对比JS数组/对象）
├── 07-异常处理.md                   # try-catch
├── 08-注解与反射.md                 # Spring 的基础
│
├── # 阶段三：Spring Boot 入门
├── 09-Spring-Boot是什么.md          # IoC、DI、自动配置
├── 10-创建第一个项目.md             # 脚手架、项目结构
├── 11-MVC三层架构.md                # Controller/Service/Mapper
├── 12-RESTful-API设计.md            # URL、HTTP方法、状态码
├── 13-常用注解详解.md               # @RestController 等
│
├── # 阶段四：数据库操作
├── 14-MySQL基础.md                  # SQL CRUD、事务
├── 15-MyBatis入门.md                # XML映射、动态SQL
│
├── # 阶段五：demo 项目代码导读（重点）
├── 17-企业级后端项目总览.md            # 架构、服务清单
├── 18-基础服务项目结构.md          # biz/client/common/service
├── 19-读懂一个完整接口.md           # Controller→数据库全追踪
├── 20-公共组件设计.md         # 工具类、统一返回
│
├── # 阶段六：微服务架构
├── 21-微服务是什么.md               # 单体 vs 微服务
├── 22-Eureka注册发现.md             # 服务注册
├── 23-Feign远程调用.md              # client 模块的作用
├── 24-Apollo配置中心.md             # 动态配置
│
├── # 阶段七：中间件
├── 25-Redis缓存.md                  # 缓存策略
├── 26-Kafka消息队列.md              # 生产/消费
├── 27-Elasticsearch搜索.md          # 全文检索
├── 28-xxl-job定时任务.md            # 任务调度
│
├── # 阶段八：全栈实战
├── 29-前后端联调流程.md             # 环境、代理、Mock
├── 30-实战-开发一个接口.md          # 需求→表→接口→前端
├── 31-实战-加缓存.md                # Redis 实战
├── 32-全链路问题排查.md             # 日志追踪、调试
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
