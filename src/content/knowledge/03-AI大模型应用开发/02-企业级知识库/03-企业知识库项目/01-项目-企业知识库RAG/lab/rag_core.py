"""企业 RAG 的切分、Embedding、Qdrant 与问答核心。"""

from __future__ import annotations

import hashlib
import json
import math
import re
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import asdict, dataclass
from typing import Any

EMBEDDING_DIMENSIONS = 128
DEFAULT_CHUNK_SIZE = 360
DEFAULT_CHUNK_OVERLAP = 60
MIN_RETRIEVAL_SCORE = 0.22


@dataclass(frozen=True, slots=True)
class Chunk:
    """保存可检索正文及企业过滤元数据。"""

    # Qdrant 使用的稳定点标识。
    chunk_id: str
    # 实际进入 Embedding 和生成阶段的正文。
    text: str
    # 文档展示标题。
    title: str
    # 可追溯的文件或业务来源。
    source: str
    # Markdown 标题形成的章节路径。
    section: str
    # 必须在检索前过滤的租户标识。
    tenant_id: str
    # 必须在检索前过滤的权限标签。
    acl: str


@dataclass(frozen=True, slots=True)
class SearchHit:
    """表示向量检索命中的证据。"""

    # Qdrant 相似度得分。
    score: float
    # 命中的完整文本块。
    chunk: Chunk


class LocalEmbeddingModel:
    """用稳定 hashing 向量提供离线 Embedding。"""

    def __init__(self, dimensions: int = EMBEDDING_DIMENSIONS) -> None:
        """初始化向量维度；dimensions 必须大于零。"""
        if dimensions <= 0:
            raise ValueError("dimensions 必须大于 0")
        # 输出向量固定维度。
        self.dimensions = dimensions

    def embed(self, text: str) -> list[float]:
        """把文本映射为归一化 hashing 向量。"""
        # 中英文字符、英文单词和数字词项。
        tokens = re.findall(r"[A-Za-z]+|\d+|[\u4e00-\u9fff]", text.lower())
        # 把相邻词项加入特征，保留少量顺序信息。
        features = tokens + [f"{left}:{right}" for left, right in zip(tokens, tokens[1:])]
        # 尚未归一化的稠密向量。
        vector = [0.0] * self.dimensions
        for feature in features:
            # Python hash 每进程随机，必须改用稳定摘要才能支持离线建库后在线检索。
            digest = hashlib.blake2b(feature.encode("utf-8"), digest_size=8).digest()
            # 摘要前四字节决定向量桶。
            bucket = int.from_bytes(digest[:4], "big") % self.dimensions
            # 摘要最后一位决定正负号，降低哈希碰撞偏差。
            sign = 1.0 if digest[-1] % 2 == 0 else -1.0
            vector[bucket] += sign
        # L2 范数用于生成余弦可比的单位向量。
        norm = math.sqrt(sum(value * value for value in vector))
        return [value / norm for value in vector] if norm else vector


def split_markdown(
    markdown: str,
    title: str,
    source: str,
    tenant_id: str,
    acl: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[Chunk]:
    """按 Markdown 标题和重叠窗口切分，并写入权限元数据。"""
    if chunk_size <= overlap or overlap < 0:
        raise ValueError("需要满足 chunk_size > overlap >= 0")
    # 当前一级标题。
    level_one = title
    # 当前二级标题。
    level_two = ""
    # 当前标题下的正文行。
    buffer: list[str] = []
    # 最终生成的文本块。
    chunks: list[Chunk] = []

    def flush() -> None:
        """把当前标题缓冲区按重叠窗口写入 chunks。"""
        # 合并多行后的章节正文。
        section_text = " ".join(buffer).strip()
        if not section_text:
            buffer.clear()
            return
        # 相邻窗口向前移动的字符数。
        step = chunk_size - overlap
        # 可用于引用的章节路径。
        section = "/".join(part for part in (level_one, level_two) if part)
        for start in range(0, len(section_text), step):
            # 当前窗口正文。
            chunk_text = section_text[start : start + chunk_size].strip()
            if chunk_text:
                # 内容和元数据共同决定稳定 ID，重复导入不会制造重复点。
                chunk_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{tenant_id}:{source}:{section}:{start}:{chunk_text}"))
                chunks.append(Chunk(chunk_id, chunk_text, title, source, section, tenant_id, acl))
        buffer.clear()

    for raw_line in markdown.splitlines():
        # 去除 Markdown 行首尾空白后的文本。
        line = raw_line.strip()
        if line.startswith("# "):
            flush()
            level_one, level_two = line[2:].strip(), ""
        elif line.startswith("## "):
            flush()
            level_two = line[3:].strip()
        elif not line:
            flush()
        else:
            buffer.append(line)
    flush()
    return chunks


class QdrantClient:
    """用标准库调用 Qdrant REST API。"""

    def __init__(self, base_url: str, collection_name: str, timeout_seconds: float = 5.0) -> None:
        """保存连接参数。"""
        # 去除末尾斜杠的 Qdrant 地址。
        self.base_url = base_url.rstrip("/")
        # 当前知识库对应的 collection。
        self.collection_name = collection_name
        # 单次 HTTP 请求超时秒数。
        self.timeout_seconds = timeout_seconds

    def request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        """发送 JSON 请求并返回对象；非 2xx 会抛出异常。"""
        # 可选 JSON 请求体。
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        # 带超时边界的 Qdrant HTTP 请求。
        request = urllib.request.Request(f"{self.base_url}{path}", body, {"Content-Type": "application/json"}, method=method)
        with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
            return json.loads(response.read())

    def healthy(self) -> bool:
        """检查 Qdrant 是否可访问。"""
        try:
            self.request("GET", "/collections")
            return True
        except (OSError, urllib.error.URLError, json.JSONDecodeError):
            return False

    def recreate_collection(self) -> None:
        """删除并重建 collection，适合教学导入流程。"""
        try:
            self.request("DELETE", f"/collections/{self.collection_name}")
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise
        self.request("PUT", f"/collections/{self.collection_name}", {"vectors": {"size": EMBEDDING_DIMENSIONS, "distance": "Cosine"}})

    def indexed_point_count(self) -> int:
        """读取 collection 中真实持久化的向量点数量。"""
        # Qdrant collection 详情中的统计对象。
        result = self.request("GET", f"/collections/{self.collection_name}").get("result", {})
        return int(result.get("points_count", 0))

    def upsert(self, chunks: list[Chunk], embeddings: list[list[float]]) -> None:
        """批量写入文本块和向量。"""
        # Qdrant points 写入结构。
        points = [{"id": chunk.chunk_id, "vector": embedding, "payload": asdict(chunk)} for chunk, embedding in zip(chunks, embeddings, strict=True)]
        self.request("PUT", f"/collections/{self.collection_name}/points?wait=true", {"points": points})

    def search(self, vector: list[float], top_k: int, tenant_id: str, acl: str) -> list[SearchHit]:
        """在向量检索前执行租户和 ACL 过滤。"""
        # Qdrant 的前置权限过滤条件。
        query_filter = {"must": [{"key": "tenant_id", "match": {"value": tenant_id}}, {"key": "acl", "match": {"value": acl}}]}
        # 搜索请求与得分阈值。
        payload = {"vector": vector, "limit": top_k, "with_payload": True, "score_threshold": MIN_RETRIEVAL_SCORE, "filter": query_filter}
        # Qdrant 返回的原始点列表。
        points = self.request("POST", f"/collections/{self.collection_name}/points/search", payload).get("result", [])
        # 已恢复为领域对象的命中结果。
        hits: list[SearchHit] = []
        for point in points:
            # 点中存储的 Chunk 字段。
            chunk_payload = point.get("payload", {})
            hits.append(SearchHit(float(point["score"]), Chunk(**chunk_payload)))
        return hits


class RagService:
    """编排离线建库、在线检索、回答、引用与 Trace。"""

    def __init__(self, qdrant: QdrantClient, embedding_model: LocalEmbeddingModel) -> None:
        """注入向量数据库和 Embedding 模型。"""
        # 向量存储客户端。
        self.qdrant = qdrant
        # 离线与在线必须使用相同版本的 Embedding。
        self.embedding_model = embedding_model
        # 当前进程已导入的文档摘要。
        self.documents: list[dict[str, str | int]] = []
        # 最近请求 Trace。
        self.logs: list[dict[str, Any]] = []

    def add_document(self, title: str, source: str, markdown: str, tenant_id: str, acl: str) -> int:
        """切分、向量化并入库一篇文档，返回 chunk 数。"""
        # 结构化切分后的文本块。
        chunks = split_markdown(markdown, title, source, tenant_id, acl)
        # 与文本块严格对齐的本地向量。
        embeddings = [self.embedding_model.embed(chunk.text) for chunk in chunks]
        self.qdrant.upsert(chunks, embeddings)
        self.documents.append({"title": title, "source": source, "chunks": len(chunks)})
        return len(chunks)

    def ask(self, question: str, tenant_id: str, acl: str, top_k: int = 4) -> dict[str, Any]:
        """在线向量检索并生成带引用回答。"""
        # 当前请求的稳定追踪标识。
        request_id = uuid.uuid4().hex
        # 请求开始时间用于端到端耗时。
        started_at = time.perf_counter()
        # 查询文本使用与建库一致的向量模型。
        query_vector = self.embedding_model.embed(question)
        # 已执行租户和权限过滤的命中证据。
        hits = self.qdrant.search(query_vector, max(1, min(top_k, 10)), tenant_id, acl)
        # 没有达标证据时必须拒答。
        answer = "资料不足，无法基于知识库回答。" if not hits else "\n".join(f"{hit.chunk.text} [{index}]" for index, hit in enumerate(hits, start=1))
        # 引用只来自实际用于回答的命中块。
        citations = [{"index": index, "title": hit.chunk.title, "source": hit.chunk.source, "section": hit.chunk.section, "score": round(hit.score, 4)} for index, hit in enumerate(hits, start=1)]
        # 便于定位检索、权限、阈值和生成问题的请求日志。
        trace = {"requestId": request_id, "question": question, "tenantId": tenant_id, "acl": acl, "retrieved": len(hits), "latencyMs": round((time.perf_counter() - started_at) * 1000, 2), "citations": citations}
        self.logs.append(trace)
        return {"requestId": request_id, "answer": answer, "citations": citations, "trace": trace}
