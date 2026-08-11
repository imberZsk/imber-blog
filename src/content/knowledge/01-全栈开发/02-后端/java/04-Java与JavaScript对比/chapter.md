# Java（3）- Java 与 JavaScript 对比

> 读完你能：围绕“Java 与 JavaScript 对比”理解“核心思路”与“变量和类型”，并结合正文示例完成实践与排障。

> 用前端知识快速建立 Java 语法全貌，遇到概念回来翻这张对照表。

# 一、核心思路

**Java = 强类型的 JS + 面向对象强制 + 编译时检查**

你已经会 TS，那你已经理解"类型"的概念。Java 就是把类型检查做到极致，而且**不允许绕过**。

---

# 二、变量和类型

## 2.1 变量声明

| JavaScript | TypeScript | Java |
|-----------|-----------|------|
| `let name = "Tom"` | `let name: string = "Tom"` | `String name = "Tom";` |
| `const age = 18` | `const age: number = 18` | `final int age = 18;` |

**关键差异：**
- Java 类型在**前面**：`类型 变量名 = 值;`（TS 是 `变量名: 类型`）
- `final` ≈ `const`（不可变）
- **必须加分号 `;`**

## 2.2 基本类型

| JS/TS | Java | 说明 |
|-------|------|------|
| `number` | `int` | 整数 |
| `number` | `long` | 长整数 |
| `number` | `double` | 小数（双精度） |
| `boolean` | `boolean` | 布尔值 |
| `string` | `String` | 字符串（**首字母大写**） |
| `char` | `char` | 单字符（`'a'` 单引号） |

**例子：**

```typescript
// TypeScript
let count: number = 10;
let name: string = "Tom";
let isActive: boolean = true;
```

```java
// Java
int count = 10;
String name = "Tom";
boolean isActive = true;
```

---

# 三、函数 vs 方法

## 3.1 声明格式

| TypeScript | Java |
|-----------|------|
| `function add(a: number, b: number): number` | `int add(int a, int b)` |

**Java 格式：**
```java
返回类型 方法名(参数类型 参数名, ...) {
    return 返回值;
}
```

## 3.2 完整例子

```typescript
// TypeScript
function greet(name: string): string {
    return "Hello, " + name;
}
```

```java
// Java
String greet(String name) {
    return "Hello, " + name;
}
```

**无返回值：**

```typescript
function log(msg: string): void { ... }
```

```java
void log(String msg) { ... }
```

## 3.3 main 方法拆解（程序入口）

```java
public static void main(String[] args) {
//  ↑      ↑     ↑    ↑      ↑
// 公开  静态  无返回值 方法名 参数
```

| 关键字 | 含义 | 前端类比 |
|--------|------|---------|
| `public` | 公开的 | `export` |
| `static` | 静态的（属于类，不用 new） | `Math.random()` |
| `void` | 无返回值 | 函数不 return |
| `String[]` | 字符串数组 | `string[]` |
| `args` | 参数名（可改） | `process.argv` |

**注意：**
- `String[] args` **不能省略**，否则 JVM 找不到 main 方法
- 参数名可以改，但约定用 `args`

---

# 四、数组和集合

## 4.1 数组（长度固定）

| JavaScript | Java |
|-----------|------|
| `let arr = [1, 2, 3]` | `int[] arr = {1, 2, 3};` |
| `arr.length` | `arr.length` |
| `arr[0]` | `arr[0]` |
| `arr.push(4)` | ❌ 数组长度固定 |

## 4.2 List（动态数组）

```typescript
// TypeScript
let list: number[] = [];
list.push(1);
console.log(list[0]);
```

```java
// Java
List<Integer> list = new ArrayList<>();
list.add(1);                   // push → add
System.out.println(list.get(0));  // [0] → get(0)
```

**对照：**

| JS | Java |
|------|------|
| `arr.push(x)` | `list.add(x)` |
| `arr[i]` | `list.get(i)` |
| `arr.length` | `list.size()` |

## 4.3 Map（对象/字典）

```typescript
// TypeScript
let map: { [key: string]: number } = {};
map["age"] = 18;
console.log(map["age"]);
```

```java
// Java
Map<String, Integer> map = new HashMap<>();
map.put("age", 18);
System.out.println(map.get("age"));
```

| JS | Java |
|------|------|
| `obj[key] = value` | `map.put(key, value)` |
| `obj[key]` | `map.get(key)` |
| `delete obj[key]` | `map.remove(key)` |

---

# 五、类和对象

## 5.1 类定义

```typescript
// TypeScript
class User {
    name: string;
    age: number;

    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
    }

    greet(): string {
        return `Hello, ${this.name}`;
    }
}
```

```java
// Java
public class User {
    private String name;
    private int age;

    // 构造方法（方法名 = 类名，没有 constructor 关键字）
    public User(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public String greet() {
        return "Hello, " + this.name;
    }
}
```

**关键差异：**
1. 没有 `constructor` 关键字，**构造方法名 = 类名**
2. 成员变量要加访问修饰符（`private`/`public`）

## 5.2 访问修饰符

| 修饰符 | 含义 | 前端类比 |
|--------|------|---------|
| `public` | 任何地方可访问 | `export` |
| `private` | 只能类内部访问 | `#privateField` |
| `protected` | 子类可访问 | `protected` |
| 不写 | 包内可访问 | —（前端无） |

---

# 六、控制流（和 JS 基本一样）

## 6.1 条件

```java
// if-else（完全一样）
if (age >= 18) {
    System.out.println("成年");
} else {
    System.out.println("未成年");
}

// 三元运算符（完全一样）
String result = age >= 18 ? "成年" : "未成年";
```

## 6.2 循环

```java
// for（完全一样）
for (int i = 0; i < 10; i++) {
    System.out.println(i);
}

// 增强 for（类比 for-of，但用冒号）
for (String item : list) {
    System.out.println(item);
}
```

| JS | Java |
|------|------|
| `for (let item of list)` | `for (String item : list)` |

---

# 七、模块和包

## 7.1 导入导出

| JavaScript | Java |
|-----------|------|
| `export class User { ... }` | `public class User { ... }` |
| `import { User } from './user'` | `import com.imber.model.User;` |

## 7.2 包（package）

```java
// User.java
package com.imber.model;  // 声明包（类似目录）

public class User {
    // ...
}
```

```java
// Main.java
package com.imber;

import com.imber.model.User;  // 导入其他包的类

public class Main {
    public static void main(String[] args) {
        User user = new User("Tom", 18);
    }
}
```

**记住：**
- `package` 必须和目录一一对应
- `import` 用**点号**，不是路径（`com.imber.model.User`）

---

# 八、null 和异常

## 8.1 null 检查

```java
String name = null;
if (name != null) {  // 注意是 != 不是 !==
    System.out.println(name.length());
}
```

**Java 只有 `==` 和 `!=`**（类型编译时确定，不需要 `===`）

## 8.2 异常处理

```typescript
// TypeScript
try {
    // ...
} catch (error) {
    console.error(error);
}
```

```java
// Java（要声明异常类型）
try {
    // ...
} catch (Exception e) {
    e.printStackTrace();
}
```

---

# 九、常见语法速查表

| 功能 | JavaScript/TypeScript | Java |
|------|---------------------|------|
| 变量 | `let x: number = 1` | `int x = 1;` |
| 常量 | `const x = 1` | `final int x = 1;` |
| 字符串拼接 | `` `Hello ${name}` `` | `"Hello " + name` |
| 数组 | `[1, 2, 3]` | `new int[]{1, 2, 3}` |
| 动态数组 | `arr.push(3)` | `list.add(3)` |
| 字典 | `{key: val}` | `map.put(key, val)` |
| 函数 | `function f(x: number)` | `int f(int x)` |
| 类构造器 | `constructor() {...}` | `ClassName() {...}` |
| 导入 | `import { X } from './x'` | `import com.pkg.X;` |
| 相等 | `===` | `==`（只有一种） |
| 循环 | `for (let x of arr)` | `for (Type x : arr)` |
| 输出 | `console.log(x)` | `System.out.println(x)` |

---

# 十、本课小结

**记住三个核心差异：**
1. **类型位置反了**：TS 是 `name: string`，Java 是 `String name`
2. **数组/对象操作变了**：`push/[i]` → `add/get(i)`，`obj[key]` → `map.put/get`
3. **构造方法没有 constructor**：方法名 = 类名

**和 JS 一样的部分：**
- if/for/while 控制流几乎完全一样
- 三元运算符、逻辑运算符一样
- 类的概念和 ES6 class 类似

下一课：直接看 demo-basic 匿名化示例代码，把这些语法对上号。

# 十一、总结

- **核心思路**：Java = 强类型的 JS + 面向对象强制 + 编译时检查
- **变量和类型**：Java 类型在前面：类型 变量名 = 值;（TS 是 变量名: 类型）
- **函数 vs 方法**：String[] args 不能省略，否则 JVM 找不到 main 方法
- **类和对象**：没有 constructor 关键字，构造方法名 = 类名
