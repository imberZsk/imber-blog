# 企业级知识库（2）- 安全文件读取 Tool：从 Demo 到可审计数据入口

> 读完你能：围绕“安全文件读取 Tool：从 Demo 到可审计数据入口”理解“Why：Tool 是权限边界，不只是模型能力”与“How：实现一个可运行的安全读取器”，并结合正文示例完成实践与排障。


让模型“读取文件”并不难，难点是让它只能读取当前用户有权访问的文件，而且每次访问都能追踪。生产系统不能把任意路径直接交给 `open()`：路径穿越、符号链接、超大文件和敏感后缀都可能把一个演示 Tool 变成数据泄露入口。

## 一、Why：Tool 是权限边界，不只是模型能力

文件读取链路应把模型视为不可信调用方。模型只负责提交 `document_id`，服务端负责解析真实路径、检查租户和 ACL、限制文件类型与大小、记录审计事件。不要允许模型传绝对路径，也不要把“模型不会乱传参数”当安全策略。

```mermaid
flowchart LR
    U[用户与身份令牌] --> A[Agent]
    A -->|document_id| T[File Tool]
    T --> P[租户与 ACL 校验]
    P --> R[安全路径解析]
    R --> L[大小与类型限制]
    L --> X[解析和脱敏]
    X --> C[Chunk 与来源元数据]
    T --> O[审计日志]
```


## 二、How：实现一个可运行的安全读取器

### 2.1 环境依赖

```text
# requirements.txt
pydantic>=2,<3
```

Python 3.10+ 示例只读取配置目录内的 UTF-8 文本文件。真实系统还要把 `allowed_document_ids` 换成数据库或权限服务查询，并把审计事件发送到不可篡改日志。

```python
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from pydantic import BaseModel, Field


# 单次允许返回的最大字节数，避免超大文件拖垮 Agent 请求。
MAX_FILE_BYTES = 256 * 1024
# Tool 允许解析的文本后缀，二进制格式应交给隔离解析服务。
ALLOWED_SUFFIXES = {".md", ".txt"}


class ReadFileInput(BaseModel):
    """定义模型可提交的最小参数，不接受真实文件路径。"""

    # 文档服务生成的稳定标识，不允许包含路径语义。
    document_id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,64}$")


@dataclass(frozen=True)
class UserContext:
    """保存调用用户的租户和可访问文档集合。"""

    # 当前请求所属租户，用于隔离审计和数据目录。
    tenant_id: str
    # 权限服务返回的可访问文档 ID 集合。
    allowed_document_ids: frozenset[str]


def read_authorized_file(
    request: ReadFileInput,
    user: UserContext,
    tenant_root: Path,
) -> str:
    """读取已授权文本文件；request 是模型参数，user 是可信身份上下文。"""

    # 规范化后的租户根目录，用于抵御相对路径和符号链接逃逸。
    resolved_root = tenant_root.resolve(strict=True)
    if request.document_id not in user.allowed_document_ids:
        # 权限失败不返回文件是否存在，避免泄露文档标识。
        raise PermissionError("document is not accessible")

    # 文档 ID 映射为受控文件名，模型无法注入目录片段。
    candidate_path = (resolved_root / f"{request.document_id}.md").resolve(strict=True)
    if candidate_path.parent != resolved_root:
        # resolve 后重新检查父目录，可阻止目录中的恶意符号链接。
        raise PermissionError("resolved path escaped tenant root")
    if candidate_path.suffix.lower() not in ALLOWED_SUFFIXES:
        raise ValueError("unsupported file type")

    # 文件元数据用于在实际读取前拒绝过大输入。
    file_size = candidate_path.stat().st_size
    if file_size > MAX_FILE_BYTES:
        raise ValueError("file exceeds size limit")

    # 严格 UTF-8 解码，异常文件进入隔离解析链路，不静默替换乱码。
    content = candidate_path.read_text(encoding="utf-8", errors="strict")
    return content
```

调用时，可信的 `UserContext` 必须来自鉴权中间件，绝不能让模型或浏览器自行提交 `allowed_document_ids`。

## 三、进入 RAG 前的数据契约

读取结果不应只返回一段字符串。后续解析和切分至少保留：`document_id`、`tenant_id`、`document_version`、`source_uri`、`mime_type`、`acl_groups`、`content_hash`。Chunk 继承这些字段，ES 与 VectorDB 才能在检索阶段下推权限条件。

## 四、What：验收与常见坑

- 用 `../secret`、绝对路径、软链接和非法字符攻击 Tool，必须在读取前失败。
- 无权限文档无论存在与否都返回同一类错误，日志中记录 `trace_id`，响应中不暴露路径。
- PDF、Office、图片不能在问答进程里直接解析；进入异步沙箱，设置页数、CPU、内存和超时上限。
- 日志只记文档 ID、权限判定和内容哈希，不记录原文、密钥或用户隐私。
- 重复读取可按 `tenant + document_id + version + parser_version` 缓存，权限摘要必须进入缓存键。

## 五、结论

安全文件 Tool 的核心不是 `read_text()`，而是可信身份、服务端 ID 映射、读取前授权、资源限制和审计。完成这层后，解析、Chunk、Embedding 和检索才有可靠的数据入口。
