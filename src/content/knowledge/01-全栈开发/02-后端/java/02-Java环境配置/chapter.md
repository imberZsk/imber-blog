# Java（1）- Java 环境配置

> 你的环境已经齐全（JDK 8 + Maven），本篇记录现状和原理，不用重装任何东西。

# 一、你机器的示例环境（2026/06/09 实测）

| 项目 | 现状 | 状态 |
|------|------|------|
| JDK 版本 | JDK 8（1.8.0_492，Zulu 发行版） | ✅ 与 demo 后端一致 |
| 编译器 javac | 1.8.0_492 | ✅ 能编译 |
| JAVA_HOME | `~/.sdkman/candidates/java/current` | ✅ 已配置 |
| Maven | 3.9.9 | ✅ demo 用它构建 |
| 版本管理工具 | SDKMAN | ✅ 类似前端的 nvm |

**结论：环境完整，正好匹配 demo 后端，可以直接开发。**

---

# 二、几个核心概念（前端视角理解）

## 2.1 JDK 是什么？

JDK（Java Development Kit）= Java 开发工具包，类比前端：

| 前端 | Java | 作用 |
|------|------|------|
| Node.js 运行时 | JRE（运行环境） | 跑代码 |
| Node.js + npm + 工具 | JDK（= JRE + 编译器等） | 开发 + 跑代码 |
| `node app.js` | `java App` | 运行程序 |
| —（JS 不用编译） | `javac App.java` | 先编译成字节码 |

关键区别：**JS 是解释执行，直接跑源码；Java 要先用 `javac` 编译成 `.class` 字节码，再用 `java` 运行。**

## 2.2 为什么是 JDK 8 而不是更新的版本？

- demo 后端（Spring Boot 2.x）就是基于 JDK 8 开发的
- 学习时保持和生产环境一致，避免版本差异带来的坑
- JDK 8 仍是企业里最主流的版本之一

## 2.3 SDKMAN 是什么？（类比 nvm）

| 前端 | Java | 作用 |
|------|------|------|
| nvm | SDKMAN | 管理多个版本的运行时 |
| `nvm use 18` | `sdk use java 8.0.492-zulu` | 切换版本 |
| nvm 装在 `~/.nvm` | SDKMAN 装在 `~/.sdkman` | 工具自己的目录 |

你的 JDK 和 Maven 都是 SDKMAN 装的，所以都在 `~/.sdkman/candidates/` 下面。

## 2.4 Maven 是什么？（类比 npm）

| 前端 | Java | 作用 |
|------|------|------|
| npm / yarn | Maven | 包管理 + 构建工具 |
| package.json | pom.xml | 声明依赖、项目配置 |
| node_modules | `~/.m2/repository` | 下载的依赖存放处 |
| `npm install` | `mvn install` | 装依赖 |
| `npm run build` | `mvn package` | 打包 |

demo 每个 Java 项目根目录都有 `pom.xml`，就是它的"package.json"。

---

# 三、常用命令速查

```bash
# 查看版本
java -version          # JDK 运行时版本
javac -version         # 编译器版本
mvn -version           # Maven 版本

# SDKMAN 管理版本
sdk list java          # 列出所有可装的 JDK
sdk current java       # 当前用的 JDK
sdk use java 8.0.492-zulu   # 临时切换（当前终端）
sdk default java 8.0.492-zulu  # 设为默认

# 编译运行（手动方式，理解原理用）
javac HelloWorld.java  # 编译 → 生成 HelloWorld.class
java HelloWorld        # 运行（注意不加 .class 后缀）
```

---

# 四、一个小疑问的解答

实测时 `/usr/libexec/java_home -V` 报错"找不到 Java Runtime"，**这是正常的，不影响使用**。

原因：那是 macOS 系统自带的 JDK 查找工具，只认装在系统标准目录（`/Library/Java/...`）的 JDK。你的 JDK 装在 SDKMAN 自己的目录里，系统工具看不到它，但 `java`/`javac`/`mvn` 都正常 —— 因为它们走的是 `JAVA_HOME` 和 `PATH`，不依赖那个系统工具。

类比：就像 nvm 装的 Node，系统的"应用程序"列表里也找不到，但终端里 `node` 照样能用。

---

# 五、本课小结

- ✅ 你的环境：JDK 8 + Maven 3.9.9，用 SDKMAN 管理，匹配 demo 后端
- 记住三组类比：**JDK≈Node、SDKMAN≈nvm、Maven≈npm**
- 核心差异：**Java 要先编译（javac）再运行（java），JS 不用**
- 下一课：跑通你的第一个 Java 程序，理解"编译→运行"两步走

# 六、总结

- **几个核心概念（前端视角理解）**：JDK（Java Development Kit）= Java 开发工具包，类比前端：
- **你机器的示例环境（2026/06/09 实测）**：结论：环境完整，正好匹配 demo 后端，可以直接开发。
- **一个小疑问的解答**：实测时 /usr/libexec/javahome -V 报错"找不到 Java Runtime"，这是正常的，不影响使用。
- **本课小结**：✅ 你的环境：JDK 8 + Maven 3.9.9，用 SDKMAN 管理，匹配 demo 后端

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“Java（1）- Java 环境配置”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
