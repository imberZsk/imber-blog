# 第 15 课：MyBatis 与 MyBatis-Plus 入门

> 前 14 课我们一直在 Java 语言和 Spring 的世界里打转，这一课终于要碰数据库了。MyBatis 就是 Java 后端的"ORM 工具 + SQL 拼装器"，而 MyBatis-Plus 则是在它之上再包一层、把增删改查省到一行代码——类比前端，它俩合起来约等于 Prisma / TypeORM 之于 Node。

---

## 一、先回忆：第 04 课的"五站"里，数据库是最后一站

第 04 课讲 HTTP 请求生命周期时，我们画过这条链路：

```
网关 → Controller → Service → Mapper → MySQL
                                ↑
                          本课主角在这里
```

Controller 收请求、Service 写业务、最后真正"和数据库说话"的是 **Mapper**。前 14 课我们都在前三站打转，这一课把目光聚焦在 **Mapper → MySQL** 这一段：Java 代码到底是怎么变成一条 SQL、再把查询结果变回 Java 对象的。

### 前端类比：你早就用过"ORM"了

| 前端 / Node 场景 | Java 对应 | 干的事 |
| --- | --- | --- |
| `prisma.user.findUnique({where:{id}})` | `mapper.selectById(id)` | 按主键查一条 |
| `prisma.user.findMany({where:{...}})` | `mapper.selectList(wrapper)` | 按条件查多条 |
| Prisma `schema.prisma` 模型 | `@TableName` 标注的 entity 类 | 表结构映射 |
| 手写 `db.query('SELECT ...')` | MyBatis 的 XML / `@Select` | 原生 SQL |
| Prisma 的 `where/orderBy` 链式条件 | MyBatis-Plus 的 `Wrapper` 条件构造器 | 拼条件 |

所以你已经有直觉了：**MyBatis 偏"手写 SQL 派"，MyBatis-Plus 偏"自动生成派"**。demo 项目里两者混用——简单 CRUD 用 Plus 一行搞定，复杂查询落到 XML 手写 SQL。

---

## 二、MyBatis 核心三件套：Mapper 接口、XML、动态 SQL

### 2.1 Mapper 接口 —— "只写签名，不写实现"

这是 Java 新手最容易懵的点：**Mapper 是个 `interface`，没有实现类，但它能直接被调用并真的查到数据。**

来看 demo-basic 的匿名化示例代码 `OrganizationMapper.java`：

```java
// 文件：demo-basic-service/.../mapper/OrganizationMapper.java
package com.example.platform.basic.service.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.core.metadata.IPage;
import org.apache.ibatis.annotations.Param;

/**
 * 物流公司表 Mapper
 * 关键：继承 BaseMapper<Organization> 就白送了一堆 CRUD 方法（下面第三节细讲）
 */
public interface OrganizationMapper extends BaseMapper<Organization> {

  /**
   * 物流公司表简单分页查询
   * @param page    分页参数（第几页、每页几条），MyBatis-Plus 的分页对象
   * @param organization 查询条件载体，把前端传来的筛选字段塞进这个对象
   * @return 分页结果，IPage 里既有当页数据也有总条数
   */
  IPage<Organization> getOrganizationPage(Page page, @Param("organization") Organization organization);
}
```

> 注意：这里**没有 `OrganizationMapperImpl`**。你不会找到任何一个类去 `implements OrganizationMapper`。

**那实现在哪？** MyBatis 在启动时用第 08 课讲过的"反射 + 动态代理"，自动给这个接口生成了一个隐形的实现类：

```
你写的接口         MyBatis 偷偷生成的代理对象
OrganizationMapper  →  [运行时动态代理] → 找到同名 XML 里的 SQL → 执行 → 把结果映射回 Organization
```

#### 前端类比

这就像你在 TS 里只声明了一个接口类型，运行时却有人帮你把实现"变"出来了：

```typescript
// 前端：你只能声明类型，实现还得自己写
interface OrganizationApi {
  getOrganizationPage(page: Page, organization: Organization): Promise<IPage<Organization>>;
}
// ❌ 这个接口不能直接调用，必须有人 implements

// Java MyBatis：接口声明完，实现由框架在运行时"自动注入"
// ✅ @Autowired OrganizationMapper 直接就能 .getOrganizationPage(...) 调用
```

更贴切的类比是 **GraphQL Code Generator**：你写好 schema/query，工具生成可直接调用的强类型函数。MyBatis 干的是同一件事，只是把"生成"放到了运行时。

`@Param("organization")` 这个注解也要记一下：它给参数起个"在 SQL 里能用的名字"。后面 XML 里写 `#{organization.organizationName}` 时，`organization` 这个前缀就来自这里。

---

### 2.2 XML 映射 —— SQL 写在这里

接口只有签名，那 SQL 本体呢？在 **同名 XML 文件**里。demo 的约定是放在 `resources/mapper/OrganizationMapper.xml`，靠 `namespace` 和接口绑死：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">

<!-- namespace 必须 = 对应 Mapper 接口的全限定类名，这是接口和 XML 绑定的钥匙 -->
<mapper namespace="com.example.platform.basic.service.mapper.OrganizationMapper">

  <!-- resultMap：定义"数据库列 → Java 字段"的映射关系 -->
  <resultMap id="organizationMap" type="com.example.platform.basic.service.entity.Organization">
    <id     property="id"          column="id"/>            <!-- 主键 -->
    <result property="groupId"     column="group_id"/>      <!-- 驼峰 groupId ← 下划线 group_id -->
    <result property="organizationName" column="organization_name"/>
    <result property="organizationCode" column="organization_code"/>
    <!-- ……其余字段省略，demo 示例 XML 里有 60+ 个字段 -->
  </resultMap>

  <!-- select 的 id 必须 = 接口里的方法名 getOrganizationPage -->
  <select id="getOrganizationPage" resultMap="organizationMap">
    SELECT id, group_id, organization_name, organization_code, short_name, type, state
    FROM organization
    <!-- 动态 SQL 在这里，下一节讲 -->
  </select>
</mapper>
```

#### 三个"必须对上号"的绑定关系

```
OrganizationMapper.java                OrganizationMapper.xml
─────────────────                 ─────────────────
接口全限定名          ──绑定──→     <mapper namespace="...">
方法名 getOrganizationPage ──绑定──→     <select id="getOrganizationPage">
返回类型 Organization       ──绑定──→     <resultMap type="...Organization">
```

#### 为什么需要 resultMap？因为命名习惯不一样

| 层 | 命名习惯 | 例子 |
| --- | --- | --- |
| MySQL 列名 | 下划线 snake_case | `organization_name` |
| Java 字段 | 驼峰 camelCase | `organizationName` |

`resultMap` 就是这张"翻译表"。

> **前端类比**：跟你用 axios 拦截器或 `humps` 库把后端返回的 `snake_case` 自动转成前端的 `camelCase` 是一模一样的诉求。只不过 MyBatis 把这层翻译写在了 XML 里。
>
> 好消息：MyBatis-Plus 默认开启了"驼峰自动映射"，所以**简单字段根本不用手写 resultMap**——`organization_name` 会自动对上 `organizationName`。demo 这份 XML 写得这么全，是早期代码生成器一把梭生成的，实战中新表大多省掉。

---

### 2.3 动态 SQL —— XML 里的 `if/foreach`

这是 MyBatis 相比"裸拼字符串"最香的地方：**SQL 可以带逻辑判断**。

来看 `getOrganizationPage` 里真实的动态 SQL（节选）：

```xml
<select id="getOrganizationPage" resultMap="organizationMap">
  SELECT id, group_id, organization_name, organization_code, state
  FROM organization
  <!-- <where> 标签很聪明：有条件才加 WHERE，且自动去掉开头多余的 AND -->
  <where>
    <!-- <if> = JS 里的 if。test 里写判断表达式 -->
    <!-- 这句的业务含义：只有当前端传了 organizationName 且非空白，才拼这个过滤条件 -->
    <if test="organization.organizationName != null and organization.organizationName.trim() != ''">
      AND organization_name = #{organization.organizationName}
    </if>
    <if test="organization.organizationCode != null and organization.organizationCode.trim() != ''">
      AND organization_code = #{organization.organizationCode}
    </if>
    <if test="organization.shortName != null and organization.shortName.trim() != ''">
      AND short_name = #{organization.shortName}
    </if>
  </where>
</select>
```

> 小坑提醒：`test` 表达式里的 `.trim()` 只能用在**字符串字段**上。demo 这份 XML 是代码生成器一把梭生成的，连 `state`（`Integer` 类型）都写成了 `state.trim()`——这其实是个隐患，一旦 `state` 真有值，OGNL 解析 `.trim()` 会抛异常。判空数字字段直接写 `organization.state != null` 就够了。

**这段 SQL 会根据传入条件"变形"**：

```
前端只传了 organizationName           →  SELECT ... FROM organization WHERE organization_name = ?
前端传了 organizationName + shortName →  SELECT ... FROM organization WHERE organization_name = ? AND short_name = ?
前端啥都没传                      →  SELECT ... FROM organization   （<where> 发现没条件，连 WHERE 都不加）
```

#### 前端类比：你拼查询条件时也这么干

```typescript
// 前端拼 query 参数，也是"有值才加"
const params: Record<string, any> = {};
if (organizationName) params.organizationName = organizationName;  // 等价于 <if> + AND organization_name=?
if (state) params.state = state;
const url = `/api/organization?${qs.stringify(params)}`;
```

`<if test="...">` 就是 XML 版的 `if (organizationName)`，`<where>` 帮你处理了"第一个条件前面不该有 AND"这种烦人的边界。

#### `#{}` vs `${}` —— 安全红线，必须分清

| 写法 | 行为 | 类比 | 安全性 |
| --- | --- | --- | --- |
| `#{organization.id}` | 预编译占位符 `?`，参数单独传 | 参数化查询 / `db.query('...?', [id])` | ✅ 防 SQL 注入 |
| `${organization.id}` | **字符串直接拼进 SQL** | 模板字符串 `` `...${id}` `` | ⚠️ 有注入风险 |

**默认永远用 `#{}`**。只有在拼"列名、表名、排序方向"这种没法参数化的位置才不得已用 `${}`，且必须确保来源可信（不能是用户直接输入）。这跟前端"绝不把用户输入直接拼进 innerHTML / SQL"是同一条铁律。

#### `foreach` —— 处理 `IN (...)` 列表

demo 匿名化示例代码 `selectChildCompanies`（下面节选 `property in` 这一段，原方法后面还用第二个 `foreach` 拼了 `FIND_IN_SET`）用 `foreach` 把一个 List 展开成 `IN (...)`：

```xml
<select id="selectChildCompanies" resultType="com.example.platform.basic.service.entity.Organization">
  select * from organization where property in
  <!-- foreach 遍历 properties 列表，用逗号分隔，前后加括号 -->
  <!-- 渲染结果形如：property in ( 1 , 2 )  -->
  <foreach item="item" collection="properties" separator="," open="(" close=")">
    #{item}
  </foreach>
  <!-- 匿名化示例代码后面还有：and <foreach ... separator="or"> FIND_IN_SET(#{item}, parent_ids) </foreach> -->
</select>
```

| `foreach` 属性 | 含义 | 前端类比 |
| --- | --- | --- |
| `collection` | 要遍历的集合参数名 | `arr` |
| `item` | 每个元素的临时变量名 | `arr.map(item => ...)` 里的 `item` |
| `separator` | 元素之间的分隔符 | `arr.join(',')` 的 `,` |
| `open` / `close` | 整体的前后缀 | `'(' + ... + ')'` |

可以理解成 `properties.map(item => '#{item}').join(',')` 然后包一对括号。

---

## 三、MyBatis-Plus：把 CRUD 省到一行

到这你可能想："就为查一条数据，还得写接口 + XML + resultMap？太啰嗦了。" MyBatis-Plus（简称 MP）就是来治这个的。

### 3.1 BaseMapper —— 白送一整套 CRUD 方法

还记得 `OrganizationMapper extends BaseMapper<Organization>` 吗？这个 `extends` 就是魔法来源。继承 `BaseMapper<Organization>` 后，**你一行 SQL 都没写，就白得了一整套 CRUD**：

```java
// 这些方法你没定义，但都能直接调用，因为 BaseMapper 已经实现了
organizationMapper.selectById(123);                  // 按主键查一条 → Organization
organizationMapper.selectBatchIds(Arrays.asList(1,2,3)); // 按主键批量查 → List<Organization>
organizationMapper.selectList(wrapper);              // 按条件查多条 → List<Organization>
organizationMapper.selectOne(wrapper);               // 按条件查一条 → Organization
organizationMapper.insert(organization);                  // 插入
organizationMapper.updateById(organization);              // 按主键更新
organizationMapper.deleteById(123);                  // 按主键删除
```

#### 前端类比

这跟 Prisma 给每个 model 白送 `findUnique / findMany / create / update / delete` 是同一个设计思路——你定义好模型，CRUD 自动到位。

```typescript
// Prisma：定义 model，白送 CRUD
await prisma.organization.findUnique({ where: { id: 123 } });   // ≈ selectById(123)
await prisma.organization.findMany({ where: { state: 2 } });    // ≈ selectList(wrapper)
```

MP 是怎么知道查哪张表、哪些列的？靠 entity 上的注解（第 08 课讲过注解）：

```java
// 文件：demo-basic-service/.../entity/Organization.java
@Data                              // Lombok：自动生成 getter/setter（第 08 课）
@EqualsAndHashCode(callSuper = true)
@TableName("organization")              // 告诉 MP：这个类对应数据库 organization 表
public class Organization extends Model<Organization> {

    @TableId                       // 标记这个字段是主键 → selectById 就拿它当 WHERE 条件
    private Integer id;            // 主键 id

    private Integer groupId;       // 集团 id（自动映射到列 group_id）
    private String  organizationName;   // 物流公司名称（自动映射到列 organization_name）
    private Integer state;         // 公司状态 1未激活 2启用 3停用
    // ……
}
```

| 注解 | 作用 | 对应 Prisma |
| --- | --- | --- |
| `@TableName("organization")` | 类 ↔ 表名 | `@@map("organization")` |
| `@TableId` | 字段 ↔ 主键 | `@id` |
| （字段名驼峰自动转下划线） | `organizationName` ↔ `organization_name` | `@map("organization_name")` |

---

### 3.2 Wrapper 条件构造器 —— 不写 XML 也能拼条件

简单的"按主键查"用 `selectById` 就够，但"按多个条件查"怎么办？总不能为每种组合都写个 XML。这就是 **Wrapper（条件构造器）** 的舞台——**第 04 课我们见过它，这里讲透**。

Wrapper 让你用**链式 Java 方法**拼 WHERE 条件，完全不碰 SQL 字符串。看 demo-basic 的匿名化示例代码 `MaterialRepositoryImpl.java`：

```java
// 文件：demo-basic-service/.../repository/impl/MaterialRepositoryImpl.java
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;

@Repository
public class MaterialRepositoryImpl
        extends ServiceImpl<MaterialMapper, Material>   // 继承后白送 getOne/list 等方法
        implements MaterialRepository {

    /**
     * 按 id 查询单个物料（带集团隔离 + 状态过滤）
     * @param groupId 集团 id，多租户隔离的关键条件，绝不能漏
     * @param id      物料 id
     */
    @Override
    public Material getById(Integer groupId, Integer id) {
        // Wrappers.<Material>lambdaQuery() 造一个针对 Material 表的条件构造器
        LambdaQueryWrapper queryWrapper = Wrappers.<Material>lambdaQuery()
            .eq(Material::getGroupId, groupId)                  // WHERE group_id = ?
            .eq(Material::getId, id)                            //   AND id = ?
            .eq(Material::getStatus, StatusEnum.NORMAL.getValue()); // AND status = 正常

        return getOne(queryWrapper);   // 执行查询，返回一条
    }

    /**
     * 按 id 列表批量查询物料
     * @param ids 物料 id 集合，用 .in() 展开成 IN (...)
     */
    @Override
    public List<Material> listByIds(Integer groupId, Collection<Integer> ids) {
        LambdaQueryWrapper queryWrapper = Wrappers.<Material>lambdaQuery()
            .eq(Material::getGroupId, groupId)   // group_id = ?
            .in(Material::getId, ids)            // id IN (?, ?, ...)
            .eq(Material::getStatus, StatusEnum.NORMAL.getValue());

        return list(queryWrapper);   // 执行查询，返回 List
    }
}
```

#### 这段代码生成的 SQL

```sql
-- getById 生成：
SELECT * FROM material
WHERE group_id = ? AND id = ? AND status = ?

-- listByIds 生成：
SELECT * FROM material
WHERE group_id = ? AND id IN (?, ?, ?) AND status = ?
```

#### 重点理解 `Material::getGroupId` 这个写法

`Material::getGroupId` 是第 06 课/Stream 里见过的**方法引用**。它不是"调用"getGroupId，而是"指向"这个 getter，MP 通过反射解析出它对应的字段名 `groupId`，再转成列名 `group_id`。

**为什么不直接写字符串 `"group_id"`？** 因为方法引用是**编译期类型安全**的：

```java
.eq(Material::getGroupId, groupId)   // ✅ 字段名写错？编译不过，IDE 直接红
.eq("group_di", groupId)             // ❌ 字符串拼错一个字母，编译期发现不了，运行才报错
```

#### 前端类比：这就是链式 Query Builder

```typescript
// 前端 Knex / Prisma 的链式条件，跟 Wrapper 是一个味道
const materials = await knex('material')
  .where('group_id', groupId)        // ≈ .eq(Material::getGroupId, groupId)
  .where('id', 'in', ids)            // ≈ .in(Material::getId, ids)
  .where('status', NORMAL);          // ≈ .eq(Material::getStatus, NORMAL)

// Prisma 版本更像：
await prisma.material.findMany({
  where: { groupId, id: { in: ids }, status: NORMAL }
});
```

`LambdaQueryWrapper` 就是 Java 版的、类型安全的 query builder。

#### 常用 Wrapper 条件方法速查

| Wrapper 方法 | 生成的 SQL | Prisma / Knex 类比 |
| --- | --- | --- |
| `.eq(字段, 值)` | `字段 = ?` | `where: { 字段: 值 }` |
| `.ne(字段, 值)` | `字段 != ?` | `not` |
| `.in(字段, 集合)` | `字段 IN (...)` | `字段: { in: [...] }` |
| `.like(字段, 值)` | `字段 LIKE '%值%'` | `contains` |
| `.gt / .ge / .lt / .le` | `> / >= / < / <=` | `gt / gte / lt / lte` |
| `.orderByDesc(字段)` | `ORDER BY 字段 DESC` | `orderBy` |
| `.isNull / .isNotNull` | `IS NULL / IS NOT NULL` | `字段: null` |

> 还有个隐藏福利：大多数条件方法有个带 `condition` 的重载，比如 `.eq(StringUtils.isNotBlank(name), 字段, name)`——第一个布尔参数为 `true` 才拼这个条件。这就是用 Java 代码实现了 2.3 节 XML `<if>` 的效果，省掉一堆 if 判断。

---

### 3.3 三种写法该选哪个？

demo 里三种方式并存，给你一张决策表：

| 场景 | 推荐写法 | 例子 |
| --- | --- | --- |
| 按主键查 / 简单增删改 | `BaseMapper` 现成方法 | `selectById(id)` |
| 动态多条件查询（条件在变） | `Wrapper` 条件构造器 | `MaterialRepositoryImpl.getById` |
| 复杂 SQL（多表 JOIN、`FIND_IN_SET`、`JSON_SET` 等） | 手写 XML | `OrganizationMapper.selectChildCompanies` |

判断口诀：**能用 Wrapper 别写 XML，但 SQL 一复杂（JOIN、函数、特殊语法）就老老实实回 XML。** demo 的 `incrementUpdateSettleRemainderById` 用到了 `JSON_SET`、`COALESCE` 这种 Wrapper 表达不了的 MySQL 函数，就必须落在 XML 里。

---

## 四、串起来：一次查询的完整数据流

把本课的零件拼回第 04 课的"五站"图里：

```
前端发请求 GET /organization/childList?ids=12,34
        │
        ▼
┌──────────────┐
│ Controller   │  接收参数 ids
└──────┬───────┘
       ▼
┌──────────────┐
│ Service      │  写业务逻辑，决定调哪个查询
└──────┬───────┘
       ▼
┌──────────────────────────────────────────────┐
│ Mapper（接口，无实现类）                        │
│   organizationMapper.selectChildCompanies(ids, ...) │
└──────┬─────────────────────────────────────────┘
       ▼  MyBatis 动态代理介入
┌──────────────────────────────────────────────┐
│ XML：<foreach> 把 ids 展开成 IN (12,34)         │
│      #{} 预编译，参数安全绑定                    │
└──────┬─────────────────────────────────────────┘
       ▼
┌──────────────┐
│ MySQL        │  执行 SELECT * FROM organization WHERE ...
└──────┬───────┘
       ▼  resultMap / 驼峰映射 把列名转回 Java 字段
┌──────────────┐
│ List<Organization>│  Java 对象列表，原路返回给前端
└──────────────┘
```

整条链路里，本课讲的 Mapper 接口、XML、动态 SQL、Wrapper 各司其职，最终完成"Java 对象 ↔ 数据库行"的双向翻译。

---

## 本课小结

- **Mapper 是接口、没有实现类**：MyBatis 用反射 + 动态代理（第 08 课）在运行时生成实现，类比 GraphQL Codegen / Prisma 自动生成的客户端。
- **MyBatis 三件套**：Mapper 接口（写方法签名）+ XML（写 SQL，靠 `namespace`/`id` 与接口绑定）+ resultMap（列名 snake_case ↔ 字段 camelCase 的翻译表，MP 默认驼峰映射可省）。
- **动态 SQL**：`<if test>` ≈ JS 的 `if`，`<where>` 自动处理 AND 边界，`<foreach>` ≈ `arr.map().join()` 展开 `IN (...)`。
- **`#{}` 防注入、`${}` 直接拼接有风险**：默认永远用 `#{}`，等同前端的参数化查询铁律。
- **MyBatis-Plus 的 `BaseMapper`** 白送 `selectById/selectList/selectBatchIds` 等一整套 CRUD，靠 `@TableName`/`@TableId` 注解定位表和主键，类比 Prisma 自动 CRUD。
- **Wrapper 条件构造器**（第 04 课见过）：`Wrappers.<T>lambdaQuery().eq(...).in(...)` 链式拼条件，方法引用 `Entity::getXxx` 保证编译期类型安全，类比 Knex/Prisma 的 query builder。
- **三选一口诀**：简单 CRUD 用 BaseMapper，动态条件用 Wrapper，复杂 SQL（JOIN/MySQL 函数）回 XML。
- 引用的 demo 匿名化示例代码：`OrganizationMapper`（继承 BaseMapper + 自定义分页方法）、`OrganizationMapper.xml`（`<where>/<if>/<foreach>` 动态 SQL）、`Organization` entity（`@TableName/@TableId`）、`MaterialRepositoryImpl`（`Wrappers.lambdaQuery().eq().in()` 真实用法）。

**下一课预告**：第 16 课《事务与 @Transactional》——查询会了，但当一次业务要改多张表（比如同时扣网点余额 + 写流水），如何保证"要么全成功、要么全回滚"？我们会讲 Spring 声明式事务，对比前端很少直接打交道的 ACID 与回滚机制，并看 demo 里 `@Transactional` 的真实用法和那些"事务不生效"的经典坑。
