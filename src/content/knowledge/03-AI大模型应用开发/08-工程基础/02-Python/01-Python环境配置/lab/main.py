"""检查运行 AI 应用脚本所需的本地 Python 环境。"""

from __future__ import annotations

import importlib.util
import os
import platform
import shutil
import sys


def main() -> None:
    """打印解释器、虚拟环境、pip、标准库和 API Key 的检查结果。"""
    # 当前解释器是否运行在虚拟环境中。
    in_virtual_environment = sys.prefix != sys.base_prefix
    # 当前 PATH 中解析到的 pip 命令。
    pip_path = shutil.which("pip3") or shutil.which("pip")
    # json 是后续示例依赖的标准库模块。
    json_available = importlib.util.find_spec("json") is not None
    # 只判断密钥是否配置，绝不打印密钥内容。
    api_key_configured = bool(os.getenv("OPENAI_API_KEY"))

    print(f"Python: {platform.python_version()} ({sys.executable})")
    print(f"版本要求: {'通过' if sys.version_info >= (3, 10) else '需要 Python 3.10+'}")
    print(f"虚拟环境: {'已激活' if in_virtual_environment else '未激活'}")
    print(f"pip: {pip_path or '未找到'}")
    print(f"标准库 json: {'可用' if json_available else '不可用'}")
    print(f"OPENAI_API_KEY: {'已配置' if api_key_configured else '未配置（离线实验不受影响）'}")


if __name__ == "__main__":
    main()
