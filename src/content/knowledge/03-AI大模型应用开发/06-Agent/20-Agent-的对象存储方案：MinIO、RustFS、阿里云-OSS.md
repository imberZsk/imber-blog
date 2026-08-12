# Agent（20） - Agent 的对象存储方案：MinIO、RustFS、阿里云 OSS

> 读完你能：理解 Agent 项目为什么需要对象存储，以及本地、自建、云 OSS 如何选择。

# 一、本篇定位

这是文件存储工程篇，补齐 RAG 文档、图片、音频、报告等二进制资产的落点。

# 二、一个真实场景

企业知识库会上传 PDF、Word、图片、音频；语音 Agent 会产生录音和 TTS；调研 Agent 会生成报告和截图。这些文件不适合直接塞进数据库，应该放对象存储，数据库只存 URL、key、metadata 和权限。

# 三、核心拆解

- 对象存储按 bucket/key 管文件，适合大文件、非结构化文件和静态资产。
- MinIO 和 RustFS 更适合本地开发或私有化部署，阿里云 OSS 等云服务适合生产托管和弹性容量。
- 对象存储必须和权限系统绑定。不能把私有文档直接暴露永久公开 URL。

# 四、工程链路

- 前端申请上传。
- 后端生成预签名 URL。
- 前端直传对象存储。
- 后端记录文件 metadata。
- 解析服务读取文件并入库。
- 回答引用时返回受控下载链接。

# 五、落地建议

- 上传大文件走预签名直传，减少后端压力。
- 文件 key 要按租户、业务、日期组织。
- 敏感文件链接要短期有效。

# 六、常见坑

- 文件二进制直接存数据库。
- 对象 URL 永久公开。
- 删除知识库记录时忘记清理对象文件。

# 七、和已有主线的关系

17 讲文件解析；88 补文件存储底座，和 91 多模态 RAG 项目强相关。

# 八、设计判断

对象存储和数据库的边界可以这样记：大文件放对象存储，可查询的业务状态放数据库。知识库里一份 PDF 的原文件、OCR 图片、语音录音、生成报告都放对象存储；文件属于哪个用户、解析状态、页数、权限、向量索引状态放数据库。这样文件可以按对象存储的方式扩容，业务查询也不会被大二进制拖慢。

# 九、复述答法

> Agent 项目的 PDF、图片、音频、报告应放对象存储，数据库只存 key 和 metadata。MinIO/RustFS 适合本地或私有化，云 OSS 适合生产。上传用预签名 URL，访问链接要受权限和时效控制。

# 十、总结

- **核心拆解**：对象存储按 bucket/key 管文件，适合大文件、非结构化文件和静态资产。
- **工程链路**：后端记录文件 metadata。
- **常见坑**：删除知识库记录时忘记清理对象文件。
- **本篇定位**：这是文件存储工程篇，补齐 RAG 文档、图片、音频、报告等二进制资产的落点。

## 十、最小可运行示例：S3 兼容对象存储

~~~text
# requirements.txt
boto3
~~~

~~~python
from __future__ import annotations

import os
from pathlib import Path

import boto3


# S3 Endpoint 允许在 MinIO、RustFS 与云 OSS 兼容接口间切换。
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL")
# Bucket 名称由部署环境管理。
S3_BUCKET = os.environ["S3_BUCKET"]
# 单文件上传上限，类型嗅探和病毒扫描应在此前完成。
MAX_UPLOAD_BYTES = 20 * 1024 * 1024
# 客户端从标准环境变量或实例角色读取凭证。
s3_client = boto3.client("s3", endpoint_url=S3_ENDPOINT_URL)


def upload_document(tenant_id: str, document_id: str, file_path: Path) -> str:
    """上传受控文档；租户和文档 ID 组成不可猜测对象键前缀。"""

    # 文件大小在网络上传前检查。
    file_size = file_path.stat().st_size
    if file_size > MAX_UPLOAD_BYTES:
        raise ValueError("document is too large")
    # 对象键不使用用户提交的原始文件名，避免路径和隐私泄露。
    object_key = f"tenants/{tenant_id}/documents/{document_id}/source.bin"
    s3_client.upload_file(
        str(file_path),
        S3_BUCKET,
        object_key,
        ExtraArgs={"ServerSideEncryption": "AES256"},
    )
    return object_key
~~~

Bucket 默认私有，下载使用短期签名 URL；权限判断发生在签名之前。对象版本、内容哈希、扫描状态和删除墓碑进入元数据库，生命周期规则负责临时文件和旧版本成本。

## 参考资料

- [LangChain Agents](https://docs.langchain.com/oss/python/langchain/agents)
- [LangGraph 文档](https://docs.langchain.com/oss/python/langgraph/overview)
