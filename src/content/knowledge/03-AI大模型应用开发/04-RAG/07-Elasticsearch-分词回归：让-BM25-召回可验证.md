# 基础设施实战（2）- Elasticsearch 分词回归：让 BM25 召回可验证

> 读完你能：围绕“Elasticsearch 分词回归：让 BM25 召回可验证”理解“测试对象”与“可运行测试”，并结合正文示例完成实践与排障。


中文 RAG 的 BM25 召回经常不是“ES 不行”，而是索引分词器、查询分词器或词典版本不一致。上线前必须把分词结果变成可重复测试，而不是在控制台里肉眼看一次 `_analyze`。

## 一、测试对象

- `analyzer`：写入时拆分词元，决定倒排索引里保存什么。
- `search_analyzer`：查询时拆分词元，决定用户问题拿什么去匹配。
- 领域词典：产品名、错误码、人名和缩写是否保持为期望词元。
- 版本一致性：集群每个节点是否加载相同插件和词典版本。

```mermaid
flowchart LR
    D[领域样本集] --> A[_analyze API]
    A --> T[实际词元]
    E[期望词元] --> C{集合与顺序校验}
    T --> C
    C -->|通过| G[允许创建新索引]
    C -->|失败| B[阻止发布并定位词典]
```


## 二、可运行测试

```text
# requirements.txt
elasticsearch>=8,<10
pytest>=8,<9
```

```python
from __future__ import annotations

import os

import pytest
from elasticsearch import Elasticsearch


# Elasticsearch 地址从环境变量读取，避免在代码中写连接信息。
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
# 待验证的索引名称，测试它最终生效的 analyzer 配置。
INDEX_NAME = os.getenv("INDEX_NAME", "knowledge_chunks_v1")
# 领域分词样本及必须出现的词元，新增业务术语时同步扩展。
ANALYZER_CASES = [
    ("支付失败错误码 PAY-1042", {"支付", "失败", "pay-1042"}),
    ("Visual Worktree 离线建库", {"visual worktree", "离线", "建库"}),
]


@pytest.fixture(scope="module")
def es_client() -> Elasticsearch:
    """创建测试模块共享的 ES 客户端，连接参数由环境变量控制。"""

    # 客户端仅用于当前分词回归，不在测试中修改索引。
    client = Elasticsearch(ELASTICSEARCH_URL, request_timeout=5)
    if not client.ping():
        pytest.skip("Elasticsearch is unavailable")
    return client


@pytest.mark.parametrize(("text", "expected_tokens"), ANALYZER_CASES)
def test_search_analyzer_keeps_domain_terms(
    es_client: Elasticsearch,
    text: str,
    expected_tokens: set[str],
) -> None:
    """校验领域文本的查询词元；text 是输入，expected_tokens 是最低期望集合。"""

    # `_analyze` 返回当前索引实际生效的查询分词结果。
    response = es_client.indices.analyze(
        index=INDEX_NAME,
        body={"field": "content", "text": text},
    )
    # 统一小写后比较，避免英文大小写过滤器造成无意义失败。
    actual_tokens = {item["token"].lower() for item in response["tokens"]}
    assert expected_tokens <= actual_tokens
```

执行：`ELASTICSEARCH_URL=http://localhost:9200 INDEX_NAME=knowledge_chunks_v1 pytest -q`。

## 三、从分词测试升级到召回测试

分词正确不等于检索正确。下一层应建立包含 `query`、`expected_chunk_ids`、`tenant_id` 的小型金标集，在与生产相同的权限过滤条件下检查 Recall@K。分词回归负责快速定位词典和 analyzer，召回回归负责验证 mapping、BM25、字段权重和过滤器的组合结果。

## 四、生产避坑

1. 修改 analyzer 不能原地改变已有倒排索引，必须新建版本化索引并重建数据。
2. 远程词典更新后要确认所有节点加载成功，再跑回归集；节点版本不一致会产生随机召回。
3. 错误码、订单号等精确值单独使用 `keyword` 子字段，不要只依赖中文分词。
4. `_analyze` 样本不要只有通顺句子，必须覆盖粘连词、大小写、连字符、版本号和中英文混排。
5. 记录 ES 版本、插件版本、词典哈希和索引版本，Trace 才能复现线上坏案例。

## 五、验收标准

分词样本 100% 通过只是发布门槛；最终还需验证 BM25 Recall@10、权限零泄漏、索引切换无中断，以及回滚旧别名可在分钟级完成。

## 参考资料

- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Milvus 文档](https://milvus.io/docs)
