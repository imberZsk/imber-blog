# 疑问记录

## Q1: 怎么执行一个 Java 文件？（已解决 2026/06/14）

Java 8 分两步：**先编译，再运行**。

```bash
# 第一步：编译，.java 源码 → .class 字节码
javac -encoding UTF-8 HelloWorld.java

# 第二步：运行，java 后面跟「类名」，不带 .java 后缀
java HelloWorld

# 一行搞定（日常推荐，&& 表示前一步成功才跑后一步）
javac -encoding UTF-8 HelloWorld.java && java HelloWorld
```

### 三个易错点

1. `java` 后面是「类名」不是文件名：✅ `java HelloWorld`　❌ `java HelloWorld.java`
2. 类名必须和文件名完全一致（含大小写）：`public class HelloWorld` → `HelloWorld.java`
3. 中文乱码就加 `-encoding UTF-8`

### 和前端对比

| | 前端 JS | Java |
|---|---|---|
| 运行 | `node app.js`（直接跑） | `javac` 编译 + `java` 运行（两步） |
| 中间产物 | 无 | `.class` 字节码 |
| 执行者 | V8 引擎 | JVM 虚拟机 |

> 为什么多一步：Java 是「编译型 + 虚拟机」语言，javac 把代码变成 JVM 能懂的字节码，再由 JVM 跨平台执行 —— 这就是「一次编译，到处运行」。
