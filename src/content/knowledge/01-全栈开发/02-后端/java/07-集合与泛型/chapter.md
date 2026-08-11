# Java（6）- 集合与泛型

> List/Map/Set 对比 JS 数组/对象。demo 里 stream 操作随处可见，正好对照 JS 数组方法。

# 一、三种集合速览

| Java 集合 | 是什么 | JS 类比 |
|-----------|--------|---------|
| `List` | 有序、可重复的列表 | 数组 `[]` |
| `Set` | 无序、不可重复 | `Set` / 去重数组 |
| `Map` | 键值对 | 对象 `{}` / `Map` |

---

# 二、List（动态数组）

## 2.1 创建和基本操作

```java
// 创建（注意泛型 <Integer> 声明里面装什么类型）
List<Integer> list = new ArrayList<>();
list.add(1);              // push → add
list.add(2);
Integer first = list.get(0);  // arr[0] → get(0)
int size = list.size();   // arr.length → size()
list.remove(0);           // 删除索引 0
boolean has = list.contains(2);  // arr.includes → contains
```

对照表：

| JS | Java |
|------|------|
| `arr.push(x)` | `list.add(x)` |
| `arr[i]` | `list.get(i)` |
| `arr.length` | `list.size()` |
| `arr.includes(x)` | `list.contains(x)` |
| `arr.splice(i, 1)` | `list.remove(i)` |

## 2.2 快速创建带初值的 List

```java
List<String> list = Arrays.asList("a", "b", "c");  // 类似 ['a','b','c']
```

---

# 三、Map（键值对）

```java
Map<String, Integer> map = new HashMap<>();
map.put("age", 18);            // obj[key] = val
Integer age = map.get("age");  // obj[key]
map.remove("age");             // delete obj[key]
boolean has = map.containsKey("age");  // 'age' in obj
Set<String> keys = map.keySet();       // Object.keys(obj)
```

对照表：

| JS | Java |
|------|------|
| `obj[key] = val` | `map.put(key, val)` |
| `obj[key]` | `map.get(key)` |
| `delete obj[key]` | `map.remove(key)` |
| `key in obj` | `map.containsKey(key)` |
| `Object.keys(obj)` | `map.keySet()` |
| `Object.values(obj)` | `map.values()` |

---

# 四、Set（去重集合）

```java
Set<Integer> set = new HashSet<>();
set.add(1);
set.add(1);   // 重复，无效
set.add(2);
// set 里只有 {1, 2}
```

类比 JS 的 `new Set()`，自动去重。

---

# 五、泛型 `<>`：声明"装什么类型"

你注意到 `List<Integer>`、`Map<String, Integer>` 里的尖括号了吗？这叫**泛型**，告诉编译器"这个容器里装什么类型"。

```java
List<String> names = new ArrayList<>();  // 只能装 String
names.add("Tom");      // ✅
names.add(123);        // ❌ 编译报错，不是 String
```

类比 TS：

```typescript
let names: Array<string> = []   // ≈ List<String>
let names: string[] = []        // 同上
```

**好处**：编译时就能检查类型，避免装错东西。`<>` 就是 Java 版的 TS 泛型。

---

# 六、Stream：Java 版的数组链式操作

demo 代码里大量用 `stream()`，它就是 **Java 版的数组方法链**（map/filter/reduce）。

## 6.1 匿名化示例代码对照（OrganizationService.java）

```java
// demo 匿名化示例代码：取出所有 groupId 去重成 Set
Set<Integer> groupSet = driverOrganizationList.stream()
        .map(DriverOrganization::getGroupId)    // 取每个元素的 groupId
        .collect(Collectors.toSet());      // 收集成 Set
```

对应的 JS 写法：

```javascript
// JS：你熟悉的写法
const groupSet = new Set(
  driverOrganizationList.map(item => item.groupId)
)
```

## 6.2 常用 stream 操作对照

| JS 数组方法 | Java Stream |
|------------|-------------|
| `arr.map(x => x.id)` | `list.stream().map(X::getId).collect(Collectors.toList())` |
| `arr.filter(x => x.age > 18)` | `list.stream().filter(x -> x.getAge() > 18).collect(Collectors.toList())` |
| `arr.find(x => ...)` | `list.stream().filter(...).findFirst()` |
| 按字段分组 | `list.stream().collect(Collectors.groupingBy(X::getType))` |

## 6.3 filter 示例（OrganizationService.java:355）

```java
// demo：过滤掉 id 等于 parentId 的元素
organizationList = organizationList.stream()
        .filter(item -> !item.getId().equals(parentId))
        .collect(Collectors.toList());
```

JS 等价：

```javascript
organizationList = organizationList.filter(item => item.id !== parentId)
```

**关键差异：**
1. Java 要 `.stream()` 开头、`.collect(...)` 结尾（把流收集回 List）
2. Java 的 lambda 用 `->`（JS 用 `=>`）
3. `DriverOrganization::getGroupId` 是方法引用，等价于 `item -> item.getGroupId()`

---

# 七、本课小结

- **List**（≈数组）、**Map**（≈对象）、**Set**（≈去重集合）
- 操作变了：`push/[i]` → `add/get(i)`，`obj[k]` → `map.put/get(k)`
- **泛型 `<>`** = 声明容器装什么类型，≈ TS 泛型
- **Stream** = Java 版数组链式操作，`.stream().map().filter().collect()`
- lambda 用 `->`（JS 是 `=>`），`X::getId` 是方法引用
- 下一篇：异常处理

# 八、总结

- **Set（去重集合）**：类比 JS 的 new Set()，自动去重。
- **泛型 `<>`：声明"装什么类型"**：你注意到 List<Integer>、Map<String, Integer> 里的尖括号了吗？
- **Stream：Java 版的数组链式操作**：demo 代码里大量用 stream()，它就是 Java 版的数组方法链（map/filter/reduce）。
- **本课小结**：List（≈数组）、Map（≈对象）、Set（≈去重集合）

## 可视化规格

> VISUAL_STRATEGY：思维导图（Mindmap）
> DIAGRAM_DESCRIPTION：中心节点为“Java（6）- 集合与泛型”，一级分支使用本文主要章节，至少覆盖核心概念、适用场景、实现要点、选型取舍和常见误区。
