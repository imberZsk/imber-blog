# Java（2）- 第一个 Java 程序

> 读完你能：围绕“第一个 Java 程序”理解“你的代码”与“编译运行实操（实测过程）”，并结合正文示例完成实践与排障。

> 用你自己写的 HelloWord 走通"编译 → 运行"全流程，理解 Java 和 JS 的本质区别。

# 一、你的代码

文件位置：`java-learn/com/imber/helloword/HelloWord.java`

```java
package com.imber.helloword;

/**
 * 入门示例：包名 com.imber.helloword 与目录 com/imber/helloword/ 一一对应
 */
public class HelloWord {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
```

---

# 二、编译运行实操（实测过程）

```bash
cd java-learn

# 步骤 1：编译 .java → .class（翻译成机器能懂的字节码）
javac com/imber/helloword/HelloWord.java
# 编译成功后，目录里多出 HelloWord.class

# 步骤 2：运行（注意用点号、不带 .class）
java com.imber.helloword.HelloWord
# 输出：Hello, World!
```

实测结果：
```
HelloWord.java（343B）  --javac-->  HelloWord.class（445B）  --java-->  Hello, World!
     源代码                            字节码                         运行输出
```

---

# 三、Java vs JS 最本质的区别：要先编译

```
前端（JavaScript）：
  app.js  ──node app.js──→  直接运行     ✅ 一步到位

后端（Java）：
  HelloWord.java ──javac──→ HelloWord.class ──java──→ 运行
       源码                   字节码                   执行
```

- **JS**：解释执行，直接跑源码
- **Java**：先编译（`javac`）成字节码 `.class`，再运行（`java`）
- 好处：编译时就能查出很多错误（类型不对、拼写错误等），不用等到运行才发现

---

# 四、三个关键细节（避坑）

## 4.1 细节 1：运行用"全限定类名"，不是文件路径

```bash
java com.imber.helloword.HelloWord    # ✅ 正确：点号 + 不带 .class
java com/imber/helloword/HelloWord.class  # ❌ 错误
```

因为 Java 运行的是**类**，不是文件。`com.imber.helloword` 是包名，`HelloWord` 是类名，合起来叫**全限定类名**。

## 4.2 细节 2：package 必须和目录一一对应

```
package com.imber.helloword;          ← 代码里声明的包
              ↓ 必须对应 ↓
com/imber/helloword/HelloWord.java    ← 文件所在目录
```

对不上就编译报错（Unresolved compilation problem）。这是 Java 硬规则，JS 没有这个约束。

**包名的作用**：类似前端的目录命名空间，避免不同库的类重名。demo 项目里你会看到 `com.example.platform.basic.xxx` 这样的包名。

## 4.3 细节 3：main 方法是程序入口

```java
public static void main(String[] args) { ... }
```

| 前端 | Java | 作用 |
|------|------|------|
| package.json 的 "main" 字段 | main 方法 | 程序从哪开始跑 |
| 文件从上到下执行 | 只执行 main 里的代码 | 入口固定 |

- 每个能独立运行的程序**必须有一个 main 方法**作为起点
- `public static void` 的含义后面学语法时细讲，现在记住：**它是程序的开关**
- `String[] args`：命令行参数，类比 Node 的 `process.argv`

---

# 五、System.out.println 是什么？

```java
System.out.println("Hello, World!");
```

类比前端：

| 前端 | Java |
|------|------|
| `console.log("...")` | `System.out.println("...")` |

- `System.out` = 标准输出（控制台）
- `println` = print line，打印后换行（`print` 则不换行）

---

# 六、本课小结

- ✅ 跑通了：`javac` 编译 → `java` 运行
- Java 比 JS 多一步：**先编译成 .class，再运行**
- 运行用**全限定类名**（点号、不带后缀）
- **package 必须和目录对应**，否则报错
- **main 方法**是程序入口，`System.out.println` ≈ `console.log`
- 下一课：Java 与 JavaScript 语法全面对比，用前端知识快速掌握 Java 语法

# 七、总结

- **Java vs JS 最本质的区别：要先编译**：Java：先编译（javac）成字节码 .class，再运行（java）
- **三个关键细节（避坑）**：因为 Java 运行的是类，不是文件。
- **你的代码**：文件位置：java-learn/com/imber/helloword/HelloWord.java
- **System.out.println 是什么？**：System.out = 标准输出（控制台）

## 参考资料

- [Dev.java 学习路径](https://dev.java/learn/)
- [Spring Boot 文档](https://docs.spring.io/spring-boot/)
