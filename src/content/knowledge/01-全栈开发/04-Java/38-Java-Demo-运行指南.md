# Java（38） - Java Demo 运行指南

## 怎么执行一个 Java 文件

当前环境是 **Java 8**，和前端 `node app.js` 一步到位不同，Java 8 需要**两步**：

```bash
# 第一步：编译 —— 把 .java 源码翻译成 .class 字节码
javac -encoding UTF-8 HelloWorld.java     # 生成 HelloWorld.class

# 第二步：运行 —— 用 JVM 执行 .class（写类名，不带 .java 后缀）
java HelloWorld
```

一行搞定（日常推荐，`&&` 表示编译成功才运行）：

```bash
javac -encoding UTF-8 HelloWorld.java && java HelloWorld
```

## 各 demo 运行命令

```bash
# === 01-basics 基础语法 ===
cd 01-basics
javac -encoding UTF-8 HelloWorld.java   && java HelloWorld
javac -encoding UTF-8 DataTypes.java    && java DataTypes
javac -encoding UTF-8 ControlFlow.java  && java ControlFlow
javac -encoding UTF-8 Operators.java    && java Operators
javac -encoding UTF-8 StringDemo.java   && java StringDemo
javac -encoding UTF-8 ArrayDemo.java    && java ArrayDemo

# === 02-oop 面向对象 ===
cd ../02-oop
javac -encoding UTF-8 ClassAndObject.java && java ClassAndObject
javac -encoding UTF-8 Inheritance.java    && java Inheritance
javac -encoding UTF-8 Encapsulation.java  && java Encapsulation
javac -encoding UTF-8 Polymorphism.java   && java Polymorphism
javac -encoding UTF-8 InterfaceDemo.java  && java InterfaceDemo

# === 03-collections 集合与泛型 ===
cd ../03-collections
javac -encoding UTF-8 ListDemo.java    && java ListDemo
javac -encoding UTF-8 MapDemo.java     && java MapDemo
javac -encoding UTF-8 SetDemo.java     && java SetDemo
javac -encoding UTF-8 GenericDemo.java && java GenericDemo
javac -encoding UTF-8 StreamDemo.java  && java StreamDemo

# === 04-exception 异常处理 ===
cd ../04-exception
javac -encoding UTF-8 ExceptionDemo.java   && java ExceptionDemo
javac -encoding UTF-8 CustomException.java && java CustomException

# === 05-annotation 注解与反射 ===
cd ../05-annotation
javac -encoding UTF-8 AnnotationDemo.java && java AnnotationDemo
```

## 一键全量验证

在 `java-demo/` 目录下，把下面这段贴进终端，会逐个编译运行所有 demo 并汇总通过/失败：

```bash
demos=(
  "01-basics/HelloWorld" "01-basics/DataTypes" "01-basics/ControlFlow"
  "01-basics/Operators" "01-basics/StringDemo" "01-basics/ArrayDemo"
  "02-oop/ClassAndObject" "02-oop/Inheritance" "02-oop/Encapsulation"
  "02-oop/Polymorphism" "02-oop/InterfaceDemo"
  "03-collections/ListDemo" "03-collections/MapDemo" "03-collections/SetDemo"
  "03-collections/GenericDemo" "03-collections/StreamDemo"
  "04-exception/ExceptionDemo" "04-exception/CustomException"
  "05-annotation/AnnotationDemo"
)
pass=0; fail=0
for d in "${demos[@]}"; do
  dir="${d%/*}"; cls="${d##*/}"
  if (cd "$dir" && javac -encoding UTF-8 "$cls.java" >/dev/null 2>&1 && java "$cls" >/dev/null 2>&1); then
    echo "✅ $d"; pass=$((pass+1))
  else
    echo "❌ $d"; fail=$((fail+1))
  fi
done
echo "通过 $pass 个，失败 $fail 个"
```

> 注意：上面用的是 bash/zsh 数组写法。zsh 默认不按空白拆分字符串，所以必须用数组 `()` 而不是空格分隔的字符串遍历。

## 三个最容易踩的坑

1. **`java` 后面跟类名，不是文件名**
   - ✅ `java HelloWorld`
   - ❌ `java HelloWorld.java`（报"找不到或无法加载主类"）

2. **类名必须和文件名一模一样**（大小写都要对）
   `public class HelloWorld` → 文件必须叫 `HelloWorld.java`

3. **中文乱码就加编码参数** `-encoding UTF-8`

## 常见问题

### Q: 编译报错"不兼容的类型: Xxx 无法转换为 Yyy"

`instanceof` 判断两个**没有继承关系的平行类**时，Java 编译器会在编译期直接拒绝（认为不可能成立）。
解决：先用共同父类引用承接，再 `instanceof`。例：
```java
Animal a = dog;                 // 用父类引用承接
a instanceof Cat;               // 编译通过，运行时返回 false
```

### Q: 运行报错"找不到或无法加载主类"

命令写成了 `java HelloWorld.java`，去掉 `.java` 后缀，只写类名。

### Q: 一个 .java 文件编译出好几个 .class？

正常现象。一个源文件里可以写多个类（如 `Inheritance.java` 里有 Animal/Dog/Cat），每个类编译成一个独立的 `.class`。运行时只需 `java` 带 `public` 主类名即可。

## Java 心智对比（前端视角）

| | 前端 JS | Java |
|---|---|---|
| 源码 | `app.js` | `HelloWorld.java` |
| 要不要先编译 | 不用，直接跑 | 要，先 `javac` |
| 中间产物 | 无 | `.class` 字节码 |
| 运行命令 | `node app.js` | `java HelloWorld` |
| 谁在执行 | V8 引擎 | JVM 虚拟机 |

> 为什么多一步？Java 是「编译型 + 虚拟机」语言：`javac` 把代码变成 JVM 看的字节码，再由 JVM 跨平台执行，这就是「一次编译，到处运行」。

## 下一步

1. **看懂输出**：运行每个示例，对照代码理解输出
2. **动手改**：改变量、改条件、改循环次数，看输出怎么变
3. **自己写**：参考示例实现计算器、学生管理系统等
4. **对照小册**：结合 `../java小册/` 的笔记深入

## 相关资源

- **小册索引**：`../java小册/学习路线和目录.md`
- **示例项目**：`~/projects/demo-services`（示例代码库）
- **IDE**：推荐 IntelliJ IDEA，支持断点调试，不用手敲编译命令

## 参考资料

- [Dev.java 学习路径](https://dev.java/learn/)
- [Spring Boot 文档](https://docs.spring.io/spring-boot/)
