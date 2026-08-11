# Java（14）- MySQL 基础

> 读完你能：围绕“MySQL 基础”理解“为什么前端工程师必须懂 SQL”与“先认识一张真实的表：demo 的 organization 网点表”，并结合正文示例完成实践与排障。

> 前 13 课我们一路从网关写到了 Mapper，但数据最终都"落"在 MySQL 里。这一课我们把目光投向这最后一站：学会用 SQL 对数据做增删改查，理解 JOIN、索引和事务——这是后端区别于前端最硬核的一块地基。

---

# 一、为什么前端工程师必须懂 SQL

做前端时，你拿到的数据是后端"喂"给你的 JSON。你只需要 `.filter()`、`.map()`、`.sort()` 在内存里折腾这个数组。

但当你成为全栈，数据源头变成了 MySQL 这张张"表"。**SQL 就是你向数据库要数据时说的语言**。

最关键的认知转变：

| 前端（内存里操作数组） | 后端（数据库里操作表） |
| --- | --- |
| `users.filter(u => u.city === '北京')` | `SELECT * FROM organization WHERE city = '北京'` |
| `users.sort((a,b) => b.time - a.time)` | `ORDER BY create_time DESC` |
| `users.slice(0, 10)` | `LIMIT 10` |
| `users.find(u => u.id === '123')` | `SELECT * FROM organization WHERE id = '123'` |
| 数据丢了刷新就没了 | 数据**持久化**在磁盘，断电也不丢 |

一句话类比：**SQL ≈ 对一个超大数组的查询过滤，只不过这个"数组"存在磁盘上、可能有上千万行，且多人同时读写。**

正因为数据量大、并发高、要持久化，SQL 才衍生出了索引（查得快）、事务（改得稳）这些前端没有的概念。

---

# 二、先认识一张真实的表：demo 的 `organization` 网点表

在 demo 项目里，所有"公司/网点"信息都存在 `organization` 这张表里。我们从 `demo-basic-service/src/main/resources/mapper/OrganizationMapper.xml` 能反推出它的字段。挑几个核心字段，建表语句大致长这样（贴近 demo 示例风格）：

```sql
-- organization 网点表（货运人公司/网点基础信息）
CREATE TABLE `organization` (
  `id`            VARCHAR(32)  NOT NULL COMMENT '主键ID，业务生成的字符串ID',
  `group_id`      VARCHAR(32)           COMMENT '所属集团ID',
  `organization_name`  VARCHAR(128) NOT NULL COMMENT '公司全称',
  `organization_code`  VARCHAR(64)           COMMENT '公司编码',
  `short_name`    VARCHAR(64)           COMMENT '公司简称',
  `type`          VARCHAR(8)            COMMENT '类型',
  `property`      VARCHAR(8)            COMMENT '网点性质：总部/分拨/网点等',
  `parent_ids`    VARCHAR(512)          COMMENT '所有上级ID链，逗号分隔',
  `province`      VARCHAR(32)           COMMENT '省',
  `city`          VARCHAR(32)           COMMENT '市',
  `area`          VARCHAR(32)           COMMENT '区',
  `phone`         VARCHAR(32)           COMMENT '联系电话',
  `status`        TINYINT      DEFAULT 1 COMMENT '状态：1启用 0停用',
  `create_time`   DATETIME              COMMENT '创建时间',
  `update_time`   DATETIME              COMMENT '更新时间',
  PRIMARY KEY (`id`),                         -- 主键索引
  KEY `idx_group_id` (`group_id`),            -- 普通索引：按集团查
  KEY `idx_city` (`city`)                     -- 普通索引：按城市查
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='网点公司表';
```

> 【前端类比】`CREATE TABLE` 就像你用 TypeScript 定义一个 `interface Organization { id: string; organizationName: string; ... }`，再规定"这个数组里每个元素都必须长这样"。区别是 SQL 还要声明每个字段的**存储类型和长度**（`VARCHAR(128)`），以及哪些字段建了**索引**（查得快）。

注意 Java 实体 `Organization` 的字段名是**驼峰** `organizationName`，而表字段是**下划线** `organization_name`——这个映射关系正是第 04 课讲的 Mapper 干的活（`<result property="organizationName" column="organization_name"/>`）。

---

# 三、CRUD：增删改查四板斧

CRUD = Create / Read / Update / Delete，对应四个 SQL 关键字。这是你 90% 时间在写的东西。

## 3.1 SELECT —— 查（Read）

```sql
-- 查全部字段，全表（生产环境慎用，数据量大会很慢）
SELECT * FROM organization;

-- 只查需要的列（推荐！别动不动 SELECT *）
SELECT id, organization_name, city, status FROM organization;
```

> 【前端类比】`SELECT *` ≈ 把整个对象都拿过来；`SELECT id, organization_name` ≈ 解构只取你要的字段 `const { id, organizationName } = organization`。少拿字段 = 少传输 = 更快，后端尤其讲究这个。

## 3.2 INSERT —— 增（Create）

```sql
-- 插入一条网点记录，列名和值一一对应
INSERT INTO organization (id, organization_name, city, status, create_time)
VALUES ('1001', '北京朝阳网点', '北京', 1, NOW());
```

> 【前端类比】≈ `arr.push({ id: '1001', organizationName: '北京朝阳网点', ... })`。`NOW()` 是 MySQL 内置函数，返回当前时间，相当于 JS 的 `new Date()`。

## 3.3 UPDATE —— 改（Update）

```sql
-- 把 id=1001 这条网点停用
UPDATE organization
SET status = 0, update_time = NOW()
WHERE id = '1001';
```

> ⚠️ **致命陷阱**：`UPDATE` 不写 `WHERE` 会把**整张表所有行**都改掉！这等价于 `arr.forEach(item => item.status = 0)`——但你是在生产数据库上干这事，没有 Ctrl+Z。每次写 UPDATE/DELETE 先把 WHERE 写好是后端的肌肉记忆。

## 3.4 DELETE —— 删（Delete）

```sql
-- 删除 id=1001 这条
DELETE FROM organization WHERE id = '1001';
```

> ⚠️ 同样，`DELETE FROM organization` 不带 WHERE = 清空整张表。实际业务里 demo 很少物理删除，更多是上面那种 `UPDATE status = 0` 的**逻辑删除**（软删除），数据留痕方便追溯。

CRUD 对照速查：

| 操作 | SQL 关键字 | 前端类比 | 必带 WHERE？ |
| --- | --- | --- | --- |
| 查 | `SELECT` | `filter` / `find` | 否（但建议带） |
| 增 | `INSERT` | `push` | 不适用 |
| 改 | `UPDATE` | 改对象属性 | **强烈建议** |
| 删 | `DELETE` | `splice` | **强烈建议** |

---

# 四、WHERE / ORDER BY / LIMIT —— 查询的三大修饰

光会 `SELECT *` 不够，真实查询都要过滤、排序、分页。

## 4.1 WHERE —— 过滤条件

```sql
-- 查北京市、状态为启用的网点
SELECT id, organization_name, city
FROM organization
WHERE city = '北京' AND status = 1;
```

常用运算符，几乎和 JS 一一对应：

| SQL | 含义 | 前端类比 |
| --- | --- | --- |
| `=` | 等于 | `===` |
| `!=` / `<>` | 不等于 | `!==` |
| `>` `<` `>=` `<=` | 比大小 | 同名 |
| `AND` / `OR` | 与/或 | `&&` / `\|\|` |
| `IN (a, b, c)` | 在集合内 | `[a,b,c].includes(x)` |
| `LIKE '北京%'` | 模糊匹配（%是通配符） | `str.startsWith('北京')` |
| `BETWEEN x AND y` | 区间 | `x <= n && n <= y` |
| `IS NULL` | 为空 | `x == null` |

```sql
-- 模糊查：公司名以"北京"开头
SELECT * FROM organization WHERE organization_name LIKE '北京%';

-- IN 查询：查这几个城市的网点
SELECT * FROM organization WHERE city IN ('北京', '上海', '广州');
```

> 【前端类比】`WHERE` 就是 `.filter()` 的回调条件。`WHERE city = '北京' AND status = 1` ≈ `arr.filter(c => c.city === '北京' && c.status === 1)`。

## 4.2 ORDER BY —— 排序

```sql
-- 按创建时间倒序（最新的在前）
SELECT id, organization_name, create_time
FROM organization
ORDER BY create_time DESC;   -- DESC 降序，ASC 升序（默认）
```

> 【前端类比】≈ `arr.sort((a,b) => b.createTime - a.createTime)`。`DESC` = descending 降序，`ASC` = ascending 升序。

## 4.3 LIMIT —— 分页

```sql
-- 取前 10 条
SELECT * FROM organization ORDER BY create_time DESC LIMIT 10;

-- 分页：跳过前 20 条，再取 10 条（即第 3 页，每页 10 条）
SELECT * FROM organization ORDER BY create_time DESC LIMIT 20, 10;
--                                                    ↑offset ↑每页条数
```

> 【前端类比】`LIMIT 20, 10` ≈ `arr.slice(20, 30)`。在 demo 里你几乎不用手写 `LIMIT`——用的是 PageHelper / MyBatis-Plus 这类分页插件，你只管传 `pageNum`、`pageSize`，它自动帮你拼 `LIMIT`。

三者的执行顺序（重要）：**先 WHERE 过滤 → 再 ORDER BY 排序 → 最后 LIMIT 截断**。

```
全表数据
   │  WHERE city='北京'      ← 第1步：筛掉不符合的行
   ▼
符合条件的行
   │  ORDER BY create_time DESC  ← 第2步：排序
   ▼
排好序的行
   │  LIMIT 20, 10           ← 第3步：切出这一页
   ▼
最终返回的 10 行
```

---

# 五、动态拼 SQL：看 demo 匿名化示例代码

前面的 SQL 都是写死的。但示例业务里，查询条件是用户传的——可能传了城市，也可能没传。这时就要"动态拼 SQL"。

看 demo `OrganizationMapper.xml` 里 `getOrganizationPage` 的示例片段（节选）：

```xml
<!-- 来自 demo-basic-service/.../mapper/OrganizationMapper.xml -->
<select id="getOrganizationPage" resultMap="organizationMap">
  SELECT id, organization_name, organization_code, city, status, create_time
  FROM organization
  <where>
    <!-- 只有当传了 organizationName 才拼这个条件，避免污染 SQL -->
    <if test="organization.organizationName != null and organization.organizationName.trim() != ''">
      AND organization_name = #{organization.organizationName}
    </if>
    <!-- 只有传了 city 才按城市过滤 -->
    <if test="organization.city != null and organization.city.trim() != ''">
      AND city = #{organization.city}
    </if>
    <if test="organization.status != null and organization.status.trim() != ''">
      AND status = #{organization.status}
    </if>
  </where>
</select>
```

> 【前端类比】这个 `<if>` 动态拼接，就是你在前端发请求前**条件构造 query 参数**的后端版本：
> ```js
> // 前端：有值才加进 query
> const params = {};
> if (organizationName) params.organizationName = organizationName;
> if (city) params.city = city;
> ```
> MyBatis 的 `<where>` 标签还很贴心：它会自动把多余的开头 `AND` 去掉，所以你每个条件都放心写 `AND`，第一个生效的条件不会变成非法的 `WHERE AND ...`。

`#{organization.city}` 这种 `#{}` 写法是**参数占位符**，MyBatis 会用预编译（`?`）方式塞值进去——**这是防 SQL 注入的关键**，千万别用字符串拼接把用户输入直接接到 SQL 里。

---

# 六、JOIN —— 多表关联查询

这是 SQL 真正强大、也是前端最陌生的地方。

业务场景：`organization` 表里确实存了 `group_id`（集团ID，这是 demo `organization` 表的示例字段），但表里没存集团的名字。假设集团名字存在另一张表 `organization_group`（这张表名是为讲清 JOIN 概念虚构的示意表，demo 实际未必这么拆），你想一次查出"网点名 + 它所属集团的名字"，就要 **JOIN**（连表）。

```sql
-- 查网点及其所属集团名称（organization_group 为示意表）
SELECT
    c.organization_name,        -- 网点名（来自 organization 表，别名 c）
    c.city,
    g.group_name           -- 集团名（来自示意表 organization_group，别名 g）
FROM organization c
INNER JOIN organization_group g ON c.group_id = g.id   -- 关联条件：用 group_id 对上
WHERE c.status = 1;
```

> 【前端类比】JOIN ≈ 你拿到两个数组，手动做关联：
> ```js
> // 前端手动 join：给每个 organization 找到它的 group
> companies.map(c => {
>   const g = groups.find(g => g.id === c.groupId);
>   return { organizationName: c.organizationName, groupName: g?.groupName };
> });
> ```
> 区别是：前端要先把两个数组都拉到内存再 `find`，而 SQL 的 JOIN 是数据库在磁盘层面高效完成的，一条语句搞定，数据量大时快得多。

JOIN 的几种类型：

| JOIN 类型 | 含义 | 前端类比 |
| --- | --- | --- |
| `INNER JOIN` | 内连接，**两边都匹配上**才返回 | `find` 找到才保留，找不到丢弃 |
| `LEFT JOIN` | 左连接，**左表全保留**，右表没匹配上则为 NULL | `map` 后用 `?.` 兜底，找不到给 null |
| `RIGHT JOIN` | 右连接，右表全保留（少用） | 反过来的 LEFT |

实践中 `LEFT JOIN` 最常用，因为它保证主表数据不丢：

```sql
-- 即使某网点没绑定集团（group_id 为空），这条网点也要查出来（organization_group 为示意表）
SELECT c.organization_name, g.group_name
FROM organization c
LEFT JOIN organization_group g ON c.group_id = g.id;
-- 没匹配上的 g.group_name 会是 NULL
```

> ⚠️ 注意：JOIN 虽强，但连的表越多、数据量越大越慢。demo 实际代码里很多场景**故意不 JOIN**，而是先查一张表拿到 ID 列表，再用 `IN` 查另一张表，在 Java 内存里组装——这样每条 SQL 都简单、走得动索引，整体反而更快、更好维护。该不该 JOIN 是后端的一项重要权衡。

---

# 七、索引：为什么查询能"秒回"

## 7.1 索引是什么

假设 `organization` 表有 100 万行。执行：

```sql
SELECT * FROM organization WHERE city = '北京';
```

- **没索引**：数据库只能从第 1 行扫到第 100 万行，一行行比对 `city`，这叫**全表扫描**，慢。
- **有索引**：数据库先查 `city` 字段的"目录"，直接定位到北京的那批行，快。

> 【前端类比】索引 ≈ 给数组提前建了一个 `Map`：
> ```js
> // 没索引：每次都遍历整个数组
> companies.filter(c => c.city === '北京');   // O(n)
> // 有索引：提前按 city 分好组，直接取
> const cityMap = new Map();  // { '北京': [...], '上海': [...] }
> cityMap.get('北京');         // O(1) 近似
> ```
> 更精确地说，MySQL 的索引底层是一棵 **B+ 树**（一种有序的多叉树），查找复杂度约 O(log n)，类比就是"一本字典的偏旁部首目录"——不用一页页翻。

## 7.2 索引的代价

索引不是越多越好：

| 维度 | 影响 |
| --- | --- |
| 查询（SELECT） | ✅ 变快 |
| 写入（INSERT/UPDATE/DELETE） | ❌ 变慢（每次写都要顺带维护索引这棵树） |
| 磁盘空间 | ❌ 多占空间（索引本身也要存） |

> 【前端类比】≈ 你维护了一个额外的 `Map` 缓存：查的时候爽，但每次 `push`/`update` 数组都得**同步更新这个 Map**，否则数据就不一致了。索引就是数据库帮你自动维护的这个"缓存"。

## 7.3 实战经验

- **WHERE / JOIN ON / ORDER BY 用到的字段**，是建索引的首选。比如 demo 的 `organization` 表，`group_id`、`city` 经常被当查询条件，就该建索引。
- **主键（PRIMARY KEY）自带索引**，所以 `WHERE id = '1001'` 永远很快——这也是为什么 demo 大量接口都是按 id 查（见第 04 课 `getById`）。
- **区分度低的字段别单独建索引**：比如 `status` 只有 0/1 两个值，建索引意义不大（类比：按"性别"建目录，翻一半也没省多少）。
- 用 `EXPLAIN` 看一条 SQL 有没有走索引：

```sql
EXPLAIN SELECT * FROM organization WHERE city = '北京';
-- 看结果里的 type 列：ref/range = 走了索引；ALL = 全表扫描（要警惕）
```

---

# 八、事务（Transaction）：ACID

## 8.1 为什么需要事务

业务场景：A 网点给 B 网点转账结算 100 元。这要做两件事：

```sql
UPDATE organization SET settle_remainder = settle_remainder - 100 WHERE id = 'A';  -- A 减 100
UPDATE organization SET settle_remainder = settle_remainder + 100 WHERE id = 'B';  -- B 加 100
```

如果第一条执行成功，第二条**突然断电/报错**了，会怎样？A 的钱少了 100，B 却没收到——**钱凭空蒸发了**。这是绝对不能接受的。

事务就是为了解决这个：把多条 SQL **捆成一个不可分割的整体**，要么全部成功，要么全部失败回滚（rollback），绝不停在中间状态。

> 【前端类比】前端基本没有等价物。最接近的是：你连续发了两个 API，第二个失败了，你希望第一个的副作用也能"撤销"——但前端做不到，只能补偿。而数据库事务能真正做到"原子地撤销"。

## 8.2 ACID 四大特性

| 特性 | 英文 | 含义 | 一句话 |
| --- | --- | --- | --- |
| 原子性 | **A**tomicity | 多条操作要么全做，要么全不做 | "转账两步不可拆" |
| 一致性 | **C**onsistency | 事务前后数据都符合业务规则 | "总钱数不变" |
| 隔离性 | **I**solation | 多个事务并发时互不干扰 | "你转你的我转我的" |
| 持久性 | **D**urability | 事务一旦提交，数据永久保存 | "提交了就断电也不丢" |

裸 SQL 写事务长这样：

```sql
START TRANSACTION;        -- 开启事务

UPDATE organization SET settle_remainder = settle_remainder - 100 WHERE id = 'A';
UPDATE organization SET settle_remainder = settle_remainder + 100 WHERE id = 'B';

COMMIT;                   -- 两条都成功 → 提交，永久生效
-- 若中间出错则执行 ROLLBACK; 全部撤销
```

## 8.3 Java 里怎么用：`@Transactional`

实际开发中你**几乎不手写** `START TRANSACTION`，而是用 Spring 的 `@Transactional` 注解（呼应第 08 课的注解机制）：

```java
/**
 * 网点间结算转账
 * @param fromId 转出网点ID
 * @param toId   转入网点ID
 * @param amount 金额
 */
@Transactional(rollbackFor = Exception.class)  // 方法内任意一步抛异常，整个方法的 SQL 全部回滚
public void settle(String fromId, String toId, BigDecimal amount) {
    // 第一步：转出方扣钱
    organizationMapper.decreaseRemainder(fromId, amount);
    // 第二步：转入方加钱——若这里抛异常，上一步的扣钱也会被自动回滚
    organizationMapper.increaseRemainder(toId, amount);
}
```

> 【前端类比】`@Transactional` 就像给整个方法包了一层"`try` + 自动 rollback"。你不用手动管理提交/回滚，Spring 在方法正常结束时帮你 `COMMIT`，抛异常时帮你 `ROLLBACK`。`rollbackFor = Exception.class` 是明确告诉它"任何异常都回滚"（默认只对运行时异常回滚，这是个常见坑）。

## 8.4 并发下的"加锁"：demo 匿名化示例代码

并发场景下，为了保证隔离性，常用"行锁"。看 demo `OrganizationMapper.xml` 里这条示例 SQL：

```xml
<!-- 来自 demo-basic-service/.../mapper/OrganizationMapper.xml -->
<select id="selectOrganizationForUpdate" resultType="...Organization">
    SELECT * from organization WHERE id = #{id} for update
</select>
```

末尾的 `FOR UPDATE` 是关键：它在事务中查出这条记录的同时**给这一行加锁**，其他事务想改这行就得排队等。这正是处理金额结算这类并发场景的标准做法——`SELECT ... FOR UPDATE` 查出来 → 计算 → `UPDATE` 改回去，全程独占，避免两个请求同时扣钱导致金额算错。

> 【前端类比】≈ 你给某个操作加了一把"全局锁/互斥量"，同一时刻只允许一个流程进去操作这条数据，其余的等它做完。前端单线程一般遇不到，但后端是多线程并发，锁是家常便饭。

---

# 九、本课小结

- **SQL ≈ 对磁盘上超大数组的查询过滤**，但多了持久化、索引、事务这些前端没有的概念。
- **CRUD 四板斧**：`SELECT`（查）/`INSERT`（增）/`UPDATE`（改）/`DELETE`（删）。改和删**务必先写 WHERE**，否则全表遭殃。demo 多用 `UPDATE status=0` 做逻辑删除。
- **查询三修饰**：`WHERE`（过滤，≈filter）→ `ORDER BY`（排序，≈sort）→ `LIMIT`（分页，≈slice），执行顺序也是这个。
- **动态 SQL**：demo 的 `getOrganizationPage` 用 `<if>`+`<where>` 按需拼条件，`#{}` 占位符防注入。
- **JOIN** 多表关联：`INNER JOIN`（两边都匹配）/`LEFT JOIN`（左表全留，最常用）。≈ 前端手动 `find` 关联，但更快。该不该 JOIN 是后端权衡，demo 常拆成多条简单查询。
- **索引** ≈ 给数组建 Map/字典目录，让查询从 O(n) 全表扫描降到 O(log n)。代价是写入变慢、占空间。WHERE/JOIN/ORDER BY 的字段适合建索引，主键自带索引。
- **事务 ACID**：原子性/一致性/隔离性/持久性。Java 用 `@Transactional` 注解管理，记得 `rollbackFor = Exception.class`。并发场景用 `SELECT ... FOR UPDATE` 加行锁（demo 示例在用）。

下一课预告：**第 15 课 MyBatis 进阶**——我们会深入这一课反复出现的 Mapper XML，搞懂 `resultMap` 字段映射、`#{}` 与 `${}` 的本质区别、`<foreach>` 批量操作，以及 demo 是怎么把 SQL 和 Java 方法优雅地绑在一起的。

# 十、总结

- **为什么前端工程师必须懂 SQL**：做前端时，你拿到的数据是后端"喂"给你的 JSON。
- **索引：为什么查询能"秒回"**：假设 organization 表有 100 万行。
- **CRUD：增删改查四板斧**：CRUD = Create / Read / Update / Delete，对应四个 SQL 关键字。
- **WHERE / ORDER BY / LIMIT —— 查询的三大修饰**：光会 SELECT  不够，真实查询都要过滤、排序、分页。
