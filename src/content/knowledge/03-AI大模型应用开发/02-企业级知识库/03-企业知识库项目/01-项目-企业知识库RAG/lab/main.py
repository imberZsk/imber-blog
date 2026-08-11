"""企业知识库 RAG 的 HTTP API 与静态工作台。"""

from __future__ import annotations

import argparse
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from rag_core import LocalEmbeddingModel, QdrantClient, RagService

HOST = "127.0.0.1"
PORT = 8043
COLLECTION_NAME = "agent_manual_chunks"
LAB_DIRECTORY = Path(__file__).resolve().parent
STATIC_DIRECTORY = LAB_DIRECTORY / "static"
# lab 位于“AI 大模型应用开发/企业级知识库/项目/课程/lab”，向上四级才是当前 AI 知识根目录。
AI_KNOWLEDGE_ROOT = LAB_DIRECTORY.parents[3]


def create_service() -> RagService:
    """创建使用本地 Embedding 和 Qdrant 的 RAG 服务。"""
    # Docker Compose 暴露的 Qdrant 客户端。
    qdrant = QdrantClient("http://127.0.0.1:6333", COLLECTION_NAME)
    return RagService(qdrant, LocalEmbeddingModel())


SERVICE = create_service()


def import_ai_manual() -> dict[str, int]:
    """重建 collection 并导入 AI 大模型应用开发目录中的 Markdown。"""
    if not SERVICE.qdrant.healthy():
        raise RuntimeError("Qdrant 不可用，请先运行 docker compose up -d qdrant")
    SERVICE.qdrant.recreate_collection()
    SERVICE.documents.clear()
    # 扫描完整 AI 应用知识集，排除会重复展示代码的实验目录。
    markdown_files = [path for path in AI_KNOWLEDGE_ROOT.rglob("*.md") if "lab" not in path.parts]
    # 本次导入的 chunk 总数。
    chunk_count = 0
    for file_path in markdown_files:
        # 文档首个 H1 或文件名作为展示标题。
        markdown = file_path.read_text(encoding="utf-8")
        # 当前文档的首行标题。
        title = next((line[2:].strip() for line in markdown.splitlines() if line.startswith("# ")), file_path.stem)
        # 相对知识根目录的可追溯来源。
        source = str(file_path.relative_to(AI_KNOWLEDGE_ROOT))
        chunk_count += SERVICE.add_document(title, source, markdown, tenant_id="demo", acl="employee")
    return {"documents": len(markdown_files), "chunks": chunk_count}


class RagHandler(SimpleHTTPRequestHandler):
    """提供静态工作台和知识库 REST API。"""

    def __init__(self, *args: object, **kwargs: object) -> None:
        """固定静态文件根目录。"""
        super().__init__(*args, directory=str(STATIC_DIRECTORY), **kwargs)

    def send_json(self, status_code: int, payload: dict[str, Any]) -> None:
        """返回 UTF-8 JSON。"""
        # 编码后的响应体。
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> dict[str, Any]:
        """读取并校验对象类型 JSON 请求体。"""
        # 客户端声明的请求体长度。
        content_length = int(self.headers.get("Content-Length", "0"))
        # JSON 解码后的对象。
        payload = json.loads(self.rfile.read(content_length))
        if not isinstance(payload, dict):
            raise ValueError("请求体必须是 JSON 对象")
        return payload

    def do_GET(self) -> None:
        """处理健康、文档和 Trace 查询，其余交给静态文件服务。"""
        if self.path == "/health":
            # Qdrant 可用性决定是否能读取真实持久化点数。
            qdrant_healthy = SERVICE.qdrant.healthy()
            # 即使导入由另一个进程完成，也从 collection 读取真实点数。
            indexed_chunks = SERVICE.qdrant.indexed_point_count() if qdrant_healthy else 0
            self.send_json(200, {"status": "ok", "qdrant": qdrant_healthy, "sessionDocuments": len(SERVICE.documents), "indexedChunks": indexed_chunks})
            return
        if self.path == "/api/knowledge/documents":
            self.send_json(200, {"documents": SERVICE.documents})
            return
        if self.path == "/api/rag/logs":
            self.send_json(200, {"logs": SERVICE.logs[-50:]})
            return
        if self.path.startswith("/api/rag/logs/"):
            # 路径最后一段是待查询 requestId。
            request_id = self.path.rsplit("/", 1)[-1]
            # 对应 requestId 的 Trace。
            trace = next((item for item in SERVICE.logs if item["requestId"] == request_id), None)
            self.send_json(200 if trace else 404, trace or {"error": "trace_not_found"})
            return
        super().do_GET()

    def do_POST(self) -> None:
        """处理文档新增、批量导入和在线问答。"""
        try:
            # 当前接口的 JSON 请求对象。
            payload = self.read_json()
            if self.path == "/api/knowledge/documents":
                # 文档展示标题。
                title = str(payload.get("title", "")).strip()
                # 文档可追溯来源。
                source = str(payload.get("source", "manual")).strip()
                # 待切分入库的 Markdown 正文。
                text = str(payload.get("text", "")).strip()
                if not title or not text:
                    raise ValueError("title 和 text 不能为空")
                # 新文档生成的 chunk 数。
                chunk_count = SERVICE.add_document(title, source, text, "demo", "employee")
                self.send_json(201, {"title": title, "chunks": chunk_count})
                return
            if self.path == "/api/knowledge/import-agent-manual":
                self.send_json(200, import_ai_manual())
                return
            if self.path == "/api/rag/chat":
                # 清洗后的用户问题。
                question = str(payload.get("question", "")).strip()
                if not question:
                    raise ValueError("question 不能为空")
                # 受上限保护的候选数量。
                top_k = int(payload.get("topK", 4))
                self.send_json(200, SERVICE.ask(question, "demo", "employee", top_k))
                return
            self.send_json(404, {"error": "not_found"})
        except (ValueError, json.JSONDecodeError) as error:
            self.send_json(400, {"error": str(error)})
        except RuntimeError as error:
            self.send_json(503, {"error": str(error)})


def main() -> None:
    """检查 Qdrant 并启动 RAG 工作台。"""
    # 命令行参数解析器。
    parser = argparse.ArgumentParser(description="企业知识库 RAG 工作台")
    parser.add_argument("--import-only", action="store_true", help="只重建并导入 Agent 手册")
    # 用户传入的启动参数。
    arguments = parser.parse_args()
    if arguments.import_only:
        print(import_ai_manual())
        return
    # 工作台 HTTP 服务。
    server = ThreadingHTTPServer((HOST, PORT), RagHandler)
    print(f"RAG 工作台：http://{HOST}:{PORT}")
    print(f"Qdrant：{'可用' if SERVICE.qdrant.healthy() else '不可用，请先执行 docker compose up -d qdrant'}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
