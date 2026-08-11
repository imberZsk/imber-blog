"""模拟 Coze Bot 选择并执行插件的调用流程。"""

from __future__ import annotations

from collections.abc import Callable

Plugin = Callable[[dict[str, str]], dict[str, str]]


def weather_plugin(arguments: dict[str, str]) -> dict[str, str]:
    """返回离线天气；arguments 必须包含 city。"""
    # Bot 从问题中抽取并传入的城市。
    city = arguments.get("city", "未知城市")
    return {"city": city, "weather": "晴", "temperature": "26°C"}


def policy_plugin(arguments: dict[str, str]) -> dict[str, str]:
    """返回企业制度；arguments 必须包含 topic。"""
    # Bot 从问题中抽取的制度主题。
    topic = arguments.get("topic", "未知主题")
    return {"topic": topic, "content": "报销需在30天内提交"}


def run_bot(question: str, plugins: dict[str, Plugin]) -> str:
    """选择插件、构造参数、执行并生成回答。"""
    if "天气" in question:
        tool_name, arguments = "weather", {"city": "成都"}
    else:
        tool_name, arguments = "policy", {"topic": "报销"}
    print(f"Bot 选择插件={tool_name} 参数={arguments}")
    # 平台只执行已注册的插件函数。
    result = plugins[tool_name](arguments)
    return f"插件结果：{result}"


def main() -> None:
    """运行天气和制度两类插件调用。"""
    # Coze 平台中的插件注册表。
    plugins: dict[str, Plugin] = {"weather": weather_plugin, "policy": policy_plugin}
    for question in ("成都天气怎么样？", "报销制度是什么？"):
        print(question, "->", run_bot(question, plugins))


if __name__ == "__main__":
    main()
