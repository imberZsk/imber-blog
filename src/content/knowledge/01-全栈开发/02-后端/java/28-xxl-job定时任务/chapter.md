# 第 28 课：xxl-job 分布式定时任务

> 前端的 `setInterval` 跑在一个浏览器标签页里，关掉就没了。后端的定时任务要跑在一群随时会重启、会扩容的服务器上——xxl-job 就是给这群服务器配的一个"可视化、不重复、能重试"的 setInterval 中控台。

---

## 一、先回忆：前端是怎么做"定时"的

你在前端写过这种代码：

```js
// 每隔 5 分钟轮询一次订单状态
setInterval(() => {
  fetchOrderStatus()
}, 5 * 60 * 1000)

// 或者 Node.js 后台脚本里用 node-cron
import cron from 'node-cron'
cron.schedule('0 2 * * *', () => {
  syncDailyReport()  // 每天凌晨 2 点同步日报
})
```

这两种写法的共同点：**任务的"什么时候跑"和"跑什么"绑死在同一个进程里**。进程在，任务就在；进程没了，任务就停。在前端/单机脚本里这没问题，但搬到后端集群就全是坑。

---

## 二、为什么后端不能直接用单机 cron

假设 demo 的财务服务 `demo-billing` 要做一个"每天凌晨对账校验"的任务（常见，见后文 `ReconciliationJob`）。如果你直接用 Spring 的 `@Scheduled(cron = "0 0 2 * * ?")` 写在代码里，会遇到下面这些问题。

### 坑 1：多实例重复执行

后端服务为了高可用，从来不是只跑一个进程。`demo-billing` 线上至少 3 个实例（Pod）。`@Scheduled` 是"每个进程各跑各的"：

```
                凌晨 2:00 到了
        ┌───────────┬───────────┬───────────┐
        ▼           ▼           ▼
   finance-pod-1  finance-pod-2  finance-pod-3
        │           │           │
   对账校验跑1遍   对账校验跑1遍   对账校验跑1遍   ← 同一份账被算了 3 次！
```

对账、发提醒、扣款这类任务跑 3 遍，轻则发 3 条重复短信，重则重复扣款。前端类比：相当于你在 3 个浏览器标签页里都开了同一个 `setInterval`，请求打了 3 倍。

### 坑 2：改时间要重新发版

cron 表达式写死在代码里。运营说"对账时间从 2 点改到 3 点"，你得改代码、走 CI、重新部署。前端改个 `setInterval` 的间隔也要重新打包发布——你懂这种痛。

### 坑 3：跑没跑、跑成功没有，全靠翻日志

`@Scheduled` 跑完不留痕迹。任务失败了没人知道，要登录服务器 `grep` 日志。没有重试、没有报警、没有执行历史。

### 坑 4：大任务没法拆

demo 有几十万辆车要检查保险到期（示例任务 `ContractExpiryNotifyJob`）。单机一个进程从头跑到尾，几个小时跑不完。你希望 3 个 Pod 一人分一部分数据并行跑，单机 cron 做不到。

**xxl-job 就是来解决这四个坑的。**

---

## 三、xxl-job 的核心架构：调度中心 + 执行器

xxl-job 把"什么时候跑"和"跑什么"彻底拆成了两个角色：

```
 ┌──────────────────────────────────────────────────────────┐
 │                调度中心 (xxl-job-admin)                     │
 │   一个独立部署的 Web 控制台 + 数据库                          │
 │   职责：到点了，挑一个执行器，发一个"开跑"信号                  │
 │   ┌────────────────────────────────────────────┐          │
 │   │  任务列表（可视化配置）                         │          │
 │   │  · remainderCheckJob   cron: 0 0 2 * * ?     │          │
 │   │  · syncCargoTypeJobHandler  cron: 0 0/30...  │          │
 │   │  · INSURANCE_EXPIRE_NOTIFY_JOB  cron:...      │          │
 │   └────────────────────────────────────────────┘          │
 └────────────────────────┬─────────────────────────────────┘
                          │  到点，HTTP 触发（带路由策略）
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
     ┌───────────┐ ┌───────────┐ ┌───────────┐
     │ 执行器 Pod1 │ │ 执行器 Pod2 │ │ 执行器 Pod3 │   ← 你的业务服务（demo-billing）
     │ @XxlJob    │ │ @XxlJob    │ │ @XxlJob    │      每个实例启动时主动"注册"到调度中心
     │ 跑业务代码  │ │ 跑业务代码  │ │ 跑业务代码  │
     └───────────┘ └───────────┘ └───────────┘
```

| 角色 | 是什么 | 前端类比 |
|------|--------|----------|
| **调度中心 (admin)** | 一个独立的 Web 后台，运维部署，全公司共用 | 一个可视化的"定时任务总控台"，决定 setInterval 几点触发 |
| **执行器 (executor)** | 你的业务服务（`demo-billing`、`demo-basic`），内嵌一个 xxl-job 客户端 | 真正干活的 `() => { ... }` 回调函数所在的进程 |
| **cron 表达式** | 在调度中心页面上配的"几点跑"，不在代码里 | `setInterval` 的间隔，但能在网页上随时改 |

关键转变：**触发时机由调度中心统一掌管，业务代码只负责"被调用时该做什么"**。这就一次性解决了上面四个坑——调度中心只挑一个执行器发信号（不重复）、cron 在网页改（不发版）、有执行历史和报警（可观测）、能下发分片参数（可拆分）。

> 前端类比：把 `setInterval` 从你的代码里搬走，交给一个团队共用的"定时中控台"。你的代码退化成纯粹的回调函数，"几点调用它"由中控台说了算。

---

## 四、执行器是怎么接入的：XxlJobConfig

业务服务要变成"执行器"，得在启动时往调度中心注册自己。demo-billing 里这段配置（匿名化示例代码 `demo-billing/.../config/XxlJobConfig.java`）：

```java
@Configuration
public class XxlJobConfig {
    private Logger logger = LoggerFactory.getLogger(XxlJobConfig.class);

    // 调度中心的地址，执行器要主动连过去注册自己
    @Value("${xxl.job.admin.addresses:}")
    private String adminAddresses;

    // 执行器分组名，比如 "demo-billing-executor"
    // 调度中心按这个名字找到一组 Pod，挑一个下发任务
    @Value("${xxl.job.executor.appname:}")
    private String appName;

    @Value("${xxl.job.accessToken:}")
    private String accessToken;  // 调度中心与执行器之间的通信令牌，防止被乱触发

    @Bean
    // 只有配置 xxl.enabled=true 才装配执行器
    // WHY: 本地开发不想连调度中心时，关掉它就不会启动注册，避免本地报连接错误
    @ConditionalOnProperty(name = "xxl.enabled", havingValue = "true")
    public XxlJobSpringExecutor xxlJobExecutor() {
        logger.info(">>>>>>>>>>> xxl-job config init.");
        XxlJobSpringExecutor xxlJobSpringExecutor = new XxlJobSpringExecutor();
        // 把上面读到的配置塞进执行器：去哪注册、自己叫什么、用什么令牌
        xxlJobSpringExecutor.setAdminAddresses(adminAddresses);
        xxlJobSpringExecutor.setAppname(appName);
        xxlJobSpringExecutor.setAccessToken(accessToken);
        // ... ip / port / logPath 等略
        return xxlJobSpringExecutor;
    }
}
```

理解三个点就够了：

1. **`adminAddresses`**：执行器知道调度中心在哪，启动时主动连过去说"我是 demo-billing 的一个 Pod，有任务可以派给我"。这叫**自动注册**——你扩容到 5 个 Pod，调度中心自动就看到 5 个，不用手配 IP。
2. **`appname`**：执行器分组名。调度中心配任务时只填这个组名，到点从这组里挑一个活着的 Pod。
3. **`@ConditionalOnProperty`**（见第 8 课注解、第 5 课 Bean）：本地 `xxl.enabled=false` 就不启动执行器，省得本地连不上调度中心一直报错。

> 前端类比：`adminAddresses` 像是 WebSocket 服务端地址，执行器一启动就连上去"上线打卡"；`appname` 像是房间号，同一个房间里的人（Pod）共享派发的任务。

---

## 五、@XxlJob：把一个方法变成"可被调度的任务"

执行器接好了，现在写真正的业务。一个普通方法，加上 `@XxlJob("任务名")`，就成了调度中心能触发的任务。

### 最简单的形态：数据同步任务

demo-basic 里这个"从油品同步货物名称类型"的同步任务（匿名化示例代码 `demo-basic/.../jobhandler/SyncCargoTypeJobHandler.java`），是 xxl-job 最朴素的样子：

```java
@Slf4j
@Component   // 必须是 Spring Bean，xxl-job 才能扫描到（见第 5 课）
public class SyncCargoTypeJobHandler {

    @Autowired
    private OnWayFeeConfServiceImp onWayFeeConfServiceImp;

    // @XxlJob 的值 "syncCargoTypeJobHandler" 就是任务的唯一标识
    // 调度中心页面上配任务时，"JobHandler" 那一栏要填一模一样的字符串，靠它对上号
    @XxlJob("syncCargoTypeJobHandler")
    public ReturnT<String> syncCargoType(String param) {
        // param 是调度中心页面上配的"任务参数"，相当于给回调传的入参
        onWayFeeConfServiceImp.syncCargoType();  // 真正干活的业务方法
        return ReturnT.SUCCESS;  // 告诉调度中心：我成功了。失败就返回 ReturnT.FAIL
    }
}
```

对照前端：

| xxl-job | 前端 setInterval / node-cron |
|---------|------------------------------|
| `@XxlJob("syncCargoTypeJobHandler")` | 任务的名字，调度中心靠它找到这个回调 |
| 方法体 `syncCargoType()` | `() => { syncCargoType() }` 回调函数体 |
| 入参 `String param` | 回调的入参（页面上配的，不写死在代码里） |
| 返回 `ReturnT.SUCCESS / FAIL` | 没有对应物——后端要主动汇报成败，调度中心据此决定是否重试/报警 |
| cron 在哪？ | **不在代码里**，在调度中心网页上配 |

注意最后两行的差异：前端的 `setInterval` 回调跑完就完了，没人关心成败。而 xxl-job 的方法**必须返回 `ReturnT`**，等于跟调度中心"交差"。返回 `FAIL`，调度中心就能按配置自动重试、发报警——这是单机 cron 给不了的。

---

## 六、cron 表达式：和前端 node-cron 几乎一样

cron 表达式定义"什么时候跑"。xxl-job 用的是 **Java 6 位 cron**（比 Linux 标准 cron 多了最前面的"秒"位）：

```
┌──────── 秒 (0-59)        ← Linux 标准 cron 没有这一位
│ ┌────── 分 (0-59)
│ │ ┌──── 时 (0-23)
│ │ │ ┌── 日 (1-31)
│ │ │ │ ┌ 月 (1-12)
│ │ │ │ │ ┌ 周 (1-7, 1=周日, 7=周六；? 表示不指定)
│ │ │ │ │ │
0 0 2 * * ?      ← 每天凌晨 2:00:00（对账任务的典型配置）
```

> 注意：xxl-job 用的是 Quartz 风格的 cron，"周"这一位是 **1-7、1 代表周日**（和 Linux crontab 的 0-7、0=周日 不一样）。所以"周一"在这里是 `2`，别凭 Linux 习惯写成 `1`。

| 需求 | cron 表达式 | 前端 node-cron（5 位，无秒） |
|------|-------------|------------------------------|
| 每天凌晨 2 点 | `0 0 2 * * ?` | `0 2 * * *` |
| 每 30 分钟 | `0 0/30 * * * ?` | `*/30 * * * *` |
| 每隔 10 秒 | `0/10 * * * * ?` | node-cron 也支持 6 位才能写秒 |
| 每周一上午 9 点 | `0 0 9 ? * 2`（或 `? * MON`） | `0 9 * * 1` |

> 前端类比：和你在 `node-cron`、GitHub Actions、`crontab` 里写的那套是同一个东西，只是 xxl-job 在最前面多了一位"秒"。看不懂的表达式，扔给 crontab.guru 这类工具一秒看懂。

**重点**：这个表达式填在**调度中心的网页表单里**，不在你的 Java 代码里。运营要改时间，运维在网页上改一下、保存，立即生效，**不用动代码、不用发版**——这就是干掉了第二节的"坑 2"。

---

## 七、工程场景一：对账校验任务（解决"坑 1 重复执行"）

demo-billing 的 `ReconciliationJob`（匿名化示例代码 `demo-billing/.../schedule/ReconciliationJob.java`）是个典型的"对账"任务：每天定时把所有网点的账算一遍，和数据库里存的余额对比，对不上就报警。

这种任务**绝对不能在 3 个 Pod 上各跑一遍**（否则报警发 3 条、文件写 3 份）。xxl-job 默认的**路由策略**（在调度中心页面上选）保证了同一次触发只挑一个 Pod 执行：

```java
@Slf4j
@Component
public class ReconciliationJob extends IJobHandler {  // 另一种写法：继承 IJobHandler，重写 execute

    private static final String JOB_NAME = "remainderCheckJob";

    @XxlJob(JOB_NAME)
    @Override
    public ReturnT execute(String param) {
        // 手动生成一个 trace_id 塞进 MDC（日志上下文）
        // WHY: 一次对账要处理成千上万个网点，日志巨多。带上统一 trace_id，
        //      在日志系统里按 trace_id 一搜就能捞出"这一次任务"的全部日志
        String tradeNo = IdWorker.getIdStr();
        MDC.put("trace_id", tradeNo);
        log.info("网点余额检测报警任务开始运行");
        // XxlJobLogger.log 写的日志会回传到调度中心页面，点任务的"执行日志"就能在网页上看到
        XxlJobLogger.log("网点余额检测报警任务开始运行, trace: {}", tradeNo);
        try {
            // param 是页面配的 JSON 参数，可以指定只校验某些集团/网点，方便临时排查
            JobParam jobParam = Optional.ofNullable(param)
                    .filter(StringUtils::isNotBlank)
                    .map(s -> JSON.parseObject(s, JobParam.class))
                    .orElseGet(JobParam::new);
            Set<OrganizationUserProVo> checkedGroup = new HashSet<>();
            queryOrganizationAndCheck(0, jobParam, checkedGroup);   // 递归分页查网点 + 逐个校验
            queryAndCheckPayModeGroup(checkedGroup);            // 再校验集团收支方式余额
        } finally {
            // 不管成功失败，都要把 trace_id 从 MDC 清掉，否则线程复用会串日志
            log.info("网点余额检测报警任务运行结束");
            XxlJobLogger.log("网点余额检测报警任务运行结束");
            MDC.remove("trace_id");
        }
        return ReturnT.SUCCESS;
    }
    // ... 余额对比、报警逻辑略，核心是：算出来的余额 vs 数据库余额，不一致就 FinanceAlarmUtils.sendAlarm()
}
```

这段匿名化示例代码里值得你学的工程习惯：

- **`MDC.put("trace_id", ...)` + `finally` 里 `remove`**：后端线程是复用的（线程池），不像前端每个回调都是干净的新上下文。一次任务给日志打上统一 trace，结束必须清掉，否则下一个任务复用同一线程会串味。
- **`XxlJobLogger.log`**：这行日志会**回传到调度中心网页**。运维在 admin 后台点开这个任务的"执行日志"，就能直接在浏览器里看到任务跑到哪了——这就是"可视化"，替代了 SSH 登录服务器 grep。
- **两种写法都行**：`SyncCargoTypeJobHandler` 是"普通类 + `@XxlJob` 注解方法"；`ReconciliationJob` 是"继承 `IJobHandler` + 重写 `execute`"。新代码推荐前者（更轻量），老任务常见后者。

**为什么不会重复跑？** 调度中心的路由策略默认是"第一个/轮询/一致性哈希"等——一次触发只选**一个**活着的 Pod 发信号。3 个 Pod 注册在同一个 `appname` 下，但每次只有一个被选中执行。坑 1 解决。

---

## 八、工程场景二：大数据量任务的分片（解决"坑 4 拆不开"）

demo-asset 的保险到期提醒 `ContractExpiryNotifyJob`（匿名化示例代码 `demo-asset/.../job/ContractExpiryNotifyJob.java`）。全公司几十万辆车，单机跑太慢，于是用 xxl-job 的**分片广播**：让 3 个 Pod **同时**跑，每个 Pod 只处理"自己那一份"数据。

```java
@Component
@RequiredArgsConstructor
public class ContractExpiryNotifyJob extends BaseLogJob {   // 继承封装好的分片基类

    private final InsuranceExpireNotifyService expireNotifyService;

    @XxlJob("INSURANCE_EXPIRE_NOTIFY_JOB")
    public void insuranceExpireNotify() {
        logAndRun("INSURANCE_EXPIRE_NOTIFY_JOB 保险到期提醒任务");
    }

    @Override
    public void exec(int total, int index) {
        // total = 总分片数（= 几个 Pod 一起跑），index = 当前 Pod 的编号（0,1,2...）
        // Service 内部用 total/index 取模，只处理 集团id % total == index 的那部分集团
        // 注意：demo 这里是按"集团"分片，不是按单辆车分片——一个 Pod 包揽它负责的那些集团的全部车
        expireNotifyService.expireNotify(total, index, null);
    }
}
```

分片参数从哪来？看封装好的基类 `BaseLogJob`（匿名化示例代码 `demo-asset/.../job/BaseLogJob.java`）：

```java
public abstract class BaseLogJob {

    private void doLogAndRun(String name) {
        // ShardingUtil 从当前这次触发的上下文里取出分片信息
        // 这是 xxl-job 在"分片广播"路由策略下，下发任务时塞进来的
        ShardingUtil.ShardingVO shardingVo = ShardingUtil.getShardingVo();
        // total: 这次一共有几个分片在跑（没配分片就默认 1）
        Integer total = Optional.ofNullable(shardingVo)
                .map(ShardingUtil.ShardingVO::getTotal).orElse(1);
        // index: 当前这个 Pod 是第几号分片（默认 0）
        Integer index = Optional.ofNullable(shardingVo)
                .map(ShardingUtil.ShardingVO::getIndex).orElse(0);

        log.info("任务: {}, 开始运行, 分片参数: total: {}, index: {}", name, total, index);
        try {
            exec(total, index);   // 把分片参数交给子类的业务逻辑
        } catch (Exception e) {
            // 抛异常 = 这个分片失败，调度中心会标红并可触发报警
            log.error("任务: {}, 运行异常: ", name, e);
            throw e;
        }
    }

    public abstract void exec(int total, int index);
}
```

分片广播的执行画面：

```
        调度中心触发（路由策略 = 分片广播）
        ┌──────────┬──────────┬──────────┐
        ▼          ▼          ▼
     Pod0       Pod1       Pod2
   index=0    index=1    index=2     total 都 = 3
   处理        处理        处理
 集团id%3==0  集团id%3==1  集团id%3==2   ← 3 台机器并行，各管 1/3 的集团，互不重复
```

> 前端类比：想象你有一堆集团要处理，开了 3 个 Web Worker，主线程告诉每个 Worker "你是 3 个里的第 N 个，只处理你那一份"。`total` 是 Worker 总数，`index` 是当前 Worker 编号。xxl-job 帮你把 `total/index` 算好下发，你只管按它取模分活。demo 里取模的对象是"集团 id"——每个 Pod 认领一批集团，把这些集团下的车全部处理掉。

注意"分片广播"和第七节"对账"的关键区别：

| 任务类型 | 路由策略 | 几个 Pod 执行 | 适用场景 |
|----------|----------|---------------|----------|
| 对账校验 `ReconciliationJob` | 轮询/第一个等 | **只 1 个** | 任务本身不大，绝不能重复 |
| 保险提醒 `ContractExpiryNotifyJob` | **分片广播** | **全部一起**，各管一份 | 数据量大，要并行加速 |

策略在调度中心网页上选，代码不用改。这就是"调度与业务解耦"带来的灵活性。

---

## 九、串起来：一次完整的任务执行流程

把前面所有角色串成一条链（呼应第 4 课的"五站请求生命周期"，定时任务是另一条独立链路）：

```
①  运维在 admin 网页配好任务：
    JobHandler = "remainderCheckJob"
    cron       = "0 0 2 * * ?"
    路由策略    = 轮询
    失败重试    = 3 次
            │
            ▼
②  凌晨 2:00 到点，调度中心按 cron 触发
            │
            ▼
③  按路由策略，从 demo-billing 这组注册的 3 个 Pod 里挑 1 个
            │  HTTP 调用（带 accessToken 校验）
            ▼
④  被选中的 Pod 收到信号 → 找到 @XxlJob("remainderCheckJob") 的方法 → 执行
            │
            ▼
⑤  方法跑业务：查网点 → 算余额 → 对比 → 不一致就 sendAlarm 报警
    期间 XxlJobLogger.log 的日志实时回传 admin
            │
            ▼
⑥  方法返回 ReturnT.SUCCESS / FAIL
       · SUCCESS → admin 记一条成功执行历史
       · FAIL    → admin 自动重试（最多 3 次），仍失败则报警通知运维
```

每一步都对应着干掉了一个单机 cron 的坑：③只挑一个（不重复）、①cron 在网页（不发版）、⑤⑥日志回传+重试+报警（可观测、能兜底）。

---

## 本课小结

- **单机 cron / `@Scheduled` 的四个坑**：多实例重复执行、改时间要发版、跑没跑全靠 grep 日志、大任务拆不开。xxl-job 逐个解决。
- **核心是"调度与业务解耦"**：调度中心（admin，运维部署的可视化网页）管"什么时候跑"，执行器（你的业务服务）管"被调用时干什么"。cron 表达式配在网页上，不在代码里。
- **执行器接入**靠 `XxlJobConfig` 里的 `XxlJobSpringExecutor`：用 `adminAddresses` 注册到调度中心，用 `appname` 分组，启动时自动上线（demo-billing 示例配置）。
- **写任务**：`@Component` + `@XxlJob("任务名")` 标在方法上，方法返回 `ReturnT.SUCCESS/FAIL` 向调度中心交差（demo-basic 的 `SyncCargoTypeJobHandler`）。或继承 `IJobHandler` 重写 `execute`（demo-billing 的 `ReconciliationJob`）。
- **cron 表达式**和前端 node-cron 几乎一样，只是 xxl-job 是 6 位、最前面多一位"秒"。
- **路由策略决定几个 Pod 执行**：对账类选"轮询/第一个"只跑 1 个防重复；大数据量选"分片广播"，靠 `ShardingUtil` 拿到的 `total/index` 取模，多 Pod 并行各管一份（demo-asset 的 `ContractExpiryNotifyJob` + `BaseLogJob`）。
- **工程习惯**：`MDC.put/remove` 给一次任务的日志打统一 trace_id（线程复用必须 finally 清理）；`XxlJobLogger.log` 让日志回传到 admin 网页可视化查看。

> 前端类比一句话收尾：xxl-job = 把 `setInterval` 从你的进程里搬到一个团队共用的可视化中控台，它负责"几点喊一嗓子、喊谁、喊几次、失败重喊"，你的代码退化成一个纯粹、可被随时调用的回调函数。

**下一课预告**：第 29 课我们讲 **消息队列（RocketMQ/Kafka）入门**——定时任务是"按时间触发"，消息队列是"按事件触发、异步解耦"。我们会对比前端的事件总线（EventBus / 发布订阅）来理解"生产者-消费者"模型，并结合 demo 示例的下单后异步发消息场景讲清楚为什么要引入 MQ。
