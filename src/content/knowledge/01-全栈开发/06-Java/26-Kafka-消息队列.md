# Java（26） - Kafka 消息队列

> 读完后，你应能完成以下任务：
> - 绘制“Java（26） - Kafka 消息队列 / 为什么需要 MQ？从一个前端类比说起”的关键对象与数据流，解释“后端的 MQ 解决的是同一个问题，只是规模和约束不同。”，并用源码位置、日志或 Trace 标注证据。
> - 为“Java（26） - Kafka 消息队列 / MQ 的三大价值”设计正常与异常输入，验证“关键区别：前端 EventBus 是单页面、内存级、进程内的；”，输出首个偏差位置与回归测试结果。
> - 实现“Java（26） - Kafka 消息队列 / Kafka 的四个核心概念”的最小代码或配置，检验“并行消费：3 个分区可以让 3 个消费者实例同时干活，吞吐量翻 3 倍。 -> 顺序保证：Kafka 只保证同一个分区内消息有序，不保证跨分区有序。”，输出命令、结果与 Diff，并说明不适用边界。

> 当你在前端用 EventBus 解耦组件、用 `mitt` 发布订阅事件时，你已经懂了消息队列的精髓。Kafka 就是把这套"发布/订阅"模式搬到了分布式后端世界——跨服务、可持久化、能扛百万级吞吐。

---

# 一、为什么需要 MQ？从一个前端类比说起

在前端，假设"用户下单成功"后要做三件事：弹 toast、刷新购物车角标、上报埋点。最笨的写法是把三件事串在一起：

```js
// 前端：紧耦合写法，下单函数知道所有下游细节
async function onOrderSuccess(order) {
  showToast('下单成功')        // 关心 UI
  refreshCartBadge()           // 关心购物车
  reportAnalytics('order', order) // 关心埋点
}
```

问题很明显：下单逻辑被迫"认识"所有下游。后来加个"发优惠券"，又得改这个函数。于是你改用 EventBus：

```js
// 前端：用事件总线解耦，下单只管"广播"，谁关心谁自己订阅
eventBus.emit('order:success', order)

// 各个模块自己订阅，互不知晓
eventBus.on('order:success', showToast)
eventBus.on('order:success', refreshCartBadge)
eventBus.on('order:success', reportAnalytics)
```

后端的 MQ 解决的是同一个问题，只是规模和约束不同。

## 1.1 MQ 的三大价值

| 价值 | 前端类比 | 后端场景 |
| --- | --- | --- |
| **解耦** (Decoupling) | EventBus 让发送方不认识订阅方 | 下单服务发个消息就完事，不用调用通知/积分/风控服务 |
| **异步** (Async) | `emit` 后立刻返回，不等订阅方执行完 | 接口只写订单库 + 发消息就返回，慢操作丢给后台慢慢做 |
| **削峰** (Peak Shaving) | —（前端单机无此压力） | 秒杀瞬间 10 万请求，先堆进队列，消费端按自己节奏处理 |

```text
没有 MQ（同步串行，慢且耦合）：
  下单请求 ──> 写订单 ──> 调通知 ──> 调积分 ──> 调风控 ──> 返回
              （任何一步慢或挂，整个请求受拖累）

有 MQ（异步解耦，快且独立）：
  下单请求 ──> 写订单 ──> 发消息到 Kafka ──> 立即返回 ✅
                              │
                              ├──> 通知服务（自己消费）
                              ├──> 积分服务（自己消费）
                              └──> 风控服务（自己消费）
```

> 关键区别：前端 EventBus 是**单页面、内存级、进程内**的；Kafka 是**跨服务、磁盘持久化、可重放、分布式集群**的。EventBus 页面一刷新事件就没了；Kafka 的消息默认能在磁盘上存好几天，消费者宕机重启后还能接着消费。

---

# 二、Kafka 的四个核心概念

先建立一张和前端对照的总表，后面逐个拆解：

| Kafka 概念 | 一句话解释 | 前端类比 |
| --- | --- | --- |
| **Producer** 生产者 | 发消息的一方 | `eventBus.emit(...)` 的调用方 |
| **Consumer** 消费者 | 收消息的一方 | `eventBus.on(...)` 的回调 |
| **Topic** 主题 | 消息的分类频道 | `emit` 的第一个参数 `'order:success'`（事件名） |
| **Partition** 分区 | Topic 内部的并行分片 | —（EventBus 无对应，这是分布式特有） |

## 2.1 Topic：消息的"频道"

Topic 就是事件名。生产者把消息发到某个 Topic，订阅了该 Topic 的消费者就能收到。demo 里 Topic 名通常写在配置文件里（注意下面这种 `${...}` 占位符语法，见第 19 课配置管理）：

```java
// demo-payroll 匿名化示例代码：薪资计算消息的 Topic 从配置注入
// @Value 把配置文件 bus.kafka.producer.topic.demo_salary_driver 的值塞进 topic 变量
@Value("${bus.kafka.producer.topic.demo_salary_driver}")
private String topic; // topic 变量：存储"薪资计算任务"这个频道的名字
```

## 2.2 Partition：Topic 的并行分片（Kafka 性能的关键）

这是 EventBus 没有、必须重新理解的概念。一个 Topic 在物理上被切成多个 Partition（分区），消息实际是写进某个 Partition 的。

```text
Topic: demo_salary_driver
 ├── Partition 0:  [msg1] [msg4] [msg7] ...   ← 一个有序的追加日志
 ├── Partition 1:  [msg2] [msg5] [msg8] ...
 └── Partition 2:  [msg3] [msg6] [msg9] ...
```

为什么要分区？两个原因：

1. **并行消费**：3 个分区可以让 3 个消费者实例同时干活，吞吐量翻 3 倍。类比前端，相当于把一个大数组 `splitChunks` 成 3 份，开 3 个 Web Worker 并行处理。
2. **顺序保证**：Kafka 只保证**同一个分区内**消息有序，不保证跨分区有序。

那同一笔业务的消息怎么保证落到同一个分区、从而保证顺序？靠 **消息的 key**。相同 key 的消息会被路由到同一个分区。看 demo 的示例发送代码：

```java
// demo-messagechannel 匿名化示例代码 KafkaSendHandler.doExecute
// kafkaTemplate.send 三个参数：topic（频道）、key（路由键）、value（消息体）
// 这里用 toUser（接收人）当 key —— 同一个用户的消息永远进同一分区，保证对他而言有序
kafkaTemplate.send(payload.getTopic(),       // 第1参：发往哪个 Topic
                   payload.getToUser(),       // 第2参：key，决定落到哪个分区
                   JSON.toJSONString(payload)); // 第3参：消息体，序列化成 JSON 字符串
```

> 类比：如果 EventBus 的 `emit('order:success', order)` 能保证"同一个用户的事件按发送顺序触发回调"，那 key 就是这里的"用户 ID"。

## 2.3 Offset：消费进度的"书签"

每个分区里的消息有个递增编号叫 Offset（偏移量）。消费者记录自己"读到第几条了"，就像看视频记进度。消费者宕机重启后，从上次的 Offset 接着读，不会丢也不会从头重来。demo 发送成功的回调里就能拿到这三个定位信息：

```java
// demo-payroll 匿名化示例代码 SalaryPayrollBus，发送成功回调里打印消息的"坐标"
log.debug("sendSpCalcTaskMessage send success topic:{} partition:{} offset:{}",
    result.getRecordMetadata().topic(),     // 落到哪个 Topic
    result.getRecordMetadata().partition(), // 落到哪个分区
    result.getRecordMetadata().offset());   // 在该分区的第几条（书签位置）
```

---

# 三、demo 示例生产者：发一条薪资计算消息

demo-payroll（薪资服务）里有个典型的"算工资条"场景：用户点了"生成工资条"，接口不会傻等着把几万条工资算完——而是**发一条消息进 Kafka 就立即返回**，后台慢慢算。这就是前面说的"异步 + 削峰"。

先看消息体的设计（DTO，见第 05 课类与对象）：

```java
// demo-payroll 匿名化示例代码 SalaryCalcMessage：薪资计算任务的消息体
@Data            // Lombok 自动生成 getter/setter（见第 08 课注解）
@Builder         // 生成建造者模式，方便链式构造
public class SalaryCalcMessage implements Serializable { // 实现 Serializable 才能被序列化传输
    private static final long serialVersionUID = 1L;

    @JSONField(name = "data")        // @JSONField 指定序列化后的 JSON 字段名（如 createTime→create_time，下游按下划线约定解析）
    private Data data;               // data 变量：存储任务的核心业务数据

    @JSONField(name = "create_time")
    private String createTime;       // createTime 变量：存储消息创建时间

    // 内部类用 @Getter/@Setter/@Builder 组合（demo 原代码即如此，未用 @Data）
    @Getter @Setter @Builder
    public static class Data implements Serializable {
        private static final long serialVersionUID = 1L;
        @JSONField(name = "salary_task_id")
        private Long salaryTaskId;   // salaryTaskId 变量：存储薪资计算任务 ID
        @JSONField(name = "sp_id")
        private Long spId;           // spId 变量：存储工资单 ID
        @JSONField(name = "group_id")
        private Integer groupId;     // groupId 变量：存储集团 ID（多租户隔离用）
        // 注：原 DTO 还有 salaryItemBatchNumber（工资项导入批次号）字段，此处为聚焦核心省略
    }
}
```

> 前端类比：这个消息体就像你 `emit` 时传的 payload 对象，区别是它要跨进程传输，所以必须能被序列化成 JSON 字符串（`implements Serializable` + `@JSONField`），不能直接传内存引用。

再看真实的发送代码：

```java
// demo-payroll 匿名化示例代码 SalaryPayrollBus.sendSalaryCalcMessageV2
public void sendSalaryCalcMessageV2(SalaryCalcMessage salaryCalcMessage) {
    // 分支：topic 或 kafkaTemplate 没配置时直接跳过——兼容"未开启 MQ"的环境，避免空指针
    if (Objects.isNull(this.topic) || Objects.isNull(kafkaTemplate)) {
        return;
    }
    // kafkaTemplate.send 返回的是 ListenableFuture（异步 Future），发完不阻塞
    kafkaTemplate.send(topic, JSON.toJSONString(salaryCalcMessage)).addCallback(
        new ListenableFutureCallback<SendResult<String, String>>() {
            // 发送失败回调：记日志 + 发飞书告警，确保消息丢了有人知道
            @Override
            public void onFailure(@NonNull Throwable throwable) {
                log.error("sendSpCalcTaskMessage send fail {} {}", salaryCalcMessage, throwable);
                feiShuAlarmHelper.sendAlarm(/* 拼接告警文案 */);
            }
            // 发送成功回调：打印 topic/partition/offset 三件套
            @Override
            public void onSuccess(SendResult<String, String> result) {
                log.debug("...success topic:{} partition:{} offset:{}", /* ... */);
            }
        });
}
```

注意这里的异步回调模式，前端工程师应该非常眼熟：

| 前端 Promise | Kafka ListenableFuture |
| --- | --- |
| `promise.then(onSuccess)` | `future.addCallback(onSuccess)` |
| `promise.catch(onError)` | 回调里的 `onFailure` |
| `await` 后拿结果 | 同步等待 `future.get()`（一般不这么用，会阻塞） |

> `kafkaTemplate.send()` **不阻塞**主流程——和前端 `fetch()` 返回 Promise 一样，发出去就走，结果通过回调通知。这正是"接口快速返回"的关键。

---

# 四、demo 示例消费者：用 @KafkaListener 收消息

消息发出去了，谁来收？在 demo-messagechannel（消息中心）里，`@KafkaListener` 注解就是后端版的 `eventBus.on(...)`：

```java
// demo-messagechannel 匿名化示例代码 MsgPushConsumer：消息推送消费者
@Service
@Slf4j
@AllArgsConstructor
public class MsgPushConsumer {
    private MsgSendService msgPushService; // 真正干活的业务 Service（见第 04 课分层）

    /**
     * 消息处理：监听到消息后调用 Service 做推送
     * @param record 一条 Kafka 消息记录，含 topic/key/value 等
     */
    // @KafkaListener = 后端版的 eventBus.on
    // topics：监听哪个频道（从配置读，冒号后是默认空值）
    // groupId：消费者组 ID，决定"分摊还是广播"（见下方 4.1）
    @KafkaListener(topics = "${topics.demo_message_center_push:}", groupId = "demo_message_center_group")
    public void sendMsg(ConsumerRecord<String, String> record) {
        try {
            log.info("topic:{},value:{}", record.topic(), record.value());
            // record.value() 拿到消息体字符串，交给 Service 处理
            this.msgPushService.handle(record.value());
        } catch (Exception e) {
            // 分支：消费出错只记日志不抛出——避免一条坏消息卡死整个分区的消费
            log.error("消息推送错误 topic:{},value:{},error:{}", record.topic(), record.value(), e.getMessage());
        }
    }
}
```

对照一下发送和接收两端：

```text
[demo-payroll]                    [Kafka 集群]                  [消费方服务]
 SalaryPayrollBus
   kafkaTemplate.send(topic, json) ──>  Topic: xxx  ──────────────>  @KafkaListener 标注的方法
   （emit）                              [持久化存盘]                  sendMsg(record)
                                                                      （on 回调）
```

## 4.1 消费者组（Consumer Group）：分摊 vs 广播

`groupId` 是 EventBus 完全没有的概念，但极其重要。规则只有一条：

> **同一个 Topic 的消息，在同一个消费者组内只被消费一次（分摊）；不同组之间各收一份（广播）。**

```text
Topic: order_created（假设 3 个分区）

  消费者组 A = "积分服务"（3 个实例）
    ├─ 实例A1 ← Partition 0     这一组内部"分摊"：
    ├─ 实例A2 ← Partition 1     一条消息只被组里某一个实例处理
    └─ 实例A3 ← Partition 2

  消费者组 B = "通知服务"（1 个实例）
    └─ 实例B1 ← Partition 0,1,2  另一个组"独立"再收一份完整的消息
```

类比理解：

| 场景 | 前端类比 |
| --- | --- |
| 同组多实例（分摊） | 一个任务队列，多个 Worker 抢着干，每个任务只被一个 Worker 处理 |
| 不同组（广播） | 多个独立模块各自 `eventBus.on` 同一个事件，每个都会被触发 |

所以 demo 里 `groupId = "demo_message_center_group"` 意味着：消息中心可以部署多个实例做负载均衡（分摊消费），但它们共享一个组，一条消息不会被推送两次给用户。这正是分布式下"既要高可用、又不能重复处理"的解法。

---

# 五、demo 中的消息驱动场景全景

把前面的零件拼起来，demo 里典型的"消息驱动"链路长这样（以业务状态变更通知为例）：

```text
用户操作（如订单/运单状态变更）
      │
      ▼
[业务服务] 改完数据库后，发一条状态变更消息
      │  kafkaTemplate.send(topic, key=业务ID, json)
      ▼
┌─────────────── Kafka Topic ───────────────┐
│  按 key 路由到分区，持久化存盘，可重放      │
└────────────────────────────────────────────┘
      │
      ├─> [demo-messagechannel 消息中心] @KafkaListener
      │     └─> 走短信/微信/App Push 等渠道推给用户
      │
      ├─> [其他订阅方] 各自的消费者组，互不影响
      │
      └─> [demo-payroll 等] 异步算工资条、跑批等重活
```

demo 里把 MQ 用在这些地方（都符合"解耦/异步/削峰"三原则）：

| 场景 | 用 MQ 的理由 | 对应原则 |
| --- | --- | --- |
| 状态变更通知（订单/运单） | 业务服务不该认识"短信/微信/Push"怎么发 | 解耦 |
| 薪资工资条批量计算 | 几万条计算太慢，接口不能干等 | 异步 |
| 消息推送（短信/App） | 高峰期推送量大，需缓冲 | 削峰 |

---

# 六、避坑提示（前端思维容易踩的坑）

1. **消息可能重复消费**：网络抖动、消费者重启都可能导致同一条消息被处理两次。消费端要做**幂等**（比如先查"这个任务做过没"）。EventBus 在内存里不会重复，但 Kafka 会——这是分布式的代价。
2. **消息可能乱序**：只有同一分区内有序。要顺序就得给相关消息设相同的 key（回看 2.2 节 `payload.getToUser()` 当 key 的用法）。
3. **消费别抛异常上去**：看 demo 的 `MsgPushConsumer` 用 try-catch 把异常吞在日志里，就是怕一条坏消息（毒丸消息）反复重试、堵死整个分区。
4. **发送是异步的**：`send()` 返回就代表"发出去了"，不代表"对方收到了"。要确认就看回调（`onSuccess`/`onFailure`），别假设它同步成功。

---

# 七、本课小结

- **MQ 三大价值**：解耦（发送方不认识接收方）、异步（发完即返回）、削峰（队列缓冲流量），本质是 EventBus 发布订阅模式的分布式、可持久化升级版。
- **四个核心概念**：Producer 发、Consumer 收、Topic 是频道、Partition 是 Topic 内的并行分片（EventBus 没有的新概念）。
- **Partition + key**：相同 key 落同一分区，保证组内有序；Offset 是消费进度书签，宕机重启可续上。
- **消费者组 groupId**：同组分摊（负载均衡），异组广播（各收一份）——这是分布式消费的核心规则。
- **demo 匿名化示例代码**：生产者 `SalaryPayrollBus.kafkaTemplate.send(...)` 异步发薪资计算消息；`KafkaSendHandler` 用 `toUser` 当 key 路由分区；消费者 `MsgPushConsumer` 用 `@KafkaListener` 接收并交给 Service 处理，try-catch 防毒丸消息。
- **避坑**：消息会重复（做幂等）、可能乱序（设 key）、消费别抛异常（吞进日志）、发送是异步（看回调）。

> **下一课预告**：第 27 课《Redis 缓存与分布式锁》。学完异步消息，我们来看后端另一个高频利器——Redis。它既是前端 `localStorage` 的服务端放大版（缓存热点数据），又能解决"分布式环境下多个实例抢同一资源"的难题（分布式锁）。我们会结合 demo 示例的缓存与锁用法来讲。

# 八、总结

- **为什么需要 MQ？从一个前端类比说起**：后端的 MQ 解决的是同一个问题，只是规模和约束不同。
- **demo 示例生产者：发一条薪资计算消息**：demo-payroll（薪资服务）里有个典型的"算工资条"场景：用户点了"生成工资条"，接口不会傻等着把几万条工资算完——而是发一条消息进 Kafka 就立即返回，后台慢慢算。
- **demo 示例消费者：用 @KafkaListener 收消息**：groupId 是 EventBus 完全没有的概念，但极其重要。
- **demo 中的消息驱动场景全景**：| 薪资工资条批量计算 | 几万条计算太慢，接口不能干等 | 异步 |
- **避坑提示（前端思维容易踩的坑）**：消息可能重复消费：网络抖动、消费者重启都可能导致同一条消息被处理两次。 -> 消息可能乱序：只有同一分区内有序。 -> 消费别抛异常上去：看 demo 的 MsgPushConsumer 用 try-catch 把异常吞在日志里，就是怕一条坏消息（毒丸消息）反复重试、堵死整个分区。 -> 发送是异步的：send() 返回就代表"发出去了"，不代表"对方收到了"。
- **本课小结**：MQ 三大价值：解耦（发送方不认识接收方）、异步（发完即返回）、削峰（队列缓冲流量），本质是 EventBus 发布订阅模式的分布式、可持久化升级版。

## 参考资料

- [Dev.java 学习路径](https://dev.java/learn/)
- [Spring Boot 文档](https://docs.spring.io/spring-boot/)
