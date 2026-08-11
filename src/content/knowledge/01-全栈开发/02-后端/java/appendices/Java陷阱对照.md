# A1 - 附录-Java陷阱对照

> 你在 JS 里被 `var` 提升、`==` 隐式转换、对象引用复制坑过——Java 也有一组"长得人畜无害、踩下去很疼"的坑。本篇专治前端转 Java 最高频的四类翻车：`==` 比引用（String 比较）、包装类型的自动拆箱 NPE、可变对象引用共享、以及基本类型的整数溢出与除法。每个坑都给出 JS 对照，告诉你哪里"和 JS 一样别慌"、哪里"和 JS 不一样要改心智"。

## 切入点：你早就被语言坑过

JS 有它的"经典面试题坑"：`for (var i...)` 循环里 `setTimeout` 全打印同一个值、`[] == ![]` 为 `true`、`const obj2 = obj1` 改一个动另一个、`0.1 + 0.2 !== 0.3`。Java 的坑结构上有对应，也有 JS 完全没有的新坑。把这篇当成"Java 版的怪异题集"来读最省力。

| JS 的经典坑 | Java 的对应坑 | 本篇章节 |
|------------|----------------|---------|
| `==` 隐式类型转换乱套 | `==` 比对象引用，比内容要用 `.equals()` | 一 |
| （JS 无此坑） | 包装类型 `Integer` 自动拆箱 NPE / 缓存陷阱 | 二 |
| `obj2 = obj1` 引用复制改一动二 | 对象/集合赋值是引用，改一动二 | 三 |
| `0.1 + 0.2 !== 0.3` 浮点误差 | 浮点误差 + 整数溢出 + 整数除法截断 | 四 |

---

## 一、`==` 比引用：字符串/对象比较必须用 `.equals()`

这是前端转 Java **头号必踩坑**，几乎人人栽一次。

```java
// 场景：判断两个字符串内容是否相同
String a = new String("hello");   // a：new 出来的字符串对象
String b = new String("hello");   // b：内容相同，但是另一个独立对象

System.out.println(a == b);        // false —— ？！内容明明一样
System.out.println(a.equals(b));   // true  —— 用 equals 才对
```

**为什么会这样（WHY）**：Java 的 `==` 对**对象**比的是「引用」——也就是「是不是内存里同一个对象」，不是内容。`a` 和 `b` 是两个不同的对象，地址不同，所以 `==` 为 false。`.equals()` 才比内容。

这个坑 JS 程序员其实**有共鸣**——JS 里 `{a:1} === {a:1}` 也是 false（对象比引用）。但 Java 的坑在于**字符串**：JS 的 `"hello" === "hello"` 是 true（字符串是原始类型比值），你被 JS 养成了「字符串能用 === 比」的肌肉记忆，搬到 Java 就翻车。

```javascript
// JS：字符串是原始类型，=== 比值，所以能用（Java 不能照搬！）
const a = "hello";
const b = "hello";
console.log(a === b);   // true —— JS 字符串比值，惯出了错误直觉
```

**更阴险的是「字符串常量池」会时灵时不灵**：

```java
String a = "hello";        // a：字面量，进入「字符串常量池」
String b = "hello";        // b：同一个字面量，复用池里同一个对象
System.out.println(a == b);        // true —— ⚠️ 碰巧成立！因为复用了常量池同一对象

String c = new String("hello");   // c：new 强制创建新对象，不用池
System.out.println(a == c);        // false —— 换成 new 就露馅了
```

⚠️ **这就是坑的可怕之处**：字面量字符串用 `==` 有时是 true（常量池复用），让你误以为 `==` 能用；一旦碰到 `new String()`、或从接口/数据库拿来的字符串，`==` 立刻变 false，线上 bug 就来了。**别依赖常量池的巧合。**

**正确写法：比内容永远用 `.equals()`**：

```java
// ✅ 正确：字符串/对象比内容，一律用 equals
if (a.equals(b)) { ... }

// ✅ 更稳：把「一定不为 null 的常量」放在前面，避免 a 为 null 时 NPE
if ("hello".equals(userInput)) { ... }   // userInput 是 null 也不会报错

// ✅ 或用 Objects.equals（两边都可能为 null 时最安全）
if (java.util.Objects.equals(a, b)) { ... }
```

记忆口诀：**基本类型（int/double/boolean/char）用 `==` 比值；String 和一切对象比内容用 `.equals()`。** 这条没有例外，背下来。

> 边界提醒：自定义类如果没重写 `equals()`，默认还是比引用。项目里的实体类通常用 Lombok `@Data` 或 IDE 自动生成 `equals()`，才能正确比内容。详见第 05 篇。

---

## 二、包装类型 Integer：自动拆箱 NPE 与缓存陷阱

这是 Java **独有、JS 完全没有对应物**的坑，因为 JS 的 number 只有一种。Java 的 `int`（基本类型）和 `Integer`（包装对象）混用时会咬人。

### 2.1 拆箱一个 null → NPE

```java
// 场景：从 Map 里取值再做运算
Map<String, Integer> scores = new HashMap<>();   // scores：存各科分数
Integer math = scores.get("math");               // ⚠️ key 不存在，get 返回 null
int total = math + 10;                            // 💥 NullPointerException！
```

**为什么（WHY）**：`math` 是 `Integer`（对象），值为 null。`math + 10` 需要把 `math` 拆箱成基本类型 `int` 才能做加法，而**拆箱一个 null 就是 NPE**。JS 里 `undefined + 10` 只会得到 `NaN`（不报错），Java 直接崩。

```javascript
// JS：宽容，null/undefined 参与运算不崩（只是结果怪）
const math = undefined;
console.log(math + 10);   // NaN —— 不报错
```

**正确写法：拆箱前判 null，或用 getOrDefault**：

```java
// ✅ 用 getOrDefault 给默认值，避免 null
int math = scores.getOrDefault("math", 0);   // 没这个 key 就用 0
int total = math + 10;                        // 安全
```

### 2.2 用 `==` 比 Integer：又是引用坑 + 缓存

Integer 是对象，所以 `==` 比它也是比引用，而且有个「-128~127 缓存」把你骗到：

```java
Integer a = 100;       // a：值 100，落在 -128~127 缓存区间
Integer b = 100;       // b：同样 100，复用缓存里同一个对象
System.out.println(a == b);       // true —— ⚠️ 缓存复用，碰巧成立

Integer c = 200;       // c：值 200，超出缓存区间
Integer d = 200;       // d：同样 200，各自 new 新对象
System.out.println(c == d);       // false —— ⚠️ 超出缓存，是两个对象！
System.out.println(c.equals(d));  // true  —— 用 equals 才对
```

**为什么（WHY）**：Java 把 `-128~127` 的 Integer 预先缓存复用（和 Python 小整数缓存如出一辙）。`a == b` 因复用同一对象为 true，`c == d` 超出缓存范围是两个对象为 false。这和第一节 String 的坑同源——**对象比 `==` 就是比引用**。

记忆口诀：**Integer/Long 等包装类型比值也用 `.equals()`，别用 `==`；能用基本类型 `int` 就用 `int`。**

---

## 三、对象/集合赋值是引用：`b = a` 不复制内容

这个坑 JS 程序员**完全有共鸣**——`const b = a` 对对象/数组只是复制引用，改一个动另一个。Java 一模一样。

```java
List<Integer> a = new ArrayList<>(List.of(1, 2, 3));   // a：原列表
List<Integer> b = a;                                    // b：不是拷贝！只是同一个列表的第二个名字
b.add(4);
System.out.println(a);   // [1, 2, 3, 4] —— 动 b 也动了 a
```

```javascript
// JS 同款行为
const a = [1, 2, 3];
const b = a;              // 只复制引用
b.push(4);
console.log(a);          // [1, 2, 3, 4]
```

那怎么真正复制？Java 和 JS 一样要区分**浅拷贝 vs 深拷贝**：

```java
List<int[]> nested = new ArrayList<>();   // nested：列表里装的是数组（引用类型）
nested.add(new int[]{1, 2});

// 浅拷贝：新建外层 List，但里面的数组还是同一批引用
List<int[]> shallow = new ArrayList<>(nested);

nested.get(0)[0] = 999;                   // 改原始数据里第 0 个数组的元素

System.out.println(shallow.get(0)[0]);    // 999 —— ⚠️ 浅拷贝跟着变了（内层数组共享）
```

**浅拷贝（shallow）**：只复制最外层容器，里面的子对象还是共享引用。常见写法：`new ArrayList<>(list)`、`list.clone()`、`new HashMap<>(map)`。

**深拷贝（deep）**：递归复制所有层级。Java **没有内置的通用深拷贝**（不像 JS 有 `structuredClone`），常见做法是逐层手动 new、实现 `Cloneable`、或借助序列化（如 JSON 序列化再反序列化）。

对照 JS 你就秒懂——这正是 JS 里"浅拷贝 vs 真·深拷贝"的同一组概念：

| 操作 | JS | Java | 复制深度 |
|------|----|--------|---------|
| 引用赋值（不拷贝） | `const b = a` | `List<T> b = a;` | 0 层，同一个对象 |
| 浅拷贝 | `[...a]` / `{...a}` | `new ArrayList<>(a)` / `new HashMap<>(a)` | 1 层 |
| 深拷贝 | `structuredClone(a)` | 无内置，手动 new / 序列化绕道 | 全部层级 |

⚠️ **传参也是传引用**：Java 里把一个 List 传进方法，方法内部 `list.add()` 会改到外面的原 List（和 JS 一样）。想不被改就传副本进去。

> 边界提醒：JS 的 `[...a]`、`{...a}` 是浅拷贝，嵌套对象同样共享——所以这个"浅拷贝只管一层"的坑你在 JS 早见过，规则完全迁移得过来。区别只是 Java 没有 `structuredClone` 这种一行深拷贝。

---

## 四、数字坑：整数溢出、整数除法截断、浮点误差

JS 只有一种 `number`（64 位浮点），你从没操心过「整数会溢出」。Java 的 `int` 是 32 位整数，有上限，还有「整数除法截断」这个 JS 完全没有的坑。

### 4.1 整数溢出：超过 21 亿会「转圈」变负数

```java
int max = Integer.MAX_VALUE;    // max：int 的最大值，约 21.47 亿（2147483647）
System.out.println(max + 1);    // -2147483648 —— ⚠️ 溢出！变成最小负数

// 典型翻车：两个 int 相乘超出范围
int a = 100000;                 // a：十万
int b = 100000;                 // b：十万
int result = a * b;             // 期望 100 亿，实际 1410065408 —— ⚠️ 溢出后的错误值
```

**为什么（WHY）**：`int` 只有 32 位，最大约 21.47 亿。超过就「溢出回绕」（补码溢出），不报错、不抛异常，静默给你一个错误结果——**这是最阴险的地方**。JS 的 number 能安全表示到 2^53，日常根本碰不到这个上限，所以你没这根弦。

```javascript
// JS：number 范围大得多，日常不会溢出
console.log(100000 * 100000);   // 10000000000 —— 正确
```

**正确写法：可能超 21 亿的用 `long`**：

```java
// ✅ 用 long（64 位），或让运算在 long 下进行
long a = 100000L;               // 加 L 后缀，声明为 long
long result = a * 100000;       // 10000000000 —— 正确

// ⚠️ 陷阱：int * int 先按 int 算完（已溢出）再赋给 long，晚了！
long wrong = 100000 * 100000;   // 还是 1410065408，因为右边先按 int 算
// ✅ 至少一个操作数是 long，才会用 long 运算
long right = 100000L * 100000;  // 10000000000
```

### 4.2 整数除法：`/` 会截断小数（JS 没这坑）

```java
System.out.println(5 / 2);       // 2   —— ⚠️ 不是 2.5！两个 int 相除结果截断为 int
System.out.println(5.0 / 2);     // 2.5 —— 有一个是 double 才得小数
System.out.println((double) 5 / 2); // 2.5 —— 强转一个为 double

int total = 5, count = 2;        // total 总数，count 个数
double avg = total / count;      // ⚠️ 2.0！右边 int/int 先算成 2，再转 double
double right = (double) total / count;  // ✅ 2.5，先转 double 再除
```

**为什么（WHY）**：两个 `int` 相除，Java 认为结果也该是 `int`，直接**砍掉小数部分**（向零截断）。JS 的 `5 / 2` 永远是 `2.5`，你没这根弦，算平均值、算比例时极易翻车。

```javascript
// JS：除法永远是浮点
console.log(5 / 2);   // 2.5
```

### 4.3 浮点误差：这个 JS 有共鸣

```java
System.out.println(0.1 + 0.2);        // 0.30000000000000004 —— 和 JS 一模一样
System.out.println(0.1 + 0.2 == 0.3); // false
```

这个坑 JS 里你见过（`0.1 + 0.2 !== 0.3`），原因相同（二进制浮点表示误差），规则完全迁移。**涉及金额等精确计算，用 `BigDecimal`**：

```java
import java.math.BigDecimal;

// ⚠️ 用 String 构造，别用 double 构造（new BigDecimal(0.1) 会带入误差）
BigDecimal a = new BigDecimal("0.1");   // a：精确的 0.1
BigDecimal b = new BigDecimal("0.2");   // b：精确的 0.2
System.out.println(a.add(b));           // 0.3 —— 精确
```

| 数字坑 | JS 直觉 | Java 真相 |
|------|---------|------------|
| 整数溢出 | number 到 2^53 才不安全，日常无感 | ⚠️ `int` 约 21 亿就溢出，静默变负数；用 `long` |
| 整数除法 | `5/2 === 2.5` | ⚠️ `5/2 == 2`（截断）；要小数得有 double 参与 |
| 浮点误差 | `0.1+0.2 !== 0.3` | 一致；精确计算用 `BigDecimal`（且用 String 构造） |

---

## 五、附赠几个高频小坑（认脸即可）

这些不展开，先混个眼熟，遇到不至于懵：

```java
// 坑 1：switch 不写 break 会「贯穿」到下一个 case（JS 同款，但你可能忘）
switch (day) {
    case 1:
        System.out.println("周一");
        // ⚠️ 忘了 break，会继续执行 case 2 的代码
    case 2:
        System.out.println("周二");
        break;
}
// Java 14+ 可用 switch 表达式（箭头语法）自动防贯穿：case 1 -> "周一";

// 坑 2：遍历集合时删元素 → ConcurrentModificationException
List<Integer> list = new ArrayList<>(List.of(1, 2, 3));
for (Integer x : list) {
    if (x == 2) list.remove(x);   // 💥 抛异常！不能在增强 for 里删
}
// ✅ 用 Iterator.remove() 或 list.removeIf(x -> x == 2)

// 坑 3：char 参与运算会变成 int（ASCII 码）
char c = 'A';                     // c：字符 A
System.out.println(c + 1);        // 66 —— ⚠️ 不是 "A1" 也不是 'B'，是 int 66
System.out.println((char)(c + 1));// B  —— 要强转回 char

// 坑 4：数组越界不像 JS 返回 undefined，而是抛异常
int[] arr = {1, 2, 3};
// System.out.println(arr[5]);    // 💥 ArrayIndexOutOfBoundsException（JS 是 undefined）
```

| 小坑 | JS 直觉 | Java 真相 |
|------|---------|------------|
| switch 贯穿 | 忘 break 会贯穿 | 一致，但 Java 14+ 可用 `->` 语法免 break |
| 遍历中删元素 | JS 能删（行为诡异） | ⚠️ 抛 `ConcurrentModificationException`，用 `removeIf` |
| char 运算 | 无 char 类型 | ⚠️ char + int = int（ASCII），要强转回 char |
| 越界访问 | `arr[5]` 返回 `undefined` | ⚠️ 抛 `ArrayIndexOutOfBoundsException` |

---

## 小结

Java 的坑和 JS 有部分对应（引用比较、浅拷贝、浮点误差），也有 JS 完全没有的新坑（`==` 连字符串都坑、包装类型拆箱 NPE、整数溢出、整数除法截断）。最该刻进肌肉记忆的是第一节——**`==` 比引用、比内容用 `.equals()`**，这是前端被 JS 的 `"a" === "a"` 惯出错误直觉、转 Java 几乎人人踩的头号坑。

✅ 该掌握
- 基本类型（int/double/boolean/char）用 `==` 比值；String 和一切对象比内容用 `.equals()`（或 `Objects.equals`）
- 包装类型 `Integer` 拆箱 null 会 NPE；比值也用 `.equals()`；能用基本类型就用基本类型
- 对象/集合赋值是引用，改一动二；浅拷贝 `new ArrayList<>(a)` 只管一层，深拷贝要手动/序列化绕道
- 数字三坑：`int` 约 21 亿溢出（用 `long`）、`5/2==2`（要小数得有 double）、浮点误差用 `BigDecimal`

⚠️ 易混淆
- 字符串 `==` 因「常量池」时灵时不灵——字面量碰巧 true、`new String` 就 false，别依赖巧合
- `Integer` 因「-128~127 缓存」时灵时不灵——和 String 常量池同源，都是「对象比 `==`」的表现
- 整数溢出**静默**发生，不报错、直接给错误值，这是最阴险的；`long wrong = 100000 * 100000` 右边先按 int 算已溢出
- 增强 for 里删元素抛 `ConcurrentModificationException`，用 `removeIf`
- 数组/List 越界抛异常，不像 JS 返回 `undefined`

相关篇目：`equals`/`hashCode` 与类详见第 05 篇；集合与泛型详见第 06 篇；异常处理详见第 07 篇；String↔基本类型对照详见 A3 速查表。
