# 生产工程（13） - PostgreSQL：AI 时代最适合的数据库

> 读完你能：理解 PostgreSQL 在 AI 应用里为什么仍然是主数据库，并掌握它和向量扩展的组合价值。

# 一、本篇定位

这是数据底座篇。向量库很重要，但 AI 应用仍然需要可靠的关系型数据库。

# 二、一个真实场景

一个 Agent 系统要存用户、会话、任务、权限、文档、工具调用记录、评测结果。不是所有东西都是向量。PostgreSQL 的事务、约束、索引、JSONB、全文检索、pgvector，让它很适合作为 AI 应用的主数据底座。

# 三、核心拆解

- PostgreSQL 负责强一致业务数据：用户、组织、权限、任务状态、订单、审计日志。
- JSONB 适合存模型输入输出、工具参数、trace metadata 等半结构化数据。
- pgvector 让 PostgreSQL 也能存向量，适合中等规模 RAG 或不想引入独立向量库的团队。

# 四、工程链路

- 业务实体建关系表。
- 模型调用和工具调用写审计表。
- 文档 chunk 存文本和 metadata。
- 小中规模向量用 pgvector。
- 规模增大后再拆 Milvus。

# 五、落地建议

- 权限字段放在数据库层，检索时直接过滤。
- trace 表要能按 request_id 查询全链路。
- 重要工具调用放事务里，避免状态半成功。

# 六、常见坑

- 把所有数据都塞向量库。
- 没有事务，任务创建和工具执行状态不一致。
- JSONB 滥用，明明该建字段却全塞一个 blob。

# 七、和已有主线的关系

23/61 讲向量数据库；84 补主数据库视角，说明 AI 应用不是只有 embedding。

# 八、复述答法

> PostgreSQL 适合做 AI 应用主库：关系数据靠表和事务，半结构化 trace 用 JSONB，中等规模向量可用 pgvector。向量库解决相似检索，PostgreSQL 解决业务状态、权限和审计。

# 九、总结

- **核心拆解**：PostgreSQL 负责强一致业务数据：用户、组织、权限、任务状态、订单、审计日志。
- **工程链路**：文档 chunk 存文本和 metadata。
- **常见坑**：没有事务，任务创建和工具执行状态不一致。
- **本篇定位**：这是数据底座篇。

## 十、最小可运行示例：PostgreSQL + pgvector

~~~text
# requirements.txt
psycopg[binary]
pgvector
~~~

~~~python
from __future__ import annotations

import os

import psycopg
from pgvector.psycopg import register_vector


# 数据库连接串由 Secret 注入，不写入仓库。
DATABASE_URL = os.environ["DATABASE_URL"]
# 示例查询向量维度必须与表定义和 Embedding 模型一致。
QUERY_VECTOR = [0.1, 0.2, 0.3]


def search_chunks(tenant_id: str, groups: list[str]) -> list[tuple[str, float]]:
    """在权限内执行向量检索；两个参数来自可信身份上下文。"""

    with psycopg.connect(DATABASE_URL) as connection:
        register_vector(connection)
        with connection.cursor() as cursor:
            # SQL 先过滤租户与 ACL，再按向量距离排序。
            cursor.execute(
                """
                SELECT chunk_id, embedding <=> %s::vector AS distance
                FROM knowledge_chunks
                WHERE tenant_id = %s AND acl_groups && %s::text[]
                ORDER BY embedding <=> %s::vector
                LIMIT 10
                """,
                (QUERY_VECTOR, tenant_id, groups, QUERY_VECTOR),
            )
            return [(row[0], float(row[1])) for row in cursor.fetchall()]
~~~

索引类型、lists/probes 或 HNSW 参数需用过滤后的真实数据压测。PostgreSQL 适合元数据事务与规模可控的向量检索；独立扩缩容和超大向量量级应与专用 VectorDB 对比。

## 参考资料

- [OWASP LLM Top 10](https://genai.owasp.org/llm-top-10/)
- [Google SRE Workbook](https://sre.google/workbook/table-of-contents/)
