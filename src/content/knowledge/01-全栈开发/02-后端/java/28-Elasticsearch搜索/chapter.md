# Java（27）- Elasticsearch 全文检索

> 读完你能：围绕“Elasticsearch 全文检索”理解“先问一个问题：为什么不用 MySQL 搜？”与“1 【前端类比】”，并结合正文示例完成实践与排障。

> 当用户在搜索框里敲下「京A·12345 上个月的加油记录」时，MySQL 会喘不过气，而 Elasticsearch 笑而不语——这一课我们就来认识这个专门为「搜」而生的引擎。

---

# 一、先问一个问题：为什么不用 MySQL 搜？

你在前端肯定遇到过这种需求：一个搜索框，用户随便输点啥，要从几百万条订单 / 资产操作记录里「模糊地、跨字段地、还要分页排序地」捞出结果。

如果让 MySQL 来扛，SQL 大概长这样：

```sql
SELECT * FROM asset_record
WHERE asset_no LIKE '%12345%'      -- 资产编号模糊匹配
   OR record_user_name LIKE '%12345%'  -- 用户名也匹配
   OR address LIKE '%12345%'     -- 地址也匹配
ORDER BY create_time DESC
LIMIT 0, 20;
```

问题就出在 `LIKE '%xxx%'` 这种**前后都带通配符**的模糊匹配上。

## 1.1 【前端类比】

这就像你在一个**没有建索引的大数组**里做全文搜索：

```typescript
// 前端：在 10 万条数据里这样找，浏览器会卡死
const result = records.filter(r =>
  r.trNum.includes(keyword) ||
  r.userName.includes(keyword) ||
  r.address.includes(keyword)
);
// 这是 O(n) 全表扫描，数据一大就崩
```

`LIKE '%xxx%'` 在 MySQL 里**用不上 B+ 树索引**（索引只能加速「前缀匹配」`LIKE 'xxx%'`），所以本质就是全表逐行扫描。一对照表你就明白了：

| 维度 | MySQL（`LIKE '%x%'`） | Elasticsearch |
|------|---------------------|---------------|
| 模糊匹配原理 | 逐行扫描，O(n) | 倒排索引，接近 O(1) 查词 |
| 多字段「或」搜索 | 每多一个字段慢一截 | 天生支持，一次查多个字段 |
| 中文分词 | 不支持，只能整串匹配 | 内置分词器，「上海普陀」能拆词 |
| 相关性排序 | 没有「谁更相关」的概念 | 自带打分（score），最相关的排前面 |
| 擅长场景 | 精确查、事务、关联 JOIN | 全文检索、海量日志、聚合统计 |

一句话总结：**MySQL 是「账本」，保证数据准确和事务；ES 是「搜索引擎」，保证你搜得快、搜得全。** 两者不是替代关系，而是分工。

---

# 二、ES 到底是什么？

## 2.1 【前端类比】≈ 一个专门优化过的搜索引擎

你可以把 Elasticsearch 想象成「**自己部署的一个百度 / Google**」：

- 你把数据「喂」给它（写入），它会偷偷帮你建好「搜索索引」
- 之后你发一个查询 JSON 给它，它毫秒级返回最相关的结果
- 它跟你的业务库（MySQL）是**两套独立系统**，数据通过同步机制保持一致

```
        写入时（数据双写 / 同步）
  ┌──────────┐   binlog/MQ 同步   ┌──────────────┐
  │  MySQL   │ ─────────────────> │ Elasticsearch │
  │ (源数据)  │                    │  (搜索副本)    │
  └──────────┘                    └──────────────┘
       ↑                                  ↑
   写业务数据走这里                  用户搜索走这里
   （下单、改记录）                  （搜索框、列表筛选）
```

---

# 三、核心概念：倒排索引（Inverted Index）

这是 ES 快的根本原因，也是面试必问。

## 3.1 正排索引 vs 倒排索引

**正排索引**（MySQL 的思路）：文档 → 内容

| 文档ID | 内容 |
|--------|------|
| 1 | 上海 普陀 加油 |
| 2 | 北京 朝阳 维保 |
| 3 | 上海 朝阳 加油 |

想找「上海」？只能一行行翻，看哪行包含「上海」。

**倒排索引**（ES 的思路）：词 → 文档列表

| 词（term） | 出现在哪些文档 |
|-----------|--------------|
| 上海 | [1, 3] |
| 普陀 | [1] |
| 朝阳 | [2, 3] |
| 加油 | [1, 3] |
| 维保 | [2] |

想找「上海」？直接查这张表，**一步**就拿到 `[1, 3]`，不用扫全表。

## 3.2 【前端类比】

倒排索引 ≈ 你用 JS 提前构建的一个 `Map<关键词, ID[]>`：

```typescript
// ES 在写入数据时，自动帮你做了这件事：
const invertedIndex = new Map<string, number[]>();
// "上海" -> [1, 3]
// "加油" -> [1, 3]
// 搜索时直接 invertedIndex.get("上海")，O(1) 命中
// 而不是每次都 records.filter(...) 全表扫
```

这就是为什么 ES 搜全文比 MySQL `LIKE` 快几个数量级——**搜索的活儿在写入时就提前算好了**。

---

# 四、三个核心名词：index / document / mapping

ES 的数据模型和 MySQL 有清晰的对应关系，前端同学对照着记最快：

| Elasticsearch | MySQL | 前端类比 | 说明 |
|--------------|-------|---------|------|
| **index**（索引） | table（表） | 一个数据集合 | 比如 demo 里的 `AssetRecord` 索引 |
| **document**（文档） | row（行） | 一个 JS 对象 | 一条资产操作记录就是一个 document |
| **field**（字段） | column（列） | 对象的属性 | `asset_no`、`create_time` 等 |
| **mapping**（映射） | 表结构 DDL | TS 的 `interface` | 定义每个字段的类型和是否分词 |

> 注意：这里的 index（索引）指的是「数据集合」，相当于一张表；别和 MySQL 里「给某列加索引」的那个 index 搞混了。

## 4.1 mapping ≈ TypeScript interface

mapping 定义了「这个 index 里每个字段是什么类型、怎么被搜索」。看这个对比：

```typescript
// 前端：TS interface 定义数据形状
interface AssetRecord {
  trNum: string;       // 资产编号号
  mileage: number;     // 里程
  createTime: number;  // 创建时间戳
}
```

```json
// ES mapping：不仅定义类型，还定义「怎么搜」
{
  "mappings": {
    "properties": {
      "asset_no":      { "type": "keyword" },   // keyword=整串精确匹配，不分词
      "address":     { "type": "text" },      // text=全文检索，会分词
      "mileage":     { "type": "long" },      // 数字类型
      "create_time": { "type": "date" }       // 时间类型，能按范围查
    }
  }
}
```

mapping 里最关键的是 `text` 和 `keyword` 的区别：

| 类型 | 是否分词 | 适用字段 | 搜索行为 |
|------|---------|---------|---------|
| `text` | 是 | 地址、备注、描述 | 「上海普陀」拆成「上海」「普陀」分别建索引 |
| `keyword` | 否 | 资产编号号、ID、状态枚举 | 整串作为一个 term，要么全等要么不匹配 |

---

# 五、demo 实战：订单与车务的 ES 搜索

demo 里 ES 是由 **demo-core（老的 PHP 系统）** 统一维护的，其他 Java 服务（如 `demo-asset` 车务）通过 **Feign 调用 search-service 的搜索接口**来用 ES，自己并不直接连 ES。这是个很真实的架构——历史系统沉淀了 ES 能力，新服务复用它。

## 5.1 Feign 客户端：暴露 search-service 的 ES 搜索能力

匿名化示例代码见 `demo-asset/.../client/search/SearchServiceClient.java`：

```java
@FeignClient(contextId = "tmsSearchClient", name = "demo-core-sidecar",
        configuration = SpringFormEncoder.class)
public interface SearchServiceClient {

    /**
     * ES 查询通用搜索接口
     * 调用 search-service 的 plainSearch，底层走 Elasticsearch
     *
     * @param req 搜索请求参数（fields/data_name/filter/query/sort/page）
     * @return 命中的文档列表，每个文档是一个 Map
     */
    @PostMapping(value = "/api/Table/Search/searchDocuments",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    DemoCommonRespDTO<List<Map<String, Object>>> searchDocuments(SearchRequestDTO req);
}
```

注意返回值是 `List<Map<String, Object>>`——因为 ES 返回的是动态 JSON 文档，字段不固定，所以用 `Map` 接最灵活（前端同学想想 `Record<string, any>`）。

## 5.2 搜索请求参数：ES 查询的「四件套」

demo 用一个 DTO 封装 ES 搜索参数，见 `client/search/dto/req/BatchEsSearchInDTO.java`：

```java
@Data
public class BatchEsSearchInDTO {
    private String[] fields;                // 要返回哪些字段（≈ SQL 的 SELECT 列）
    private String dataName;                // 搜哪个 index，如 "AssetRecord"
    private Map<String, Object> filter;     // 过滤条件（不打分，只筛选）
    private Map<String, Object> query;      // 查询条件（参与相关性打分）
    private Map<String, String> sort;       // 排序
    private Integer pageNum;                // 页码
    private Integer pageSize;               // 每页大小，默认 1000
}
```

**filter vs query 是 ES 的精髓**，前端同学重点理解：

| | filter（过滤） | query（查询） |
|--|--------------|--------------|
| 作用 | 「符不符合」的硬条件 | 「相不相关」的软匹配 |
| 是否打分 | 不打分（yes/no） | 打分（算 score） |
| 例子 | `status = 1`、`group_id = 100` | 全文搜「上海加油站」 |
| 类比 | `Array.filter()` 布尔判断 | 搜索引擎的相关性排序 |
| 性能 | 可缓存，更快 | 要算分，略慢 |

经验法则：**精确的、枚举的、范围的条件放 filter；用户输入的全文关键词放 query。**

## 5.3 示例业务代码：资产操作记录的 ES 搜索

看 `service/assetRecord/AssetRecordService.java` 怎么拼这个请求（已精简，保留核心逻辑）：

```java
// 定义需要从搜索结果中提取的字段（≈ SQL SELECT 的列清单）
String[] fields = new String[] {
        "uuid", "id", "asset_id", "asset_no", "asset_no_ext", "mileage", "oil_ele_num",
        "use_record_type", "operator", "create_time", "address", "audit_state", "record_user_name"
};

// 构建过滤条件 Map：放「硬性筛选」条件，不参与打分
Map<String, Object> filterMap = Maps.newHashMap();
if (reqMap.containsKey("filter")) {
    filterMap.putAll((Map<String, Object>) reqMap.get("filter"));
}

// 构建查询条件 Map：注入数据权限隔离条件
Map<String, Object> queryMap = Maps.newHashMap();
// group_id 做租户隔离——只搜当前用户所属租户的数据，这是多租户系统的安全底线
queryMap.put("group_id", userContext.getGroupId());
queryMap.put("status", 1); // status=1 表示有效记录，过滤掉已删除的
if (reqMap.containsKey("query")) {
    queryMap.putAll((Map<String, Object>) reqMap.get("query"));
}

// 组装最终发给 ES 的请求体
Map<String, Object> baseSearchReq = Maps.newHashMap();
baseSearchReq.put("fields", Arrays.asList(fields));
baseSearchReq.put("data_name", "AssetRecord"); // 指定搜 AssetRecord 这个 index
baseSearchReq.put("filter", filterMap);
baseSearchReq.put("query", queryMap);

// 分页循环捞数据，直到捞空为止（导出场景常见，要把所有命中都拉下来）
do {
    baseSearchReq.put("page_num", pageNum);
    baseSearchReq.put("page_size", pageSize);
    // 调用 search-service 的 ES 搜索，底层走 Elasticsearch
    List<Map<String, Object>> plainSearch = searchManager.plainSearch(baseSearchReq);
    if (plainSearch == null || plainSearch.isEmpty()) {
        break; // 没有更多数据了，退出分页循环
    }
    // 把 ES 返回的动态 Map 手动映射成强类型 DTO（见第 6 课 Map 用法、第 5 课对象）
    // ... 映射逻辑略
} while (/* 还有下一页 */ true);
```

这段代码有几个**工程细节**值得注意：

1. **租户隔离写在 query 里**：`group_id` 强制注入，前端传什么都改不了——后端兜底的安全设计，永远不要相信前端传的范围。
2. **`Map<String, Object>` 接 ES 结果**：ES 文档是动态的，用 Map 最灵活，再手动转成 DTO（强类型）给上层用。
3. **分页 do-while 循环**：导出场景要拉全量，所以一页页捞直到空。注意 `pageSize` 默认 1000，比 MySQL 分页大得多——因为 ES 扛得住。

## 5.4 另一个典型场景：海量日志检索

demo 里订单系统（`demo-order-cost`）在 `infra/elasticsearch/index` 和 `repository` 下预留了 ES 模块的包结构（目前只有 `package-info.java` 占位，还没填充实现），为后续订单和日志检索留好了位置。下面这个日志场景就是 ES 的典型用武之地：

```
日志场景为什么必须用 ES？
  ┌────────────────────────────────────────┐
  │ 每天产生千万级订单操作日志              │
  │ 运维要查「昨天 14:00-15:00 订单 X 的    │
  │         所有状态变更，含错误关键词」    │
  └────────────────────────────────────────┘
            │
   MySQL：千万行 LIKE 扫描 → 几十秒甚至超时 ✗
   ES：  倒排索引 + 时间范围 filter → 毫秒级 ✓
```

日志写进 MySQL 还要占业务库资源、影响主库性能；写进 ES 则天生适合「大量写入 + 灵活检索 + 时间范围过滤」。

---

# 六、一个完整查询长什么样？

把前面的概念串起来，一个发给 ES 的查询 JSON（概念示意）：

```json
{
  "data_name": "AssetRecord",
  "fields": ["asset_no", "address", "create_time"],
  "filter": {
    "group_id": 100,
    "status": 1
  },
  "query": {
    "address": "上海加油站"
  },
  "sort": { "create_time": "desc" },
  "page_num": 1,
  "page_size": 20
}
```

ES 的处理流程：

```
1. filter 阶段：先用 group_id=100 + status=1 把候选集缩小
                （不打分，纯筛选，可缓存，飞快）
        │
2. query 阶段：在候选集里对 address 做分词匹配「上海」「加油站」
                每条命中算一个 score（越相关分越高）
        │
3. sort 阶段： 按 create_time 倒序（覆盖默认的 score 排序）
        │
4. page 阶段： 取第 1 页 20 条返回
```

---

# 七、什么时候用 ES，什么时候不用？

别把 ES 当万能药。给个判断清单：

| 场景 | 用什么 | 原因 |
|------|-------|------|
| 全文搜索框、模糊关键词 | ES | 倒排索引 + 分词 |
| 海量日志检索、时间范围过滤 | ES | 写入快、范围查快 |
| 复杂筛选 + 排序 + 聚合统计 | ES | 自带聚合，比 SQL 灵活 |
| 下单、改记录等事务操作 | MySQL | ES 不保证强一致和事务 |
| 精确主键查询（按 id 取一条） | MySQL | 没必要绕 ES |
| 多表 JOIN 关联 | MySQL | ES 不擅长 JOIN |

核心原则：**ES 是 MySQL 的「搜索加速副本」，不是替代品。** 数据的「家」永远在 MySQL，ES 只是为了搜得快而存的一份冗余。

---

# 八、本课小结

- **为什么不用 MySQL 搜**：`LIKE '%x%'` 用不上索引，是 O(n) 全表扫描；多字段、中文分词、相关性排序它都不擅长。
- **ES 是什么**：≈ 自己部署的搜索引擎，和 MySQL 是两套独立系统，靠数据同步保持一致。
- **倒排索引**：词 → 文档列表的映射（≈ JS 的 `Map<词, ID[]>`），把搜索的活儿在写入时提前算好，所以查得飞快。
- **三个核心名词**：index≈表、document≈行、mapping≈TS interface（且定义了字段是否分词）。`text` 分词做全文检索，`keyword` 不分词做精确匹配。
- **filter vs query**：filter 是「符不符合」的硬筛选（不打分、可缓存）；query 是「相不相关」的软匹配（打分排序）。精确条件放 filter，全文关键词放 query。
- **demo 实战**：`demo-asset` 通过 Feign 调 `SearchServiceClient.searchDocuments` 复用 search-service 的 ES 能力，`BatchEsSearchInDTO` 封装四件套参数，`AssetRecordService` 拼请求时强制注入 `group_id` 做租户隔离，用 `Map<String, Object>` 接动态文档再转 DTO。

> **下一课预告**：第 28 课《消息队列 MQ》——数据写完 MySQL，怎么异步同步到 ES？怎么让下单后「发短信、扣库存、记日志」互不阻塞？我们将用 demo 里的真实 MQ 场景，讲清楚消息队列这个全栈工程师绕不开的「异步解耦神器」。

# 九、总结

- **核心概念：倒排索引（Inverted Index）**：这是 ES 快的根本原因，也是面试必问。
- **三个核心名词：index / document / mapping**：ES 的数据模型和 MySQL 有清晰的对应关系，前端同学对照着记最快：
- **先问一个问题：为什么不用 MySQL 搜？**：你在前端肯定遇到过这种需求：一个搜索框，用户随便输点啥，要从几百万条订单 / 资产操作记录里「模糊地、跨字段地、还要分页排序地」捞出结果。
- **ES 到底是什么？**：你可以把 Elasticsearch 想象成「自己部署的一个百度 / Google」：
