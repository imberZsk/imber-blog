# 第 31 课：实战——给现有接口加 Redis 缓存

> 接口慢了不一定要优化 SQL，先想想：这个数据是不是「读多写少」？如果是，加一层缓存往往是性价比最高的提速手段。这一课我们给第 30 课的接口加 Redis 缓存，并对比加缓存前后的差别。

---

## 一、先回顾：为什么要缓存

前端同学对「缓存」其实非常熟悉。你在 React 里用过的这些，本质都是缓存：

| 前端场景 | 缓存在哪 | 解决什么 |
|---------|---------|---------|
| `React.useMemo` / `useCallback` | 组件内存 | 避免重复计算 |
| `react-query` / `SWR` 的 `staleTime` | 浏览器内存 | 避免重复请求后端 |
| `localStorage` 存用户配置 | 浏览器磁盘 | 避免重复登录/拉配置 |
| HTTP `Cache-Control` 响应头 | 浏览器 + CDN | 避免重复下载静态资源 |

后端的 Redis 缓存，思路一模一样：**把「查一次很贵、但一段时间内不怎么变」的数据，放到一个读取极快的地方（Redis 内存），下次直接拿，不去查数据库。**

```
没有缓存：每次请求都打到 MySQL
  请求 ──→ Controller ──→ Service ──→ Mapper ──→ MySQL（慢，磁盘 IO）

有了缓存：第一次查库并写入 Redis，后续直接读 Redis
  请求 ──→ Controller ──→ Service ──→ Redis（快，纯内存）
                                  └──(没命中)──→ MySQL ──→ 写回 Redis
```

**Redis 是什么？** 你可以先粗暴地理解为：**一个跑在服务器上的、超大号的、所有 Java 进程共享的 `Map<String, String>`**，数据存在内存里所以读写极快（微秒级），而且支持给每个 key 设过期时间。和前端 `localStorage` 最大的区别是：localStorage 是「每个浏览器各存各的」，Redis 是「整个后端集群共享同一份」。

---

## 二、Cache Aside 模式：业界最常用的缓存套路

加缓存有好几种模式，最常用、也最容易理解的叫 **Cache Aside（旁路缓存）**。名字唬人，逻辑特别简单，分「读」和「写」两条线。

### 读流程（查询时）

```
        ┌─────────────┐
        │  查 Redis   │
        └──────┬──────┘
               │
        命中？ │
       ┌───────┴───────┐
       │ 是            │ 否（没命中 / 过期了）
       ▼               ▼
  直接返回缓存    ┌──────────┐
                  │ 查 MySQL │
                  └────┬─────┘
                       │
                       ▼
                ┌──────────────┐
                │ 写回 Redis   │（顺便设过期时间）
                └──────┬───────┘
                       ▼
                    返回数据
```

一句话：**先查缓存，命中就返回；没命中就查库，查完写回缓存。**

这跟你用 `react-query` 的心智模型几乎一样：

```ts
// 前端 react-query 的伪逻辑
const data = cache.get(key)          // 先看缓存
if (data && !isStale(data)) return data   // 命中且没过期，直接用
const fresh = await fetchFromServer() // 没命中，发请求
cache.set(key, fresh)                 // 写回缓存
return fresh
```

### 写流程（更新时）—— 关键是「删缓存」而不是「改缓存」

```
  更新数据 ──→ 写 MySQL ──→ 删除 Redis 里的对应 key
```

**注意：更新时是「删除缓存」，不是「更新缓存」。** 这是 Cache Aside 的精髓，很多人第一次会写错。

为什么删而不是改？

| 做法 | 问题 |
|------|------|
| 写库后**更新**缓存 | 1）你得把新值算出来再写进去，多写代码；2）两个请求并发更新时，缓存可能被写成旧值（时序问题）；3）有些数据查出来要拼装/转换，更新缓存等于把逻辑写两遍 |
| 写库后**删除**缓存（推荐） | 简单。删掉后，下次读自然会触发「查库 → 写回」，缓存里永远是最新的。"懒加载" 思路 |

> 前端类比：就像你改了后端数据后，调用 `queryClient.invalidateQueries(key)` 让缓存失效，而不是手动 `queryClient.setQueryData(key, 新值)`。失效（删除）比手动塞值更不容易出错。

---

## 三、cyt 真实案例：车线标准路线的坐标点缓存

cyt 的 `LineStdRouteService`（文件：`cyt-basic/cyt-basic-service/src/main/java/com/huoyunren/cyt/basic/service/service/LineStdRouteService.java`）缓存的是「一条标准路线的坐标点列表」——这种数据典型的「读多写少」：路线一旦画好很少改，但每次司机导航、运单展示都要读。

它的**读流程**是教科书级的 Cache Aside（下面 3.2 细看）；但**写流程**用的是「更新缓存」而不是「删除缓存」，和第二节讲的标准做法不一样——这恰恰是个真实世界的取舍点，我们在 3.3 专门拆解。

我们把它的核心代码拆开看。

### 3.1 三个关键常量：key 前缀、过期时间

```java
@Service
@Slf4j
public class LineStdRouteService {

    // 缓存 key 的前缀，最终 key 形如 "line:std_route:points:1001"
    private static final String CACHE_KEY_PREFIX = "line:std_route:points:";

    // 缓存过期时间：1 小时。Duration 是 Java 8 的时间段类型，比裸数字 + TimeUnit 更易读
    private static final Duration LINE_STD_CACHE_EXPIRED_TIME = Duration.ofHours(1);

    // StringRedisTemplate：Spring 提供的操作 Redis 的工具，专门处理「key 和 value 都是 String」的场景
    private StringRedisTemplate redis;
```

### 3.2 读：编排方法 + 三个小方法

cyt 把读流程拆成了一个「编排方法」和三个「干活的小方法」，可读性极高，几乎就是把上面那张流程图翻译成了代码：

```java
// 编排方法：Cache Aside 读流程的「总指挥」
// 入参 routeId：标准路线 ID，也是缓存 key 的业务标识
private List<Coord> findRoutePoints(Integer routeId) {
    // 第一步：先查缓存
    List<Coord> points = findRoutePointsFromCache(routeId);

    // 分支：缓存没命中（null 表示 Redis 里没有这个 key）
    if (points == null) {
        points = findRoutePointsFromDB(routeId); // 第二步：查数据库
        cachePoints(routeId, points);            // 第三步：写回缓存
    }

    return points;
}
```

逐个看三个小方法：

```java
// 查缓存：命中返回坐标列表，没命中返回 null
@Nullable
private List<Coord> findRoutePointsFromCache(Integer routeId) {
    // 防御：routeId 为空直接返回空列表，避免拼出脏 key
    if (routeId == null) {
        return Collections.emptyList();
    }

    // 拼出完整 key，例如 "line:std_route:points:1001"
    String k = CACHE_KEY_PREFIX + routeId;
    // opsForValue() 操作「字符串类型」的值，.get(k) 相当于 redis 命令 GET k
    String v = redis.opsForValue().get(k);

    // 关键分支：v 为 null 说明缓存里没有，返回 null 让上层去查库
    if (v == null) {
        return null;
    }

    // 命中：把存储的字符串解码回坐标列表（cyt 用 coordEncoder 把坐标压成短字符串再存，省内存）
    return coordEncoder.decodes(v);
}
```

```java
// 查数据库：缓存没命中时的兜底数据源
private List<Coord> findRoutePointsFromDB(Integer routeId) {
    LineStdRoutePoint routePoint = routePointMapper.selectOneByStdRouteId(routeId, true);
    // 分支：库里也没有，返回空列表（注意不是 null，避免上层再判空）
    if (routePoint == null) {
        return Collections.emptyList();
    }
    return coordEncoder.decodes(routePoint.getPoints());
}
```

```java
// 写回缓存：查库之后把结果塞进 Redis，并设置过期时间
private void cachePoints(Integer routeId, List<Coord> points) {
    // 防御：参数为空就不缓存，避免缓存脏数据
    if (routeId == null || points == null) {
        return;
    }

    String k = CACHE_KEY_PREFIX + routeId;
    String v = coordEncoder.encodes(points); // 坐标列表编码成字符串

    // set(key, value, 过期时间)：相当于 redis 命令 SET k v EX 3600
    // 第三个参数传过期时间，1 小时后这个 key 自动消失，下次读会重新查库
    redis.opsForValue().set(k, v, LINE_STD_CACHE_EXPIRED_TIME);
}
```

这套拆法值得学：**编排方法只关心「流程」，小方法各管「查缓存 / 查库 / 写缓存」一件事。** 比把所有逻辑塞在一个方法里清晰得多。

### 3.3 写：cyt 这里用的是「更新缓存」而非「删缓存」

讲到这你可能以为 cyt 写流程就是「改库 → 删缓存」。但翻开真实代码，它走的是另一条路：**新增/更新路线时，顺手把新坐标点写回缓存。** 看 `create` 和 `update` 的尾巴都调了同一个 `cacheRoutePoints`：

```java
// 新增路线：插库 → 插轨迹点 → 写回缓存（注意：是 set，不是 delete）
private LineStdRoute create(LineStdRoute route) {
    routeMapper.insert(route);      // 写主表
    insertRoutePoint(route);        // 写轨迹点表
    cacheRoutePoints(route);        // 把新轨迹点更新进缓存
    return route;
}

// 写回缓存：把这条路线的坐标点编码后 set 进 Redis，并续上过期时间
private void cacheRoutePoints(LineStdRoute route) {
    String k = CACHE_KEY_PREFIX + route.getId();

    // 优先用 prepare() 阶段已经编码好的字符串，避免重复编码
    String v = route.getEncodedPoints();
    // 分支：还没编码过（理论上不该发生），兜底现编一次
    if (v == null) {
        v = coordEncoder.encodes(route.getPoints());
    }

    // set(key, value, 过期时间)：直接写新值，相当于 SET k v EX 3600
    redis.opsForValue().set(k, v, LINE_STD_CACHE_EXPIRED_TIME);
}
```

`update` 方法结尾同样调用 `cacheRoutePoints(newRoute)`。**全文件没有一处 `redis.delete`**——删除路线时，缓存不主动清理，靠那 1 小时过期时间自然消失。

为什么 cyt 敢这么写，而第二节又说推荐「删缓存」？这正好对照第二节那张表，把取舍讲透：

| | 第二节的「删缓存」（推荐默认） | cyt 这里的「更新缓存」 |
|---|---|---|
| 适用前提 | 通用场景，尤其是并发更新多 | 写入串行、且新值现成（`prepare` 阶段已编码好） |
| 好处 | 简单、不会写入旧值 | 写完立刻命中缓存，省掉「下次读再查库回填」那一跳 |
| 风险 | 下次读有一次回源 | 并发更新时可能把缓存写成旧值（时序问题） |

cyt 这个场景里，标准路线的新增/更新都在事务内串行执行、且新坐标点是当前请求算出来的，所以「更新缓存」的并发风险很低，换来的是写完即热、读路径更短。**这不是反例，而是「理解原理后按场景灵活选型」的真实案例。**

> 提醒：如果你拿不准，默认按第二节的「删缓存」写，最不容易出错。「更新缓存」要用得对，前提是你能确认写入是串行的、且新值就是最终值。cyt 删除路线时不清缓存、纯靠过期兜底，也是同样的权衡——能容忍最多 1 小时的旧数据。

---

## 四、给第 30 课的接口加缓存（前后对比）

第 30 课我们写了一个查询接口（这里以「根据公司 ID 查公司详情」为例，沿用第 04/05 课的 `CompanyService` 风格）。下面把它从「无缓存」改造成「Cache Aside」。

### 4.1 加缓存前

```java
@Service
public class CompanyService {

    @Autowired
    private CompanyMapper companyMapper;

    // 加缓存前：每次都查库
    // 入参 companyId：公司 ID
    public CompanyVo getById(Integer companyId) {
        Company company = companyMapper.selectById(companyId); // 每次都打 MySQL
        if (company == null) {
            throw new BusinessException("公司不存在"); // 见第 07 课异常处理
        }
        return CompanyVo.from(company);
    }
}
```

问题：公司信息属于「读多写少」（基本不改，但到处都要展示）。每次请求都查库，QPS 一高，MySQL 就成了瓶颈。

### 4.2 加缓存后

```java
@Service
@Slf4j
public class CompanyService {

    // 缓存 key 前缀，最终形如 "basic:company:info:1001"
    private static final String CACHE_KEY_PREFIX = "basic:company:info:";
    // 过期时间 30 分钟：兜底，万一漏删缓存，最多脏 30 分钟
    private static final Duration CACHE_EXPIRED = Duration.ofMinutes(30);

    @Autowired
    private CompanyMapper companyMapper;
    @Autowired
    private StringRedisTemplate redis; // 注入 Redis 操作工具，见第 05 课 @Autowired
    @Autowired
    private ObjectMapper objectMapper; // Jackson，用来把对象和 JSON 字符串互转

    // 加缓存后：Cache Aside 读流程
    // 入参 companyId：公司 ID，也是缓存 key 的业务标识
    public CompanyVo getById(Integer companyId) {
        String key = CACHE_KEY_PREFIX + companyId;

        // 第一步：先查缓存
        String cached = redis.opsForValue().get(key);
        // 分支：缓存命中，直接反序列化返回，不查库
        if (cached != null) {
            return parse(cached);
        }

        // 第二步：缓存没命中，查库
        Company company = companyMapper.selectById(companyId);
        if (company == null) {
            throw new BusinessException("公司不存在");
        }
        CompanyVo vo = CompanyVo.from(company);

        // 第三步：写回缓存，并设过期时间
        redis.opsForValue().set(key, toJson(vo), CACHE_EXPIRED);
        return vo;
    }

    // 更新公司信息：改库 → 删缓存
    // 入参 company：待更新的公司实体
    public void update(Company company) {
        companyMapper.updateById(company); // 先写库
        String key = CACHE_KEY_PREFIX + company.getId();
        redis.delete(key); // 再删缓存，下次读自动加载最新值
    }

    // 把 VO 序列化成 JSON 字符串存进 Redis（Redis 只认字符串）
    private String toJson(CompanyVo vo) {
        try {
            return objectMapper.writeValueAsString(vo);
        } catch (JsonProcessingException e) {
            throw new BusinessException("公司信息序列化失败");
        }
    }

    // 把 Redis 里的 JSON 字符串反序列化回 VO
    private CompanyVo parse(String json) {
        try {
            return objectMapper.readValue(json, CompanyVo.class);
        } catch (JsonProcessingException e) {
            throw new BusinessException("公司信息反序列化失败");
        }
    }
}
```

### 4.3 前后对比

| 维度 | 加缓存前 | 加缓存后 |
|------|---------|---------|
| 每次请求是否查库 | 是 | 仅首次/过期后查库，其余命中 Redis |
| 典型响应耗时 | 几毫秒~几十毫秒（看 SQL） | 命中时亚毫秒级（纯内存） |
| MySQL 压力 | 随 QPS 线性增长 | 大幅降低，缓存挡住绝大多数读 |
| 数据一致性 | 强一致（永远是库里最新） | 最终一致（更新后到下次读之间，有极短窗口可能是旧值） |
| 代码复杂度 | 低 | 略高（多了序列化、删缓存逻辑） |

**核心权衡：用「一点点数据延迟」换「大幅的性能提升」。** 所以缓存适合「读多写少 + 能容忍短暂不一致」的数据（公司信息、字典、配置、路线点），不适合「强一致要求」的数据（账户余额、库存扣减——那是另一套方案）。

---

## 五、缓存 key 设计与过期时间：两个最容易踩坑的点

### 5.1 key 设计：用「冒号分层 + 业务前缀」

看 cyt 的 key：`line:std_route:points:1001`，公司的：`basic:company:info:1001`。规律是：

```
业务域  :  实体     :  维度     :  业务ID
basic   :  company  :  info     :  1001
line    :  std_route:  points   :  1001
```

| 原则 | 说明 | 反例 |
|------|------|------|
| 加业务前缀 | Redis 全集群共享，前缀避免和别的模块撞 key | 直接用 `1001` 当 key（必撞） |
| 用冒号 `:` 分层 | Redis 客户端工具会按 `:` 折叠成树状，方便排查 | 用 `_` 或不分隔，一堆 key 平铺 |
| key 里带全业务标识 | 一个 key 对应一条明确数据 | key 里只有半个条件，导致不同数据共用一个 key |

> 前端类比：跟你给 `react-query` 设计 `queryKey` 一模一样——`['company', 'info', id]`。带上业务维度，保证不同数据不串。

### 5.2 过期时间：一定要设，且不要都设成一样

```java
// ✅ 永远带过期时间，这是兜底
redis.opsForValue().set(key, value, Duration.ofMinutes(30));

// ❌ 不设过期时间：万一某次漏删缓存，这条脏数据永远在 Redis 里出不去
redis.opsForValue().set(key, value);
```

为什么必须设过期时间？因为「改库 → 删缓存」万一删失败了（网络抖动、代码漏写），过期时间是最后一道防线——最坏情况也就脏 30 分钟，到点自动消失重新加载。

**进阶提醒——缓存雪崩：** 如果几千个 key 都设成「整 1 小时」过期，它们会在同一秒集体失效，那一瞬间所有请求全打到 MySQL，可能把库压垮。生产实践通常给过期时间**加一个随机抖动**：

```java
// 基础 30 分钟 + 0~5 分钟随机，错开过期时间，避免集体失效
long base = Duration.ofMinutes(30).getSeconds();
long jitter = ThreadLocalRandom.current().nextLong(0, 300); // 0~300 秒随机
redis.opsForValue().set(key, value, Duration.ofSeconds(base + jitter));
```

---

## 六、还要知道的两个坑（生产必遇）

| 问题 | 是什么 | 简单应对 |
|------|--------|---------|
| **缓存穿透** | 查一个**库里根本不存在**的 id，缓存永远不命中，每次都打库（常被恶意刷） | 库里没查到时，也缓存一个空值（设较短过期，如 1 分钟），下次直接挡掉 |
| **缓存击穿** | 某个**热点 key 突然过期**，瞬间大量请求同时查库 | 查库前加分布式锁，只放一个请求去查库回填，其余等待 |

这一课先建立 Cache Aside 的正确心智，这两个进阶问题知道名字和大致思路即可，真正落地时再深入。cyt 里也确实用到了分布式锁（`LockService`），属于后面的话题。

---

## 本课小结

- **缓存的本质**：把「读多写少、查一次贵」的数据放进 Redis（可理解为全后端共享的、带过期时间的超大 `Map<String,String>`），下次直接读，绕过 MySQL。
- **Cache Aside 读流程**：先查缓存 → 命中返回 → 没命中查库 → 写回缓存（带过期时间）。心智模型同前端 `react-query`。
- **Cache Aside 写流程**：**改库 → 删缓存**（删而不是改，顺序不能反）。类比前端的 `invalidateQueries`。
- **cyt 真实实践**：`LineStdRouteService` 的**读流程**是标准范本——拆成「编排方法 `findRoutePoints` + 查缓存/查库/写缓存三个小方法」，key 前缀 `line:std_route:points:`，过期 1 小时。它的**写流程**用的是「更新缓存」而非「删缓存」（删除路线则纯靠过期兜底），是「按场景灵活选型」的真实取舍，不是模板。
- **key 设计**：业务前缀 + 冒号分层 + 全业务标识，例如 `basic:company:info:1001`。
- **过期时间**：永远要设（兜底防漏删），且加随机抖动避免缓存雪崩。
- **性能权衡**：用「极短的数据延迟」换「大幅性能提升」，适合能容忍最终一致的数据，不适合余额/库存这类强一致场景。
- **进阶坑**：缓存穿透（缓存空值）、缓存击穿（加锁回填），先记住名字和思路。

**下一课预告**：第 32 课《实战——加缓存后的数据一致性陷阱》。这一课我们埋了好几个伏笔（先删还是后删、删失败怎么办、并发更新），下一课就来系统拆解「缓存与数据库如何保持一致」，并看 cyt 是怎么用分布式锁兜住这些坑的。
