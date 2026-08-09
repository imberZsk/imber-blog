# Java Demo 示例集

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
│   └── StreamDemo.java               # filter/map/collect/groupingBy（对照 cyt 写法）
│
├── 04-exception/                     # 异常处理（对应小册 07）
│   ├── ExceptionDemo.java            # try-catch-finally、throw、异常传播
│   └── CustomException.java          # 自定义业务异常（对照 cyt BusinessException）
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

学完这 5 个阶段，就具备了读懂 cyt 后端代码的 Java 语法基础，可以进入小册第 09 课「Spring Boot 是什么」。

## 与小册对应关系

| Demo 目录 | 对应小册章节 |
|----------|------------|
| 01-basics | 02-第一个Java程序、03-Java与JavaScript对比 |
| 02-oop | 05-类与对象 |
| 03-collections | 06-集合与泛型 |
| 04-exception | 07-异常处理 |
| 05-annotation | 08-注解与反射 |

## 验收状态

全部 19 个 demo 已用 Java 8 全量编译 + 运行验证通过（19/19）。

## 关于 Spring Boot

小册第 09 课起的 Spring Boot 部分需要 Maven 管理依赖、联网拉取依赖包，无法用单文件 `javac`/`java` 直接运行，因此不放在本目录。学到该阶段时，参考小册「10-创建第一个项目」用 IDEA + Maven 创建标准工程。
