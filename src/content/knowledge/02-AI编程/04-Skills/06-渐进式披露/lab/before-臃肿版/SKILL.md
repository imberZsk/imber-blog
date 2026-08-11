---
name: api-helper
description: 当用户需要调用项目 API、查询接口参数或排查错误码时使用。
---

# API 助手（臃肿版 —— 反面教材）

> ⚠️ 这是反面教材：把所有细节都堆在正文，技能一被触发就全量加载，浪费上下文。

## 完整接口列表

### GET /users
返回用户列表。参数：page（页码，默认1）、size（每页条数，默认20）、sort（排序字段）。返回字段：id、name、email、created_at、status……

### GET /users/{id}
返回单个用户详情。路径参数 id。返回字段：id、name、email、phone、address、created_at、updated_at、roles、permissions……

### POST /users
创建用户。请求体：name（必填）、email（必填）、phone、address……

### PUT /users/{id}
更新用户。请求体同上，均为可选……

### DELETE /users/{id}
删除用户……

（……此处假设还有 196 个接口，每个都这样详细罗列，正文长达 2000+ 行……）

## 错误码大全

- 1001：参数缺失
- 1002：参数格式错误
- 1003：用户不存在
- 1004：权限不足
- 1005：token 过期
- （……此处假设还有 145 个错误码……）

## 调用流程

判断用户操作 → 找到对应接口 → 组装参数 → 处理返回 → 遇错查错误码。
