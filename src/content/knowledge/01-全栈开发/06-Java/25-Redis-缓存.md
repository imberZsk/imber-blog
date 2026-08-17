# Java（25） - Redis 缓存

> 读完后，你应能完成以下任务：
> - 绘制“Java（25） - Redis 缓存 / 为什么要用缓存”的关键对象与数据流，解释“MySQL 是基于磁盘的数据库，一次查询要经过：解析 SQL → 查索引 → 读磁盘 → 返回。”，并用源码位置、日志或 Trace 标注证据。
> - 为“Java（25） - Redis 缓存 / 前端类比”设计正常与异常输入，验证“一句话记住：Redis ≈ 后端版的本地缓存，但它是所有服务器实例共享的、独立部署的一台内存数据库。”，输出首个偏差位置与回归测试结果。
> - 实现“Java（25） - Redis 缓存 / Redis 的五种常见数据结构”的最小代码或配置，检验“Redis 不是简单的 key-value 字符串库，它的 value 支持多种数据结构。”，输出命令、结果与 Diff，并说明不适用边界。

> 数据库是仓库，Redis 是货架——把高频访问的数据放到内存里，让请求不必每次都跑去仓库翻找。

前端开发里你早就用过缓存了：`localStorage` 存登录态、Vuex/Pinia 缓存接口数据、`computed` 缓存计算结果、HTTP 缓存避免重复下载。但这些缓存有个共同特点——**只活在当前用户的浏览器里**。换台设备、换个标签页（部分情况）就没了。

后端的 Redis 解决的是同一个问题，但场景不一样：**多台服务器要共享同一份缓存**。这一课我们就来看清楚 Redis 在 Java 后端里到底怎么用。

---

# 一、为什么要用缓存

先看第 04 课讲过的请求五站链路：

```text
网关 → Controller → Service → Mapper → MySQL
```

每个请求最终都要落到 MySQL。MySQL 是基于磁盘的数据库，一次查询要经过：解析 SQL → 查索引 → 读磁盘 → 返回。在高并发下，数据库很容易成为瓶颈。

缓存的核心思路：**把读多写少、计算昂贵的数据，提前放到内存里**。

| 数据来源 | 读取速度（量级） | 类比 |
|---------|----------------|------|
| MySQL（磁盘） | 毫秒级 | 去仓库翻箱子 |
| Redis（内存） | 微秒级 | 伸手从货架上拿 |

差距大概是 **几十到上百倍**。所以缓存适合这些场景：

- **不常变但常被读**：字典配置、省份平台配置、用户权限
- **计算/调用昂贵**：第三方接口返回的 token（见下文 demo 匿名化案例）
- **临时状态**：验证码、登录 session、限流计数器、分布式序号

## 1.1 前端类比

| 前端缓存 | 后端 Redis | 关键区别 |
|---------|-----------|---------|
| `localStorage` / `sessionStorage` | Redis String | localStorage 只在单个浏览器，Redis 所有服务器共享 |
| Pinia / Vuex store | Redis（共享态） | store 刷新页面就没了，Redis 持久存在 |
| `computed` 缓存计算结果 | 缓存昂贵计算/接口结果 | 思路一样：算一次，存起来反复用 |
| 浏览器 HTTP 缓存 | Redis 缓存接口数据 | 都靠"过期时间"控制新鲜度 |

> **一句话记住**：Redis ≈ 后端版的本地缓存，但它是**所有服务器实例共享的、独立部署的一台内存数据库**。

为什么必须"共享"这么重要？因为生产环境的后端服务不是一台机器。比如 demo-basic 这个服务会同时部署好几个实例，请求被负载均衡随机分到不同实例上。如果缓存放在每个实例自己的内存里（像 JVM 里的一个 `Map`），那 A 实例缓存的数据 B 实例看不到，数据就不一致了。Redis 作为**独立的一台中心化内存库**，所有实例都连它，自然就共享了。

```text
        ┌──────────────┐
        │  负载均衡器   │
        └──────┬───────┘
       ┌───────┼───────┐
       ▼       ▼       ▼
   ┌──────┐┌──────┐┌──────┐
   │实例A ││实例B ││实例C │   ← 三个 Java 进程
   └───┬──┘└───┬──┘└───┬──┘
       └───────┼───────┘
               ▼
        ┌─────────────┐
        │    Redis    │   ← 共享的内存数据库，大家都连它
        └─────────────┘
```

---

# 二、Redis 的五种常见数据结构

Redis 不是简单的 key-value 字符串库，它的 value 支持多种数据结构。这点和前端的数据结构能一一对上：

| Redis 类型 | 结构 | 前端类比 | 典型用途 |
|-----------|------|---------|---------|
| **String** | 一个字符串/数字 | JS 的 `string` / `number` | token、验证码、序号计数、缓存 JSON |
| **Hash** | 字段-值的映射 | JS 的 `object` `{ field: value }` | 存一个对象的多个字段，可单独改某字段 |
| **List** | 有序可重复列表 | JS 的 `Array`（两端可进出） | 消息队列、最新N条记录 |
| **Set** | 无序不重复集合 | JS 的 `Set` | 去重、标签、共同好友 |
| **ZSet** | 带分数的有序集合 | 没有直接对应（≈带权重排序的 Set） | 排行榜、延迟队列、按分数范围查 |

在 Java 里，通过 `StringRedisTemplate` 操作这些结构，每种结构对应一组 `opsForXxx()` 方法：

```java
// Spring 注入 Redis 操作模板（专门处理 String 类型的 key/value）
@Autowired
private StringRedisTemplate redisTemplate;

// String 操作：opsForValue()
redisTemplate.opsForValue().set("key", "value");           // SET key value
String v = redisTemplate.opsForValue().get("key");         // GET key
redisTemplate.opsForValue().increment("counter");          // INCR counter（原子自增）

// Hash 操作：opsForHash()
redisTemplate.opsForHash().put("user:1", "name", "张三");   // HSET user:1 name 张三
Object name = redisTemplate.opsForHash().get("user:1", "name");

// List 操作：opsForList()
redisTemplate.opsForList().leftPush("queue", "task1");     // LPUSH 左侧入队
String task = redisTemplate.opsForList().rightPop("queue"); // RPOP 右侧出队

// Set 操作：opsForSet()
redisTemplate.opsForSet().add("tags", "java", "redis");    // SADD 添加（自动去重）

// ZSet 操作：opsForZSet()（score 是排序用的分数）
redisTemplate.opsForZSet().add("rank", "playerA", 100);    // ZADD rank 100 playerA
```

> **类比映射记忆法**：把 `opsForValue` 想成操作 `string`，`opsForHash` 想成操作 `object`，`opsForList` 想成操作两端可进出的 `Array`，`opsForSet` 想成操作 `Set`。前端的数据结构知识基本能平移过来。

## 2.1 demo 匿名化案例：用 String 的 INCR 生成业务序号

demo-asset 里生成单号序号，用的就是 String 的原子自增能力。看 `SequenceManager.java`：

```java
// 文件：demo-asset/.../manager/common/SequenceManager.java
// 在 redis 中生成并递增序号（每天一个独立的计数器）
private Long generateAndIncSeqInRedis(String redisKey) {
    // INCR：原子自增。即使多个实例同时调用，也不会拿到重复的序号
    Long increment = redisTemplate.opsForValue().increment(redisKey);
    // getExpire 返回 -1 表示这个 key 还没设置过期时间（即刚被 INCR 创建出来）
    if (redisTemplate.getExpire(redisKey) == -1) {
        // 给序号 key 设一天过期，第二天自然从 1 重新开始计数
        redisTemplate.expire(redisKey, 1L, TimeUnit.DAYS);
    }
    return increment;
}
```

这里的 `redisKey` 由 `固定前缀_类型_日期_集团_网点` 拼出来（见同文件 `generateAndIncSeqInRedisInOrganization`：`KEY_PREFIX + type + "_" + 日期 + "_" + groupId + "_" + organizationId`），日期一变 key 就变，所以**每个网点每天有独立的计数器**。

为什么不用数据库的自增 ID 或 `SELECT MAX(num)+1`？因为高并发下数据库自增会有锁竞争和回表查询，而 Redis 的 `INCR` 是**单线程原子操作**，天然不会有两个请求拿到同一个序号——这正是前端做不到、必须靠共享中心存储才能保证的事。

---

# 三、缓存读写模式：Cache Aside（旁路缓存）

这是最常用的缓存模式，几乎所有业务读取都用它。逻辑分两条路：

**读数据**：
```text
1. 先查 Redis
2. 命中（有数据）→ 直接返回   ← 大部分请求走这条，快
3. 未命中（没数据）→ 查数据库 → 写回 Redis → 返回
```

**写数据**：
```text
1. 更新数据库
2. 删除 Redis 里对应的缓存（不是改，是删）
```

ASCII 图解读流程：

```text
请求来了
   │
   ▼
┌─────────────┐   命中
│ 查 Redis ?  │ ───────► 返回缓存值（快路径）
└──────┬──────┘
       │ 未命中
       ▼
┌─────────────┐
│  查 MySQL   │
└──────┬──────┘
       ▼
┌─────────────┐
│ 写回 Redis  │ ──► 返回值（下次就走快路径了）
└─────────────┘
```

## 3.1 前端类比

这就是前端常写的"接口数据缓存"逻辑：

```typescript
// 前端伪代码：先看 store 有没有，没有才请求
async function getUser(id: string) {
  if (store.users[id]) return store.users[id]  // 命中缓存
  const user = await api.fetchUser(id)         // 未命中，请求
  store.users[id] = user                        // 写回缓存
  return user
}
```

Cache Aside 就是这套逻辑搬到后端、缓存换成 Redis。

## 3.2 demo 匿名化案例：第三方平台 token 缓存

demo-basic 里申请第三方"第三方平台数据上报 token"是个**昂贵的 HTTP 调用**，而且 token 有有效期，所以非常适合 Cache Aside。看 `PartnerTokenService.java`：

```java
// 文件：demo-basic/.../service/partner/impl/PartnerTokenService.java
@Autowired
private StringRedisTemplate redisTemplate;

// 第三方平台 token 缓存键前缀，从 Apollo 配置中心读取（见第 04 课提到的配置）
@Value("${demo.redis.key.partner.token:demo-basic_partner_token_}")
private String partnerTokenKey;

// 申请第三方平台数据上报 token
public String getToken(String customerName, PartnerCustomerConf.ProvinceInfo customerProvince,
                       PartnerProvincePlatConfig provincePlatConfig) throws IOException {
    // 缓存 key 用 客户名_省份 区分，不同省份平台 token 不同
    String key = partnerTokenKey + customerName + "_" + customerProvince.getProvince();

    // 第 1 步：先从缓存获取 token（快路径）
    String token = redisTemplate.opsForValue().get(key);
    if (Objects.nonNull(token)) {
        return token;  // 命中缓存，直接返回，省掉一次 HTTP 调用
    }

    // 第 2 步：未命中 → 调用第三方接口换取 token（慢路径）
    TokenReq req = TokenReqFactory.getTokenReq(customerProvince);
    String tokenResult = HttpUtil.post(provincePlatConfig.getAuthUrl(), JSON.toJSONString(req));
    token = analysisResult(tokenResult, provincePlatConfig);

    // 第 3 步：写回 Redis，并设置过期时间
    if (StringUtils.isNotEmpty(token)) {
        // 关键参数 PARTNER_TOKEN_EXP：过期分钟数。必须小于 token 真实有效期，
        // 否则缓存里的 token 还在、第三方那边却已失效，请求就会报错
        redisTemplate.opsForValue().set(key, token, RedisKeyConstant.PARTNER_TOKEN_EXP, TimeUnit.MINUTES);
    }
    return token;
}
```

这段代码就是教科书级的 Cache Aside：**先查缓存 → 未命中调接口 → 写回缓存并设过期**。它把一个昂贵的 HTTP 调用，变成了大部分时候只读一次 Redis。

## 3.3 一个易踩的坑：写数据为什么是"删缓存"不是"改缓存"？

更新时直接删掉缓存，下次读自然会从数据库加载最新值写回。如果选择"改缓存"，在并发下容易出现新旧值覆盖错乱（A 改了 DB 还没改缓存，B 又改了 DB 改了缓存，A 再改缓存把旧值写回去）。**删除是更安全的选择**，让缓存"失效"比让缓存"强行同步"简单可靠得多。

---

# 四、缓存三大经典问题：穿透 / 击穿 / 雪崩

这三个词面试必考，业务里也常见。名字容易混，用一张表先分清：

| 问题 | 一句话定义 | 形象比喻 |
|------|----------|---------|
| **穿透** | 查一个**根本不存在**的数据，缓存和库都没有，每次都打到库 | 有人专门来查仓库里压根没有的货号 |
| **击穿** | 某个**热点 key 突然过期**，海量请求同时穿过缓存打到库 | 货架上唯一的爆款被拿空那一刻，所有人涌向仓库 |
| **雪崩** | **大量 key 同时过期**（或 Redis 宕机），请求集体压垮库 | 整个货架的货同时到期下架，全部涌向仓库 |

## 4.1 缓存穿透（查不存在的数据）

**问题**：恶意请求一直查 `id = -1` 这种不存在的数据。缓存里没有 → 查库 → 库也没有 → 没东西可写回缓存 → 下次还是穿透。数据库被反复无效查询拖垮。

**对策**：

```java
// 对策一：把"空结果"也缓存起来（缓存空值）
Object data = redisTemplate.opsForValue().get(key);
if (data != null) {
    return data;  // 命中（包括命中"空值标记"）
}
data = queryFromDb(id);
if (data == null) {
    // 查库也没有 → 缓存一个空值标记，并设较短过期（比如 60 秒）
    // WHY：避免同一个不存在的 key 反复穿透到数据库
    redisTemplate.opsForValue().set(key, "NULL", 60, TimeUnit.SECONDS);
    return null;
}
redisTemplate.opsForValue().set(key, data, 30, TimeUnit.MINUTES);
return data;
```

- **缓存空值**：查不到就缓存一个空标记，挡住后续相同查询（如上）。
- **布隆过滤器（Bloom Filter）**：在缓存前加一道"这个 key 可能存在吗"的快速判断，不存在的直接拒绝。前端类比：≈先用一个轻量判断快速 reject 掉明显非法的 id。

## 4.2 缓存击穿（热点 key 过期瞬间）

**问题**：某个超热门的 key（比如首页配置）过期的**那一瞬间**，成千上万请求同时发现缓存没了，一起冲去查库重建缓存。

**对策**：**加分布式锁**——只让第一个请求去查库重建缓存，其他请求等一下再读缓存。

demo-billing 里就有现成的分布式锁能力。看 `DistributedLockService.java`：

```java
// 文件：demo-billing/.../service/frame/common/impl/DistributedLockService.java
@Autowired
private RedisDistributedLockImpl redisDistributedLockImpl;

// 公共加锁方法：基于 Redis 实现的分布式锁
public Boolean lock(LockKeyEnum lockKeyEnum, String key) throws Exception {
    // 参数说明：key=锁的标识，lockKeyEnum.getExpire()=锁的过期时间（防止死锁），
    // 重试间隔 200ms。多个实例抢同一把锁，只有一个能拿到
    return redisDistributedLockImpl.lock(key, lockKeyEnum.getExpire(), 0, 200);
}
```

重建缓存时的典型用法：

```java
// 缓存击穿防护：重建缓存前先抢锁
if (lockService.lock(LockKeyEnum.XXX, key)) {       // 抢到锁的那个请求
    try {
        data = queryFromDb(id);                      // 只有它去查库
        redisTemplate.opsForValue().set(key, data);  // 重建缓存
    } finally {
        lockService.unLock(key);                     // 务必在 finally 里释放锁
    }
}
// 其他没抢到锁的请求：稍等后重新读缓存即可（此时缓存已被重建）
```

> 分布式锁是后端独有的概念，前端没有直接对应。可以理解为：多台服务器抢一把放在 Redis 上的"令牌"，谁拿到谁干活，避免重复劳动。

## 4.3 缓存雪崩（大量 key 同时失效）

**问题**：如果给一批缓存设了**完全相同**的过期时间，它们会在同一刻集体失效，瞬间全部请求压到数据库。或者 Redis 整个挂了，缓存全员失效。

**对策**：

- **过期时间加随机值**：别让大家同时到期。
  ```java
  // 基础 30 分钟 + 随机 0~5 分钟，把过期时间打散，避免同时失效
  int expire = 30 * 60 + new Random().nextInt(300);
  redisTemplate.opsForValue().set(key, data, expire, TimeUnit.SECONDS);
  ```
- **Redis 高可用**：主从 + 哨兵 / 集群，避免单点宕机（运维层面）。
- **服务降级/限流**：万一缓存全挂，限制打到数据库的流量，保护数据库不被压垮。

---

# 五、过期策略

缓存能"自动消失"靠的是过期时间（TTL）。设置方式在前面代码里反复出现：

```java
// 写入时直接带过期时间（最常用）
redisTemplate.opsForValue().set(key, value, 30, TimeUnit.MINUTES);

// 给已存在的 key 补设过期时间（见前面 SequenceManager 的例子）
redisTemplate.expire(key, 1L, TimeUnit.DAYS);

// 查询剩余存活时间：返回秒数，-1 表示永不过期，-2 表示 key 不存在
Long ttl = redisTemplate.getExpire(key);
```

Redis 内部怎么删过期 key？两种机制配合：

| 策略 | 机制 | 比喻 |
|------|------|------|
| **惰性删除** | 访问某个 key 时才检查它过没过期，过期了顺手删掉 | 用到时才发现东西坏了，扔掉 |
| **定期删除** | Redis 后台定时随机抽查一批 key，删掉其中过期的 | 定期巡检货架，清掉过期货 |

两者结合：既不会因为遍历所有 key 而卡顿，也不会让过期数据堆积太久。

另外，当内存满了，Redis 会按**淘汰策略**（如 `allkeys-lru`：淘汰最久没用的）主动腾空间。这部分通常由运维配置，了解即可。

> **前端类比**：浏览器 HTTP 缓存的 `max-age`、`localStorage` 里你自己存的 `expireAt` 时间戳——都是同一个思想：给缓存数据贴个"保质期"，过期就别用了。

---

# 六、本课小结

- **为什么用缓存**：MySQL 走磁盘（毫秒级），Redis 走内存（微秒级），把读多写少/计算昂贵的数据放 Redis，扛住高并发。
- **Redis ≈ 共享版的本地缓存**：和 `localStorage`/Pinia 思路一致，但它是独立部署、所有服务器实例共享的中心化内存库，解决多实例数据一致问题。
- **五种数据结构**：String(`opsForValue`)、Hash(`opsForHash`≈object)、List(`opsForList`)、Set(`opsForSet`)、ZSet(`opsForZSet`)，前端数据结构知识基本能平移。
- **Cache Aside 模式**：读"先缓存后数据库再写回"，写"先更库再删缓存"。demo 第三方平台 token 缓存是标准范例。
- **三大问题**：穿透（查不存在→缓存空值/布隆过滤器）、击穿（热点过期→分布式锁，demo-billing 有现成实现）、雪崩（集体过期→过期时间加随机值+高可用）。
- **过期策略**：TTL + 惰性删除 + 定期删除 + 内存淘汰策略，思想等同于 HTTP 缓存的 `max-age`。
- **demo 匿名化示例代码**：`SequenceManager`（String 的 INCR 生成业务序号）、`PartnerTokenService`（Cache Aside 缓存第三方 token）、`DistributedLockService`（Redis 分布式锁防击穿）。

**下一课预告**：第 26 课《消息队列入门》——我们会看后端如何用消息队列（如 RocketMQ/Kafka）做异步解耦和削峰填谷，前端类比是 EventBus 和事件队列，再结合 demo 示例的消息发送场景讲清楚"为什么有些事不立即做、而是丢进队列慢慢做"。

# 七、总结

- **为什么要用缓存**：MySQL 是基于磁盘的数据库，一次查询要经过：解析 SQL → 查索引 → 读磁盘 → 返回。
- **Redis 的五种常见数据结构**：Redis 不是简单的 key-value 字符串库，它的 value 支持多种数据结构。
- **缓存读写模式：Cache Aside（旁路缓存）**：这是最常用的缓存模式，几乎所有业务读取都用它。
- **缓存三大经典问题：穿透 / 击穿 / 雪崩**：缓存里没有 → 查库 → 库也没有 → 没东西可写回缓存 → 下次还是穿透。
- **过期策略**：缓存能"自动消失"靠的是过期时间（TTL）。
- **本课小结**：Redis ≈ 共享版的本地缓存：和 localStorage/Pinia 思路一致，但它是独立部署、所有服务器实例共享的中心化内存库，解决多实例数据一致问题。

## 参考资料

- [Dev.java 学习路径](https://dev.java/learn/)
- [Spring Boot 文档](https://docs.spring.io/spring-boot/)
