"""实现结构化查询计划、权限校验与安全执行。"""

from __future__ import annotations

from dataclasses import dataclass

ALLOWED_COLUMNS = {"region", "amount"}
ALLOWED_AGGREGATIONS = {"sum", "count"}


@dataclass(frozen=True, slots=True)
class QueryPlan:
    """表示模型只能提出、不能直接执行的查询计划。"""

    # 受后端白名单约束的数据表。
    table: str
    # 参与查询或分组的列。
    columns: tuple[str, ...]
    # 受白名单约束的聚合类型。
    aggregation: str


def validate_plan(plan: QueryPlan, allowed_tables: set[str]) -> None:
    """校验表、列和聚合；非法计划抛出 ValueError。"""
    if plan.table not in allowed_tables:
        raise ValueError("table_forbidden")
    if not set(plan.columns) <= ALLOWED_COLUMNS:
        raise ValueError("column_forbidden")
    if plan.aggregation not in ALLOWED_AGGREGATIONS:
        raise ValueError("aggregation_forbidden")


def execute_plan(plan: QueryPlan, rows: list[dict[str, object]]) -> dict[str, float]:
    """在已授权内存数据上执行计划。"""
    # 按区域聚合的数值结果。
    result: dict[str, float] = {}
    for row in rows:
        # 当前行的分组键。
        region = str(row["region"])
        result[region] = result.get(region, 0.0) + (float(row["amount"]) if plan.aggregation == "sum" else 1.0)
    return result


def main() -> None:
    """模拟自然语言到安全聚合结论的完整路径。"""
    # 模型根据“按区域统计销售额”生成的结构化计划。
    plan = QueryPlan("sales", ("region", "amount"), "sum")
    # 当前登录角色能访问的表。
    allowed_tables = {"sales"}
    # 服务端取出的已授权数据行。
    rows = [{"region": "华东", "amount": 120.0}, {"region": "华东", "amount": 80.0}, {"region": "华南", "amount": 90.0}]
    validate_plan(plan, allowed_tables)
    # 后端执行后的聚合结果。
    result = execute_plan(plan, rows)
    print("查询计划:", plan)
    print("执行结果:", result)
    print("结论:", max(result, key=result.get), "销售额最高")


if __name__ == "__main__":
    main()
