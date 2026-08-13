# Playwright（07） - 代码审查（Code Review）核心要点

> 读完后，你应能解释“0. 审查的优先级原则”，复现“1. 正确性（最优先）”的最小实现，并用“2. 状态共享与缓存污染（高频踩坑）”检查结果与失败边界。

> 本文按"重要性"排序，列出 CR 时应重点关注的维度，并分别给出**前端（React/Redux）**和 **Java 后端** 的典型错误示例。

---

## 0. 审查的优先级原则

CR 不是逐字挑刺，而是把精力放在「机器查不出、又容易出事」的地方：

- **能自动化的交给工具**：格式、缩进、未使用变量等交给 Prettier / ESLint / Checkstyle，不在 CR 里耗费精力。
- **优先看三件事**：
  1. 改动有没有引入回归（正确性）；
  2. 有没有违反团队既有约定；
  3. Bug 修复有没有对应的测试锁住。

---

## 1. 正确性（最优先）

逻辑是否真的解决了问题，边界条件是否覆盖（空数组、null、并发、分页边界、超时）。

### 前端示例

```js
// ❌ 错误：未处理空数组与 null，直接取下标会抛错
const handleExport = (rows) => {
  const fullFuelRange = rows[0].fullFuel.range; // rows 为空时 rows[0] 是 undefined
  doExport(fullFuelRange);
};

// ✅ 正确：先校验，再取值
const handleExport = (rows) => {
  if (!rows?.length) return showInfo(WARN, '请选择要导出的数据!');
  const fullFuelRange = rows[0]?.fullFuel?.range ?? null;
  doExport(fullFuelRange);
};
```

### Java 示例

```java
// ❌ 错误：list 可能为 null，size() 抛 NPE；除数可能为 0
public BigDecimal avg(List<Order> orders) {
    return total(orders).divide(new BigDecimal(orders.size()));
}

// ✅ 正确：空集合与除零都处理
public BigDecimal avg(List<Order> orders) {
    if (orders == null || orders.isEmpty()) {
        return BigDecimal.ZERO;
    }
    return total(orders).divide(new BigDecimal(orders.size()), 2, RoundingMode.HALF_UP);
}
```

---

## 2. 状态共享与缓存污染（高频踩坑）

多请求、多对象、并发场景下共享的可变状态最容易串数据。

### 前端示例

```js
// ❌ 错误：模块级缓存被多车数据复用，导致"串单"
const fuelCache = {}; // 模块级，多次调用共享
export function getFullFuelRange(carId) {
  if (fuelCache.range) return fuelCache.range; // 第二辆车拿到第一辆的缓存
  fuelCache.range = fetchRange(carId);
  return fuelCache.range;
}

// ✅ 正确：按 key 隔离缓存
const fuelCache = new Map();
export function getFullFuelRange(carId) {
  if (fuelCache.has(carId)) return fuelCache.get(carId);
  const range = fetchRange(carId);
  fuelCache.set(carId, range);
  return range;
}
```

### Java 示例

```java
// ❌ 错误：SimpleDateFormat 是有状态的，作为静态字段在多线程下会错乱
public class DateUtil {
    private static final SimpleDateFormat SDF = new SimpleDateFormat("yyyy-MM-dd");
    public static String format(Date d) { return SDF.format(d); } // 并发下结果错乱
}

// ✅ 正确：用线程安全的 DateTimeFormatter，或每次新建
public class DateUtil {
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    public static String format(LocalDate d) { return d.format(FMT); }
}
```

> ⚠️ 另一个常见 Java 陷阱：`@Service` / `@Controller` 默认是单例，把请求级数据放成实例字段会被并发共享。

---

## 3. 安全性

鉴权/越权、输入校验、敏感信息泄露。

### 前端示例

```js
// ❌ 错误：直接把后端返回的 HTML 塞进 dangerouslySetInnerHTML，存在 XSS
<div dangerouslySetInnerHTML={{ __html: remark }} />

// ✅ 正确：纯文本渲染，或先做白名单清洗
<div>{remark}</div>
// 必须渲染富文本时使用 DOMPurify.sanitize(remark)
```

### Java 示例

```java
// ❌ 错误：字符串拼接 SQL，存在注入；且未校验当前用户是否有权访问该单
String sql = "SELECT * FROM orders WHERE id = " + orderId;

// ✅ 正确：参数化查询 + 越权校验
@PreAuthorize("hasPermission(#orderId, 'order', 'read')")
public Order getOrder(@Param("orderId") Long orderId, Long currentUserId) {
    return orderMapper.selectByIdAndOwner(orderId, currentUserId); // #{orderId} 参数绑定
}
```

---

## 4. 副作用与资源清理

请求、定时器、事件监听、流、连接是否正确释放。

### 前端示例

```js
// ❌ 错误：useEffect 注册了定时器/监听但没清理，组件卸载后泄漏
useEffect(() => {
  const timer = setInterval(refresh, 5000);
  window.addEventListener('resize', onResize);
  // 没有 return 清理
}, []);

// ✅ 正确：返回清理函数
useEffect(() => {
  const timer = setInterval(refresh, 5000);
  window.addEventListener('resize', onResize);
  return () => {
    clearInterval(timer);
    window.removeEventListener('resize', onResize);
  };
}, []);
```

### Java 示例

```java
// ❌ 错误：流/连接未关闭，泄漏文件句柄
public String read(String path) throws IOException {
    BufferedReader r = new BufferedReader(new FileReader(path));
    return r.readLine(); // 异常或正常返回都不会 close
}

// ✅ 正确：try-with-resources 自动关闭
public String read(String path) throws IOException {
    try (BufferedReader r = new BufferedReader(new FileReader(path))) {
        return r.readLine();
    }
}
```

---

## 5. 数据一致性与事务

异步时序、事务边界、提交/回滚。

### 前端示例

```js
// ❌ 错误：写操作刚发出就立刻刷新，ES 还没同步，列表显示旧数据
await saveOrder(data);
that.handleRefreshData(); // 拿到的是同步前的数据

// ✅ 正确：留出同步时间（项目约定）
await saveOrder(data);
setTimeout(() => that.handleRefreshData?.(), 1500);
```

### Java 示例

```java
// ❌ 错误：@Transactional 内部 catch 掉异常，事务不会回滚；private 方法上注解不生效
@Transactional
public void transfer(Long from, Long to, BigDecimal amount) {
    deduct(from, amount);
    try {
        add(to, amount);
    } catch (Exception e) {
        log.error("failed", e); // 吞掉异常，前面的扣款已提交，钱凭空消失
    }
}

// ✅ 正确：异常向上抛出，让事务回滚
@Transactional(rollbackFor = Exception.class)
public void transfer(Long from, Long to, BigDecimal amount) {
    deduct(from, amount);
    add(to, amount); // 任意一步失败，整体回滚
}
```

---

## 6. 性能

不必要的重渲染、N+1 查询、重复计算、缺索引。

### 前端示例

```jsx
// ❌ 错误：每次渲染都新建对象/函数，导致子组件 memo 失效、全量重渲染
<List style={{ marginTop: 10 }} onSelect={(row) => handle(row)} />

// ✅ 正确：常量提到外部，回调用 useCallback
const listStyle = { marginTop: 10 };
const onSelect = useCallback((row) => handle(row), [handle]);
<List style={listStyle} onSelect={onSelect} />
```

### Java 示例

```java
// ❌ 错误：循环里逐条查库，典型 N+1
for (Order o : orders) {
    User u = userMapper.selectById(o.getUserId()); // 1000 单查 1000 次
    o.setUserName(u.getName());
}

// ✅ 正确：批量查询后内存关联
Set<Long> userIds = orders.stream().map(Order::getUserId).collect(toSet());
Map<Long, User> userMap = userMapper.selectByIds(userIds).stream()
        .collect(toMap(User::getId, u -> u));
orders.forEach(o -> o.setUserName(userMap.get(o.getUserId()).getName()));
```

---

## 7. 错误处理与可观测性

异常路径是否处理，失败时用户/运维能否定位。

### 前端示例

```js
// ❌ 错误：catch 里什么都不做，用户点了没反应也不知道为啥
try {
  await submit();
} catch (e) {}

// ✅ 正确：给用户反馈，保留日志
try {
  await submit();
} catch (e) {
  showInfo(ERROR, e?.message || '提交失败，请重试');
  console.error('[submit] failed', e);
}
```

### Java 示例

```java
// ❌ 错误：吞异常并返回 null，调用方拿到 null 又引发 NPE，且无日志可查
public Order query(Long id) {
    try {
        return orderMapper.selectById(id);
    } catch (Exception e) {
        return null; // 错误被隐藏
    }
}

// ✅ 正确：记录上下文并抛出业务异常
public Order query(Long id) {
    try {
        return orderMapper.selectById(id);
    } catch (Exception e) {
        log.error("query order failed, id={}", id, e);
        throw new BizException("查询运单失败", e);
    }
}
```

---

## 8. 可维护性与团队约定

命名、职责单一、重复抽取、是否遵循项目既有约定、改动范围是否克制。

### 前端示例

```js
// ❌ 错误：在 operationMap.js 同一个 require.ensure 里并排 require 多个文件（违反项目约定）
orderOp: emit => new Promise(resolve => {
  require.ensure([], require => {
    require('...orderOp.js').init(emit);
    require('...orderCopyOp.js').init(emit); // 违反"一个入口"约定
    resolve();
  });
});

// ✅ 正确：operationMap 只调度一个入口，子模块在主 op 文件内组合
// operationMap.js
orderOp: emit => new Promise(resolve => {
  require.ensure([], require =>
    resolve(require('...orderOp.js').init(emit)), 'listOperation-orderOp');
});
// orderOp.js
import { init as initOrderCopyOp } from '.../orderCopyOp';
export function init(emt) {
  // ...原有事件注册
  initOrderCopyOp(emt); // 末尾统一组合子模块
}
```

### Java 示例

```java
// ❌ 错误：一个方法做了校验+查询+计算+导出，职责混杂，难测难维护
public void export(Long id) {
    // 30 行参数校验
    // 20 行查库
    // 40 行计算
    // 30 行写 Excel
}

// ✅ 正确：拆分职责，每个方法单一意图
public void export(Long id) {
    ExportParam param = validate(id);
    List<Order> orders = load(param);
    ExportData data = calculate(orders);
    writeExcel(data);
}
```

---

## 9. 测试覆盖

关键逻辑（尤其 Bug 修复）有无配套测试，是否锁住回归场景，外部依赖是否 mock。

### 前端示例（Vitest）

```js
// Bug 修复：满油区间缓存按车隔离 —— 必须有用例锁住"不串单"
it('returns isolated fuel range per car', () => {
  const a = getFullFuelRange('carA');
  const b = getFullFuelRange('carB');
  expect(b).not.toBe(a); // 第二辆车不应拿到第一辆的缓存
});
```

### Java 示例（JUnit）

```java
// 转账回滚：必须验证任意一步失败时整体回滚
@Test
void transfer_shouldRollback_whenAddFails() {
    doThrow(new RuntimeException()).when(account).add(eq(2L), any());
    assertThrows(RuntimeException.class, () -> service.transfer(1L, 2L, TEN));
    assertEquals(originBalance, account.balanceOf(1L)); // 扣款已回滚
}
```

---

## 快速检查清单（CR 时逐条过）

- [ ] 边界条件：空、null、并发、分页边界都处理了？
- [ ] 共享/缓存状态会不会串数据？
- [ ] 鉴权、输入校验、敏感信息泄露？
- [ ] 定时器/监听/流/连接是否清理释放？
- [ ] 事务边界与异步时序是否正确？
- [ ] 有没有 N+1、无谓重渲染、缺索引？
- [ ] 异常路径有反馈、有日志？
- [ ] 是否遵循团队约定，改动范围是否克制？
- [ ] Bug 修复有没有对应测试锁住回归？

## 参考资料

- [Playwright 文档](https://playwright.dev/docs/intro)
- [Playwright 最佳实践](https://playwright.dev/docs/best-practices)
