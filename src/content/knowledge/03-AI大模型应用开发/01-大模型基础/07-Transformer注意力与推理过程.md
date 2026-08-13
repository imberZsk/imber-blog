# 大模型基础（07） - Transformer 注意力与推理过程

> 从 Token 进入模型到生成下一个 Token，理解 Q/K/V、残差、归一化、Prefill 和 KV Cache 如何共同工作。

> 读完你能：解释 Decoder-only Transformer 的一次前向计算，并区分 Prefill、Decode 和 KV Cache 的成本。

## 核心知识清单

- Embedding 与位置编码
- Query、Key、Value 与缩放点积注意力
- 多头注意力与因果掩码
- 前馈网络、残差连接与归一化
- Decoder-only 与自回归生成
- Prefill、Decode 与 KV Cache

## 注意力在算什么

每个 Token 的隐藏状态分别投影成 Query、Key、Value。Query 与所有可见 Key 的相似度经过缩放和 Softmax 得到权重，再对 Value 加权求和。因果掩码阻止当前位置看到未来 Token；多头注意力让不同子空间并行学习指代、位置和语义关系。

## 前馈网络、残差连接与归一化

注意力负责让 Token 交换上下文信息，前馈网络则对每个位置独立进行非线性特征变换，通常先扩维再投影回隐藏维度。它不负责跨 Token 读取，但承担了大量参数和表示变换能力。

残差连接把子层输入直接加回输出，为深层网络保留梯度与原始信息；归一化控制激活尺度，降低训练和推理中的数值漂移。三者与注意力共同构成 Transformer Block，缺少其中任一部分都不能只靠 Attention 替代。

```python
import math


def scaled_dot_attention(query: list[float], keys: list[list[float]], values: list[list[float]]) -> list[float]:
    """计算单个 Query 对一组 Key/Value 的缩放点积注意力。"""
    # 每个 Key 对当前 Query 的未归一化相关性分数。
    scores = [sum(q * k for q, k in zip(query, key)) / math.sqrt(len(query)) for key in keys]
    # 数值稳定的 Softmax 概率。
    maximum_score = max(scores)
    exponentials = [math.exp(score - maximum_score) for score in scores]
    probability_sum = sum(exponentials)
    attention_weights = [value / probability_sum for value in exponentials]
    # 加权后的上下文向量。
    return [sum(weight * value[index] for weight, value in zip(attention_weights, values)) for index in range(len(values[0]))]
```

## Prefill 与 Decode

Prefill 并行处理完整输入，计算每层 Key/Value；Decode 每轮只生成一个新 Token，并复用 KV Cache。输入越长，Prefill 和首字延迟越高；输出越长，Decode 次数越多。KV Cache 用显存换计算，长上下文和高并发会快速占满显存，因此吞吐优化不能只看权重大小。

## 容易混淆的边界

- Embedding 层把 Token ID 映射为隐藏向量，不等于 RAG 使用的句向量模型。
- Attention 能建立上下文关系，不保证模型记住长文本中的全部事实。
- KV Cache 只复用推理中间状态，不会更新模型参数或形成长期记忆。

## 参考资料

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/)
