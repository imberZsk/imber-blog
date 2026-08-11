# A3 - 附录-JS到Java速查表

> 读完你能：围绕“A3 - 附录-JS到Java速查表”理解“怎么用本篇”与“变量与基本类型”，并结合正文示例完成实践与排障。

> 写代码时卡在「这个 JS 操作 Java 怎么写」？本篇就是给你随时翻的双向对照表。不讲原理（原理在各专题篇），只回答一个问题：**我会的 JS/TS 写法，等价的 Java 是什么，以及哪里会咬人。**

## 怎么用本篇

- **正向查**（JS → Java）：知道 JS 怎么写，想要 Java 等价写法 → 看每张表左列找右列。
- **反向查**（Java → JS）：读别人 Java 代码看不懂某个写法 → 用表格右列反查左列。
- 表格里凡是标了 ⚠️ 的，都是**长得像但行为不一样**的坑，看到必须停一下。
- 想深入某个点，跟着「详见第 X 篇」的索引去对应专题篇。

> 心智模型一句话：**Java ≈ 强制写类型的 TS + 一切皆对象 + 先编译再运行**。你已经会 TS，"类型"这关早就过了，真正的坑集中在「基本类型 vs 包装类型」「`==` 比的是引用」「String 不可变」这几个点上。详见第 03 篇。

---

## 一、变量与基本类型

### 1.1 变量声明

| JavaScript / TypeScript | Java |
|------|------|
| `let name = "Tom"` | `String name = "Tom";`（⚠️ 类型在前，末尾加 `;`） |
| `let name: string = "Tom"` | `String name = "Tom";`（TS 类型在后，Java 在前） |
| `const AGE = 18` | `final int AGE = 18;`（`final` ≈ `const`，不可重新赋值） |
| `let a, b;` | `int a, b;`（同类型可一行声明多个） |
| `let [a, b] = [1, 2]` | 无解构，得 `int a = 1, b = 2;`（⚠️ Java 没有解构赋值） |
| `let x = 1; x = "hi"` | ❌ 编译报错（⚠️ 类型定死不能换） |
| `var x = 1`（JS 老写法） | `var x = 1;`（⚠️ Java 10+ 的 `var` 是**类型推断**，不是弱类型，仍是 int） |

⚠️ **Java 的 `var` 不是 JS 的 `var`**：Java 的 `var` 只是让编译器推断类型（`var x = 1` 编译后就是 `int x`），推断出来后类型锁死，不能像 JS 那样再赋别的类型。只能用于局部变量。

### 1.2 基本类型对照

| JS/TS | Java | 说明 |
|------|------|------|
| `number` | `int` | 整数，32 位，约 ±21 亿 |
| `number` | `long` | 长整数，64 位，字面量要加 `L`：`10000000000L` |
| `number` | `double` | 小数（双精度），`3.14` 默认是 double |
| `number` | `float` | 单精度小数，字面量加 `f`：`3.14f`（少用） |
| `boolean` | `boolean` | ⚠️ 全小写，字面量 `true` / `false` |
| `string` | `String` | ⚠️ 首字母大写，是**对象**不是基本类型 |
| `string`（单字符） | `char` | 单字符，⚠️ 用**单引号** `'a'`，双引号是 String |
| `null` | `null` | 一致（但基本类型 int/double 不能为 null） |
| `undefined` | 无 | ⚠️ Java 没有 undefined，未初始化的对象是 null |

⚠️ **基本类型 vs 包装类型**（Java 独有，重点）：`int` 是基本类型（栈上存值），`Integer` 是它的**包装对象**。集合泛型里只能放对象，所以 `List<Integer>` 不能写 `List<int>`。详见 1.3 和第 06 篇。

| 基本类型 | 包装类型 | 什么时候用包装类型 |
|------|------|------|
| `int` | `Integer` | 放进 `List`/`Map` 泛型、需要为 null 时 |
| `long` | `Long` | 同上 |
| `double` | `Double` | 同上 |
| `boolean` | `Boolean` | 同上 |
| `char` | `Character` | 同上 |

### 1.3 类型转换

```javascript
// JavaScript
Number("42");      // 字符串转数字
String(42);        // 数字转字符串
parseInt("42px");  // 容错解析 → 42
```

```java
// Java：每种类型有自己的转换静态方法
int n = Integer.parseInt("42");      // 字符串转 int → 42
String s = String.valueOf(42);       // int 转字符串 → "42"（或直接 42 + ""）
double d = Double.parseDouble("3.14"); // 字符串转 double → 3.14
// ⚠️ Integer.parseInt("42px") 会抛 NumberFormatException，没有 JS parseInt 那种容错
```

⚠️ **自动装箱/拆箱**：`Integer x = 5;`（int 自动变 Integer）和 `int y = x;`（Integer 自动变 int）是编译器帮你做的，叫「装箱/拆箱」。但 `Integer x = null; int y = x;` 会 **NPE**（拆箱一个 null）。这是很隐蔽的坑。

---

## 二、字符串操作

| JavaScript | Java | 说明 |
|------|------|------|
| `` `Hi ${name}` `` | `"Hi " + name` 或 `String.format("Hi %s", name)` | ⚠️ Java 没有模板字符串，用 `+` 拼或 format |
| `str.length` | `str.length()` | ⚠️ 是**方法**要加括号，不是属性 |
| `str.toUpperCase()` | `str.toUpperCase()` | 一致 |
| `str.toLowerCase()` | `str.toLowerCase()` | 一致 |
| `str.trim()` | `str.trim()` | 一致（去首尾空白） |
| `str.includes("x")` | `str.contains("x")` | ⚠️ 方法名叫 contains |
| `str.indexOf("x")` | `str.indexOf("x")` | 一致，找不到返回 -1 |
| `str.split(",")` | `str.split(",")` | ⚠️ 参数是**正则**，`split(".")` 会全切光要写 `split("\\.")` |
| `arr.join(",")` | `String.join(",", list)` | ⚠️ 静态方法，分隔符在前 |
| `str.replace(a, b)` | `str.replace(a, b)` | ⚠️ Java 的 replace 替换**全部**（和 JS replaceAll 一样） |
| `str.startsWith("x")` | `str.startsWith("x")` | 一致 |
| `str.slice(1, 3)` | `str.substring(1, 3)` | ⚠️ 方法名叫 substring，含头不含尾 |
| `str[0]` | `str.charAt(0)` | ⚠️ 不能用下标，用 charAt |
| `str1 === str2` | `str1.equals(str2)` | ⚠️⚠️ **重灾区**：比内容必须用 `.equals()`，`==` 比的是引用！ |

```javascript
// JavaScript：模板字符串
const name = "Tom", age = 18;
const msg = `${name} is ${age}, next year ${age + 1}`;
```

```java
// Java：字符串拼接用 +，或用 String.format（%s 占位）
String name = "Tom";                                    // name 存名字
int age = 18;                                           // age 存年龄
String msg = name + " is " + age + ", next year " + (age + 1);  // msg 存拼好的字符串
// 或：String.format("%s is %d, next year %d", name, age, age + 1);
```

⚠️ **String 比较必须用 `.equals()`**（Java 头号坑，单开一节讲，见「陷阱对照」）：`==` 比的是「是不是同一个对象」，`"a" == "a"` 可能碰巧为 true（字符串常量池），但 `new String("a") == "a"` 就是 false。**记死规则：比字符串内容永远用 `.equals()`，绝不用 `==`。**

⚠️ **String 不可变**：`str.toUpperCase()` 不会改原字符串，而是**返回一个新字符串**。想拼接大量字符串用 `StringBuilder`，别在循环里 `+`（每次都新建对象，性能差）。

---

## 三、数组 / 集合

### 3.0 先分清：数组 vs List

⚠️ Java 里「数组」和「List」是**两个东西**（JS 只有一个 Array）：

| | Java 数组 | Java List（ArrayList） |
|------|------|------|
| 长度 | 固定，创建后不能改 | 动态，可增删 |
| 写法 | `int[] arr = {1, 2, 3};` | `List<Integer> list = new ArrayList<>();` |
| 取值 | `arr[0]` | `list.get(0)` |
| 长度 | `arr.length`（属性） | `list.size()`（方法） |
| 类比 JS | 定长的 Array | 你平时用的 Array |

**日常几乎都用 List**（≈ JS 的 Array），数组只在性能敏感或固定长度场景用。详见第 06 篇。

### 3.1 增删改查（List）

| JavaScript | Java（List） | 说明 |
|------|------|------|
| `arr.push(x)` | `list.add(x)` | 尾部追加 |
| `arr.pop()` | `list.remove(list.size() - 1)` | ⚠️ 没有直接 pop，按索引删末尾 |
| `arr.shift()` | `list.remove(0)` | 删头部 |
| `arr.unshift(x)` | `list.add(0, x)` | 头部插入 |
| `arr.length` | `list.size()` | ⚠️ List 用 size() 方法 |
| `arr[i]` | `list.get(i)` | ⚠️ 用 get，不能用下标 |
| `arr[i] = x` | `list.set(i, x)` | ⚠️ 用 set 改值 |
| `arr.includes(x)` | `list.contains(x)` | 判断包含 |
| `arr.indexOf(x)` | `list.indexOf(x)` | 找不到返回 -1，一致 |
| `arr.splice(i, 1)` | `list.remove(i)` | 按索引删 |
| `[...a, ...b]` | `list.addAll(b)` | ⚠️ 没有展开语法，用 addAll |
| `arr.reverse()` | `Collections.reverse(list)` | ⚠️ 用工具类，原地反转 |

### 3.2 遍历

```javascript
// JavaScript
for (const item of arr) { ... }
arr.forEach((item, i) => { ... });
```

```java
// Java：增强 for（≈ for-of），用冒号
for (String item : list) {   // ≈ for (const item of list)
    ...
}

// 需要索引时用传统 for
for (int i = 0; i < list.size(); i++) {  // i 存当前下标
    String item = list.get(i);           // item 存当前元素
    ...
}

// Java 8+ 也有 forEach（≈ JS forEach，Lambda ≈ 箭头函数）
list.forEach(item -> System.out.println(item));
```

| JS | Java |
|------|------|
| `for (const x of arr)` | `for (Type x : list)` |
| `arr.forEach(x => ...)` | `list.forEach(x -> ...)` |
| `for (const [i, x] of arr.entries())` | 传统 for + `list.get(i)` |
| `for (const k in obj)` | `for (String k : map.keySet())` |

⚠️ **增强 for 不能拿到索引**：JS 的 `forEach` 回调有第二个参数 `i`，Java 增强 for 没有。要索引就用传统 `for (int i...)`。

---

## 四、高阶函数：map / filter / reduce → Stream

这是前端最能无缝迁移的地方之一。Java 8 的 **Stream** 就是链式的 map/filter/reduce，写法和 JS 数组方法几乎一一对应，只是中间要 `.stream()` 开头、`.collect()` 收尾。详见第 06 篇。

```javascript
// JavaScript：链式方法
const doubled = nums.map(x => x * 2);
const evens = nums.filter(x => x % 2 === 0);
const result = nums.filter(x => x > 0).map(x => x * 2);
```

```java
// Java：.stream() 开头，.collect(Collectors.toList()) 收尾
import java.util.stream.Collectors;

// doubled 存每项翻倍后的新列表
List<Integer> doubled = nums.stream()
    .map(x -> x * 2)                    // ≈ JS 的 map
    .collect(Collectors.toList());      // ⚠️ 要收集成 List

// evens 存所有偶数
List<Integer> evens = nums.stream()
    .filter(x -> x % 2 == 0)            // ≈ JS 的 filter
    .collect(Collectors.toList());

// 过滤 + 映射链式（和 JS 一样能连起来）
List<Integer> result = nums.stream()
    .filter(x -> x > 0)
    .map(x -> x * 2)
    .collect(Collectors.toList());
```

| JS | Java Stream |
|------|------|
| `arr.map(x => x * 2)` | `stream().map(x -> x * 2).collect(toList())` |
| `arr.filter(x => x > 0)` | `stream().filter(x -> x > 0).collect(toList())` |
| `arr.reduce((a, b) => a + b, 0)` | `stream().reduce(0, (a, b) -> a + b)` 或 `stream().mapToInt(x -> x).sum()` |
| `arr.find(x => ...)` | `stream().filter(...).findFirst().orElse(null)` |
| `arr.some(x => ...)` | `stream().anyMatch(x -> ...)` |
| `arr.every(x => ...)` | `stream().allMatch(x -> ...)` |
| `arr.sort((a,b) => a-b)` | `stream().sorted().collect(toList())` |

⚠️ **Stream 用完就废**：一个 Stream 只能消费一次，`.collect()` 之后就不能再用了（不像 JS 数组能反复遍历）。想再遍历得重新 `.stream()`。

⚠️ **别忘了 `.collect()`**：JS 的 map/filter 直接返回数组，Java Stream 的中间操作是「懒」的，不 `.collect()`（或 `.forEach()`）就什么都不会发生。

---

## 五、对象 / 字典（Map）

⚠️ 先分清：Java 里 JS 的「对象」拆成了两个概念——**装数据的键值对用 `Map`**，**有固定字段的实体用 `class`**（见第九节）。JS 的 `{key: value}` 当字典用时对应 Java 的 Map。

| JavaScript | Java（Map） | 说明 |
|------|------|------|
| `const obj = {}` | `Map<String, Object> map = new HashMap<>();` | ⚠️ 要声明键值类型 |
| `obj.key` / `obj["key"]` | `map.get("key")` | ⚠️ 用 get，不能用点号也不能用下标 |
| `obj.key = v` | `map.put("key", v)` | ⚠️ 用 put，新增/覆盖 |
| `obj.key ?? "default"` | `map.getOrDefault("key", "default")` | 取默认值，更安全 |
| `delete obj.key` | `map.remove("key")` | 删除 |
| `"key" in obj` | `map.containsKey("key")` | 判断键存在 |
| `Object.keys(obj)` | `map.keySet()` | 所有键 |
| `Object.values(obj)` | `map.values()` | 所有值 |
| `Object.entries(obj)` | `map.entrySet()` | 键值对集合 |
| `{...a, ...b}` | `map.putAll(b)` | ⚠️ 没有展开语法，用 putAll |
| `obj?.a?.b` | 无直接等价 | ⚠️ 没有可选链，逐层判空或用 `Optional` |

```javascript
// JavaScript：安全取值
const port = config.port ?? 8080;
```

```java
// Java：map.getOrDefault(键, 默认值)，键不存在时返回默认值，不报错
int port = config.getOrDefault("port", 8080);   // port 存端口号，没配就用 8080
```

⚠️ **遍历 Map** 和 JS 不太一样：

```java
// 遍历键值对（最常用）
for (Map.Entry<String, Integer> entry : map.entrySet()) {
    String key = entry.getKey();      // key 存当前键
    Integer value = entry.getValue(); // value 存当前值
}

// 只遍历键
for (String key : map.keySet()) { ... }

// Java 8+ 的 forEach（≈ JS 写法，最简洁）
map.forEach((key, value) -> System.out.println(key + "=" + value));
```

---

## 六、substring / 截取（Java 没有切片）

⚠️ Java **没有 Python 那种 `arr[1:3]` 切片语法**，字符串用 `substring`，List 用 `subList`。

```javascript
// JavaScript
str.slice(1, 3);       // 字符串 索引 1~2
arr.slice(1, 3);       // 数组 索引 1~2
arr.slice(-2);         // 最后两个
```

```java
// Java：字符串和 List 各有方法，都是含头不含尾
str.substring(1, 3);            // 字符串索引 1~2
str.substring(2);               // 从索引 2 到末尾
list.subList(1, 3);             // List 索引 1~2（⚠️ 返回的是视图，改它会影响原 list）

// Java 没有负索引，"最后两个" 要自己算
list.subList(list.size() - 2, list.size());
```

| JS | Java |
|------|------|
| `str.slice(1, 3)` | `str.substring(1, 3)` |
| `str.slice(2)` | `str.substring(2)` |
| `arr.slice(1, 3)` | `list.subList(1, 3)` |
| `arr[arr.length - 1]` | `list.get(list.size() - 1)` |

⚠️ **没有负索引**：JS 的 `arr.slice(-2)`、`arr[arr.length-1]` 很常用，Java 全得用 `size() - n` 手动算，别习惯性写负数下标（会 `IndexOutOfBoundsException`）。

---

## 七、函数 / 方法

### 7.1 声明对照

```javascript
// JavaScript
function add(a, b = 0) { return a + b; }
const add = (a, b) => a + b;          // 箭头函数
function sum(...nums) { ... }          // 剩余参数
```

```java
// Java：方法必须写在类里，必须声明返回类型和参数类型
int add(int a, int b) {   // 返回类型 int 在最前，参数要带类型
    return a + b;
}

// Lambda ≈ 箭头函数（Java 8+），但要有个「函数式接口」类型来接
// 如 java.util.function.BiFunction
BiFunction<Integer, Integer, Integer> add = (a, b) -> a + b;

// 可变参数用 类型...（≈ JS 的 ...nums，收集成数组）
int sum(int... nums) {    // nums 是 int[]
    int total = 0;        // total 存累加和
    for (int n : nums) total += n;
    return total;
}
```

| JS | Java | 说明 |
|------|------|------|
| `function f(a, b)` | `返回类型 f(类型 a, 类型 b)` | ⚠️ 必须写返回类型和参数类型 |
| `(a, b) => a + b` | `(a, b) -> a + b` | Lambda，⚠️ 箭头是 `->` 不是 `=>` |
| `function f(...args)` | `f(类型... args)` | 可变参数，收集成数组 |
| `f(...arr)` | 无直接等价 | ⚠️ 没有展开传参，数组直接当可变参数传 |

⚠️ **Java 没有默认参数**：`function add(a, b = 0)` 在 Java 里做不到，得用**方法重载**（写多个同名方法，参数不同）来模拟：

```java
// 方法重载：同名方法，参数列表不同，编译器按调用时的参数选
int add(int a, int b) { return a + b; }   // 两个参数版本
int add(int a) { return add(a, 0); }       // 一个参数版本，内部调上面的（模拟默认值 b=0）
```

### 7.2 方法重载（Java 特有，≈ TS 函数重载但真存在多个实现）

```java
// 同一个方法名，靠「参数类型/个数不同」区分，编译期决定调哪个
void print(int x) { ... }        // 打印整数
void print(String x) { ... }     // 打印字符串
void print(int x, int y) { ... } // 打印两个整数
```

⚠️ 重载只看**参数**，不看返回类型。两个方法只有返回类型不同、参数一样，编译报错。

---

## 八、同名不同义的关键字 / 运算符（⚠️ 重灾区）

| JS | Java | ⚠️ 区别 |
|------|------|------|
| `===` | `==` | ⚠️ Java 的 `==` 对**对象比引用**、对基本类型比值；没有 `===` |
| `==`（带隐式转换） | 无 | Java `==` 不做隐式转换，且比对象引用 |
| 值内容相等（对象） | `.equals()` | ⚠️⚠️ 比 String/对象内容**必须**用 `.equals()`，不是 `==` |
| `!` | `!` | 一致 |
| `&&` | `&&` | 一致 |
| `\|\|` | `\|\|` | 一致 |
| `a ? b : c` | `a ? b : c` | ⚠️ 三元一致！（和 Python 不同） |
| `null` / `undefined` | `null` | 只有 null |
| `typeof x` | `x.getClass()` / `x instanceof C` | 运行时类型 |
| `x instanceof C` | `x instanceof C` | 一致 |
| `this` | `this` | ⚠️ 一致！（不像 Python 要写 self） |
| `x ?? y` | 无 | 用三元 `x != null ? x : y` 或 `Optional` |
| `x?.y` | 无 | 逐层判空或 `Optional` |

```javascript
// JavaScript
const label = age >= 18 ? "成年" : "未成年";
if (str1 === str2) { ... }
```

```java
// Java：三元和 JS 一样，但字符串比较要用 equals
String label = age >= 18 ? "成年" : "未成年";  // label 存年龄段文案（三元和 JS 完全一致）
if (str1.equals(str2)) {  // ⚠️⚠️ 比内容用 equals，不是 ==
    ...
}
```

⚠️ **`==` 是 Java 头号坑**：`==` 比对象时比的是「内存地址是不是同一个」，不是内容。字符串、Integer、自定义对象比内容都要用 `.equals()`。只有基本类型（int/double/boolean/char）才用 `==` 比值。详见「陷阱对照」第一节。

---

## 九、类与面向对象

Java 是「一切皆对象」，类比 JS 反而更啰嗦但更严格。JS 一个 `class` 就搞定的，Java 常拆成字段 + 构造方法 + getter/setter。

```javascript
// JavaScript
class User {
  constructor(name) { this.name = name; }
  greet() { return `Hi ${this.name}`; }
}
const u = new User("Tom");
```

```java
// Java：构造方法名 = 类名，字段要声明类型和访问修饰符
public class User {
    private String name;              // 字段：私有，存用户名

    public User(String name) {        // 构造方法，⚠️ 方法名 = 类名，没有 constructor 关键字
        this.name = name;             // this 和 JS 一样，指当前实例
    }

    public String greet() {           // 普通方法，要声明返回类型
        return "Hi " + this.name;
    }

    // getter/setter：Java 惯例，private 字段靠它们对外读写
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}

User u = new User("Tom");             // ⚠️ 有 new 关键字（和 JS 一样，不像 Python）
```

| JS | Java | 说明 |
|------|------|------|
| `constructor() {}` | `public 类名() {}` | ⚠️ 构造方法名 = 类名 |
| `this` | `this` | 一致，且自动可用（不用像 Python 写 self） |
| `new User()` | `new User()` | ⚠️ 一致，都用 new |
| `class B extends A` | `class B extends A` | 继承，一致 |
| `super()` | `super()` | 调父类构造，一致 |
| `static method()` | `static 返回类型 method()` | 静态方法，一致 |
| `get x()` | `getX()`（普通方法约定） | ⚠️ Java 无 getter 语法糖，靠命名约定 |
| `toString()` | `@Override public String toString()` | 转字符串，要加 @Override |
| （无接口） | `interface` / `implements` | ⚠️ Java 有独立的接口概念，比 TS interface 强 |

⚠️ **字段私有 + getter/setter 是 Java 强约定**：JS 里习惯直接 `obj.name`，Java 里字段一般 `private`，外部通过 `getName()`/`setName()` 访问。实际项目常用 Lombok 的 `@Data` 注解自动生成，你会在 demo 代码里大量见到（详见第 08 篇注解、第 18 篇）。

⚠️ **一个文件一个 public 类**：Java 强制 `public class User` 必须放在 `User.java` 里，文件名和类名一致。详见第 03 篇。

---

## 十、异步与并发（心智差异最大）

⚠️ 这里和 JS 差异最大：**JS 是单线程 + 事件循环，Java 是真多线程**。JS 的 async/await 心智不能直接搬。

```javascript
// JavaScript：async/await 单线程事件循环
async function fetchData() {
  const data = await fetch(url);
  return await data.json();
}
await Promise.all([a(), b()]);
```

```java
// Java：CompletableFuture ≈ Promise，但底层是真的多线程
import java.util.concurrent.CompletableFuture;

// supplyAsync ≈ new Promise，丢到线程池异步执行
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    return httpClient.get(url);   // 在别的线程里跑
});

// thenApply ≈ .then()，链式处理结果
future.thenApply(data -> parse(data));

// join() ≈ await（阻塞等结果）
String result = future.join();

// allOf ≈ Promise.all（等多个都完成）
CompletableFuture.allOf(a(), b()).join();
```

| JS | Java | 说明 |
|------|------|------|
| `new Promise(...)` | `CompletableFuture.supplyAsync(...)` | 异步任务 |
| `.then(fn)` | `.thenApply(fn)` | 链式处理 |
| `await x` | `x.join()` / `x.get()` | ⚠️ 是**阻塞**当前线程，不是让出 |
| `Promise.all([...])` | `CompletableFuture.allOf(...)` | 等多个 |
| （单线程，无此概念） | `new Thread(...).start()` | ⚠️ 真开线程 |
| （单线程，无此概念） | `synchronized` / `Lock` | ⚠️ 多线程要加锁防竞争 |

⚠️ **JS 不用担心的「线程安全」，Java 要操心**：JS 单线程，永远不会两段代码同时改一个变量。Java 多线程下，多个线程同时改一个 `HashMap` 会出错，得用 `ConcurrentHashMap` 或加 `synchronized` 锁。这是前端转 Java 最容易忽视的心智差异。日常 Spring 开发中大部分并发被框架管了，但要知道有这回事。

---

## 十一、注解 ≈ TS/Angular 的 `@Decorator`

如果你写过 Angular 或 TS 的 `@Component` / `@Injectable`，那 Java 注解**长得几乎一样**——`@` 加在类/方法/字段上面那行。这是 Spring 的基础，到处都是。详见第 08 篇、第 13 篇。

```typescript
// TypeScript / Angular：你已经见过的 @ 语法
@Component({ selector: "app" })
class AppComponent {}
```

```java
// Java / Spring：@注解 加在类/方法上，框架靠反射读取并处理
@RestController                    // 标记这是个 REST 控制器（≈ 注册路由的类）
public class UserController {

    @GetMapping("/users/{id}")     // 路由注解，≈ Express 的 app.get
    public User getUser(@PathVariable Long id) {  // @PathVariable 注入路径参数
        return userService.findById(id);
    }
}
```

| TS/Angular | Java/Spring | 说明 |
|------|------|------|
| `@Component` | `@Component` / `@Service` | 标记为组件/服务 |
| `@Injectable` + 构造注入 | `@Autowired` / 构造注入 | 依赖注入，详见第 09 篇 |
| `@Input()` | `@RequestParam` / `@PathVariable` | 接收入参 |
| 装饰器工厂 | 注解 + 反射处理 | 机制不同但用法像 |

⚠️ **注解本身不做事**：`@` 只是「贴个标签」，真正干活的是框架用**反射**读取这些标签后的处理逻辑（详见第 08 篇）。这点和 TS 装饰器一致。

---

## 十二、异常处理

```javascript
// JavaScript
try {
  risky();
} catch (e) {
  console.error(e);
} finally {
  cleanup();
}
throw new Error("boom");
```

```java
// Java：catch 要声明异常类型，throw 用 new
try {
    risky();
} catch (IllegalArgumentException e) {  // ⚠️ 可以按异常类型分别捕获
    System.out.println(e.getMessage());
} catch (Exception e) {                 // 兜底捕获所有异常
    e.printStackTrace();
} finally {
    cleanup();
}

throw new RuntimeException("boom");     // ⚠️ throw 要 new 一个异常对象
```

| JS | Java | 说明 |
|------|------|------|
| `try {}` | `try {}` | 一致 |
| `catch (e)` | `catch (Exception e)` | ⚠️ 要声明异常类型 |
| `finally {}` | `finally {}` | 一致 |
| `throw new Error(x)` | `throw new RuntimeException(x)` | ⚠️ 要 new，且要指定异常类 |
| 无 | `try (资源) {}` | try-with-resources，自动关资源，详见第 07 篇 |
| 无区分 | 受检异常 vs 非受检异常 | ⚠️ Java 独有，见下 |

⚠️ **受检异常（Checked Exception）是 Java 独有的坑**：某些异常（如 `IOException`）编译器**强制**你要么 try-catch，要么在方法签名上 `throws` 声明，否则编译不过。JS 完全没有这个概念。`RuntimeException` 及其子类是「非受检」的，不强制处理。详见第 07 篇。

---

## 十三、包与导入

| JavaScript | Java | 说明 |
|------|------|------|
| `import { User } from "./user"` | `import com.imber.model.User;` | ⚠️ 用**点号包路径**，不是文件路径 |
| `import * as m from "./m"` | `import com.imber.model.*;` | 导入整个包（用 `*`） |
| `export class User {}` | `public class User {}` | ⚠️ 靠 `public` 修饰符控制可见，没有 export |
| 文件路径找模块 | `package` 声明 + 目录一一对应 | ⚠️ 包名必须和目录结构完全一致 |
| `package.json` | `pom.xml`（Maven） | 依赖清单，详见第 01 篇、A2 常用命令 |
| `npm install x` | 在 `pom.xml` 加依赖 + `mvn install` | 装包，详见 A2 |
| `node_modules/` | `~/.m2/repository/`（本地仓库） | ⚠️ Maven 依赖全局共享，不在项目里 |

```java
// User.java
package com.imber.model;   // ⚠️ 包声明必须和目录一致：com/imber/model/User.java

public class User { ... }   // public 让别的包能导入它（≈ export）

// Main.java
package com.imber;

import com.imber.model.User;  // 用点号路径导入

public class Main {
    public static void main(String[] args) {
        User user = new User("Tom");
    }
}
```

⚠️ **同包不用 import**：同一个 `package` 里的类互相引用不需要 import（≈ JS 同目录也得 import，这点 Java 更省事）。只有跨包才 import。

---

## 十四、Web 后端：Spring Boot ≈ 带强类型的 Express

写过 Express 路由的话，Spring Boot 是「注解版 + 强类型 + 自动装配」的 Express。详见第 09~13 篇。

```javascript
// Express
app.get("/users/:id", (req, data) => {
  data.json({ id: req.params.id });
});
```

```java
// Spring Boot：路由用注解，参数靠注解 + 类型自动解析
@RestController                          // 标记为 REST 控制器
public class UserController {

    @GetMapping("/users/{id}")           // ⚠️ 路径参数用 {id}，不是 :id
    public User getUser(@PathVariable Long id) {  // @PathVariable 自动注入 + 转类型
        return userService.findById(id); // ⚠️ 直接 return 对象，自动转 JSON
    }
}
```

| Express | Spring Boot | 说明 |
|------|------|------|
| `app.get("/p/:id", fn)` | `@GetMapping("/p/{id}")` | ⚠️ 路径参数花括号 |
| `app.post(...)` | `@PostMapping(...)` | POST 路由 |
| `req.params.id` | `@PathVariable Long id` | 路径参数，自动注入+转类型 |
| `req.query.q` | `@RequestParam String q` | query 参数 |
| `req.body` | `@RequestBody User user` | ⚠️ 请求体自动转成对象（≈ JSON 反序列化） |
| `data.json(obj)` | `return obj` | ⚠️ 直接 return，自动转 JSON |
| `express.Router()` | `@RequestMapping("/前缀")` 类级注解 | 路由分组 |
| 手写校验 | `@Valid` + 校验注解 | 参数校验，像 zod 但基于注解 |

⚠️ **不用手动 `data.json()`**：Spring 的 `@RestController` 会自动把返回的对象序列化成 JSON。直接 `return user;` 前端就收到 JSON 了。详见第 12 篇、第 19 篇。

---

## 十五、数据库访问：MyBatis ≈ 手写 SQL 的 ORM

前端一般不直接碰数据库，这块没有对应物，要建新锚点。Java 后端最常用 **MyBatis**：你写 SQL（或用注解），它帮你把结果自动映射成 Java 对象。详见第 14、15 篇。

```java
// MyBatis Mapper 接口：定义方法，SQL 写在 XML 或注解里
@Mapper
public interface UserMapper {
    // 这个方法对应一条 SQL，返回结果自动映射成 User 对象
    User findById(Long id);
}
```

```xml
<!-- UserMapper.xml：SQL 写在这里，#{id} 是参数占位（防 SQL 注入） -->
<select id="findById" resultType="com.imber.model.User">
    SELECT * FROM user WHERE id = #{id}
</select>
```

> 锚点：Mapper 接口 ≈ 你调的一组「数据访问函数」，XML/注解里的 SQL ≈ 函数体，`#{id}` ≈ 参数化查询（≈ 前端 ORM 的占位符，防注入）。调用方 `userMapper.findById(1L)` 就像调普通方法。详见第 15 篇。

⚠️ **`#{}` 和 `${}` 千万别搞混**：`#{}` 是参数化占位（安全，防 SQL 注入），`${}` 是字符串直接拼接（有注入风险）。默认永远用 `#{}`。这是安全红线。

---

## 十六、命令行 / 工程速查（node 生态对照）

| Node 生态 | Java 生态 | 说明 |
|------|------|------|
| `node app.js` | `java -jar app.jar` | 运行（需先编译打包） |
| `node app.js`（直接跑源码） | `javac X.java && java X` | ⚠️ Java 要先编译再运行，详见 `37-Java疑问记录.md` |
| `npm init` | `mvn archetype:generate` / IDEA 建项目 | 初始化项目 |
| `npm install x` | 在 `pom.xml` 加 `<dependency>` | 加依赖 |
| `npm install` | `mvn install` | 按 pom.xml 装依赖 |
| `package.json` | `pom.xml`（Maven） | 依赖清单，详见 A2 |
| `node_modules/` | `~/.m2/repository/` | ⚠️ 全局共享，不在项目内 |
| `npm run build` | `mvn package` | 打包成 jar |
| `npm run dev` | IDEA 里跑 / `mvn spring-boot:run` | 启动开发服务 |
| `console.log(x)` | `System.out.println(x)` | 打印 |
| `JSON.stringify(o)` | `objectMapper.writeValueAsString(o)` | 对象转 JSON（用 Jackson 库） |
| `JSON.parse(s)` | `objectMapper.readValue(s, User.class)` | JSON 转对象 |

⚠️ **依赖不在项目目录里**：不像 `node_modules` 每个项目一份，Maven 把所有依赖下载到用户目录 `~/.m2/repository/` 全局共享。项目里只有 `pom.xml` 声明「我要用哪些」。详见 A2 常用命令。

---

## 十七、命名风格对照

| 场景 | JS/TS 习惯 | Java 习惯 |
|------|------|------|
| 变量/方法 | `camelCase` | `camelCase`（一致！） |
| 类名 | `PascalCase` | `PascalCase`（一致） |
| 常量 | `UPPER_CASE` | `UPPER_CASE`（一致，且常配 `static final`） |
| 私有字段 | `#field` / `_field` | `field`（靠 `private` 修饰符，不改名） |
| 文件名 | `userService.ts` | `UserService.java`（⚠️ 必须和 public 类名一致，PascalCase） |
| 包名 | 无强约定 | 全小写 + 点号：`com.imber.model` |

✅ 好消息：**Java 和 JS 的变量/方法命名习惯几乎一致**（都是 camelCase），比 Python 的 snake_case 更亲切。主要区别是文件名必须 PascalCase 且和类名严格一致。

---

## 小结

本篇是工具书，不用背，写代码时卡住就回来翻对应那节。

✅ **该掌握（核心迁移直觉）**
- Java ≈ 强制写类型的 TS + 一切皆对象 + 先编译再运行，你会 TS 就过了「类型」这关。
- 集合优先用 **List/Map**（≈ JS 的 Array/Object 当字典），数组只在定长场景用。
- 高阶操作用 **Stream**：`.stream().filter().map().collect(toList())`，和 JS 数组方法一一对应。
- 三元 `? :`、`this`、`new`、控制流 `if/for/while` 都和 JS 一致，能直接搬。
- 注解 `@` ≈ TS/Angular 装饰器；Spring Boot ≈ 强类型注解版的 Express。

⚠️ **易混淆（看到必须停一下）**
- **比较对象/字符串内容用 `.equals()`，不是 `==`**——Java 头号坑，`==` 比引用。
- **String 不可变**，`toUpperCase()` 返回新串；大量拼接用 `StringBuilder`。
- **基本类型 vs 包装类型**：`int` vs `Integer`，集合泛型只能放 `Integer`，拆箱 null 会 NPE。
- **没有切片/负索引/解构/默认参数/可选链**：分别用 substring/size()-n/重载/判空替代。
- **Stream 用完即废**，且中间操作要 `.collect()` 才生效。
- **真多线程**：并发改共享数据要加锁或用并发容器，JS 单线程没这问题。
- **受检异常**：`IOException` 之类编译器强制处理，JS 没这概念。

> 想深入某个点：语法基础回第 03~08 篇，Spring Boot 回第 09~13 篇，数据库回第 14~15 篇，demo 匿名化示例代码导读回第 17~20 篇。
