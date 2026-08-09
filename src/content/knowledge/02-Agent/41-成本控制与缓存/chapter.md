# 成本控制与缓存

> 读完你能：算清一次模型调用花多少钱，用 LRU 缓存让重复问题零成本返回，理解输入/输出 token 单价差异，并说清缓存、模型分级、限流这几个降本手段各自的适用场景。

## 一个真实场景

你的知识库问答上线一个月，财务来问："这个 AI 助手怎么花了小两万？"

你拉日志一看，发现两件事：一是同样的问题（"报销政策""请假流程"）被反复问，每次都老老实实调了一遍模型；二是有些简单问题（"你好""谢谢"）也用了最贵的模型。这两样都是白烧钱。

模型调用按 token 收费，每一次调用都在花钱。**成本控制不是上线后才考虑的事，而是设计时就要算的账。** 这一篇讲最直接的几个降本手段，其中缓存是性价比最高的。

## 先把账算明白：token 怎么变成钱

模型按 token 收费，而且**输入和输出通常不同价**，输出更贵：

```python
PRICE_PER_1K_INPUT = 0.001    # 输入 token 单价（元/1K）
PRICE_PER_1K_OUTPUT = 0.002   # 输出 token 单价（元/1K），通常贵一倍

def estimate_cost(input_tokens, output_tokens):
    """一次调用成本 = 输入 token 计费 + 输出 token 计费。"""
    return (input_tokens / 1000) * PRICE_PER_1K_INPUT \
        + (output_tokens / 1000) * PRICE_PER_1K_OUTPUT
```

这个公式解释了两个优化方向：**少喂输入**（prompt 别塞无关内容、RAG 别检索一大堆 chunk 全塞进去）和**少出输出**（让模型答得简洁、设 max_tokens 上限）。输出贵，所以控制回答长度比压缩输入更划算。

token 数怎么来？真实项目用 `tiktoken` 精确分词，粗估可以按「中文约 1 字 1 token，英文约 4 字符 1 token」。

## 缓存：性价比最高的降本手段

很多问题是重复的。同一个问题第二次来，没必要再花钱调模型——上次的答案直接返回就行。命中缓存 = **零成本 + 零延迟**，这是最划算的优化。

核心逻辑就一句：**先查缓存，命中直接返回，未命中才调模型并把结果存进缓存。**

```python
def ask(self, question):
    """问答：缓存优先，未命中才调模型。"""
    cached = self.cache.get(question)
    if cached is not None:           # 命中缓存
        return cached                # 零成本返回，根本不碰模型
    answer = fake_model_answer(question)   # 未命中才花钱调模型
    self.cache.put(question, answer)       # 存进缓存，下次就能命中
    return answer
```

## LRU：缓存满了淘汰谁

缓存不能无限大，满了得淘汰。LRU（Least Recently Used）的策略是**淘汰最久没被用到的**，让热点问题常驻。用标准库 `OrderedDict` 实现得很干净：

```python
class LRUCache:
    def get(self, key):
        """命中就把它移到末尾，标记为最近使用。"""
        if key not in self.store:
            return None
        self.store.move_to_end(key)      # 最近用过，移到末尾保命
        return self.store[key]

    def put(self, key, value):
        """写入；超容量就删最前面的（最久未用）。"""
        self.store[key] = value
        self.store.move_to_end(key)
        if len(self.store) > self.capacity:
            self.store.popitem(last=False)   # 淘汰队首：最久没被用的
```

`move_to_end` 把刚用过的移到队尾，`popitem(last=False)` 淘汰队首。这样频繁被问的问题永远在末尾、淘汰不掉，冷门问题自然被挤出去。

## Prompt Cache、KV Cache、Prefix Cache 别混用

| 名称 | 发生在哪里 | 解决什么 |
|---|---|---|
| 业务缓存 | 应用层 | 相同问题直接返回上次答案 |
| Prompt Cache | 模型服务/供应商侧 | 相同前缀输入少计费或少计算 |
| KV Cache | 推理引擎内部 | 自回归生成时复用历史 key/value |
| Prefix Cache | 自部署推理优化 | 多请求共享相同 system prompt/长上下文前缀 |

做应用开发时，你最能直接控制的是业务缓存和 prompt 结构。KV Cache 通常是 vLLM/Ollama/模型服务内部优化，不要在业务代码里假装自己能手动管理。

## 缓存之外的降本手段

缓存解决重复问题，但还有其他场景：

| 手段 | 解决什么 | 怎么做 |
|---|---|---|
| 缓存 | 重复问题重复花钱 | LRU 缓存，命中零成本 |
| 模型分级 | 简单问题用了贵模型 | 简单问题走便宜小模型，复杂的才上大模型 |
| 控制 token | prompt 太长、回答太啰嗦 | 精简 prompt、设 max_tokens、RAG 控制 topK |
| 限流 | 单用户刷爆接口 | 按用户/IP 限速，防滥用和成本失控 |
| 降级 | 模型超时/超预算 | 触发阈值后返回缓存答案或兜底回复 |

这几个不是二选一，是组合拳。缓存性价比最高，先上；模型分级对成本影响大，量上来后必做。

## 配套 demo：跑起来看

```bash
cd demos/41-cost-cache
python3 main.py
```

`main.py` 模拟 6 次问答（含重复问题），缓存容量设 2 方便观察淘汰。跑完你会看到：6 次请求只真正调了 3 次模型（命中率 50%），插入新问题时 LRU 淘汰的是更久没被问的那个。

核心对应关系：
- `estimate_tokens` / `estimate_cost` —— token 估算和成本换算（区分输入/输出单价）
- `LRUCache.get` 里 `move_to_end` —— 命中后标记最近使用
- `LRUCache.put` 里 `popitem(last=False)` —— 容量满淘汰最久未用
- `QAService.ask` —— 缓存优先、未命中才调模型
- `QAService.report` —— 实际花费 vs 缓存省下

输出里「淘汰最久未用：'报销几天内提交'」这条，正是 LRU 在干活——「报销」和「年假」都问过两次，但插入「迟到」时淘汰的是更早被冷落的那个。

## 工程上真正会踩的坑

- **缓存键没归一化**。"报销几天" 和 "报销 几天" 因空格被当成两个不同问题，命中率虚低。缓存键要先归一化（去空格、统一大小写、甚至语义聚合）。
- **该过期的缓存不过期**。知识库更新了，缓存还返回旧答案。时效性内容要给缓存加 TTL，或文档更新时主动清缓存。
- **缓存了不该缓存的**。带用户隐私、带时效（"今天天气"）、个性化的回答不能跨用户缓存，否则张三看到李四的答案。缓存范围要按内容性质区分。
- **只顾省钱牺牲质量**。一刀切全用小模型，复杂问题答不好，省了钱丢了体验。模型分级要按问题复杂度路由，不是全降级。

## 一句话面试答法

> **AI 应用成本怎么控制？** 第一性价比是缓存：相同问题用 LRU 缓存，命中就零成本零延迟返回，不重复调模型，注意缓存键要归一化、时效内容要加 TTL。其次是模型分级，简单问题走便宜小模型、复杂的才上大模型。再就是控制 token——输出比输入贵，所以设 max_tokens、让回答简洁、RAG 控制 topK 别把一堆 chunk 全塞进 prompt。配合按用户限流防滥用、超预算时降级返回兜底答案。成本是设计时就要算的账，不是上线后才补。

## 下一篇

`42-生产问题排查清单.md` —— 成本、日志、部署都讲完了，最后一篇收口：线上真出了问题（超时、空回答、检索失败），怎么按一套清单快速定位。用一个排查脚本把常见故障的诊断逻辑跑给你看。
