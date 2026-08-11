# 接口列表（第 3 层参考文件，按需加载）

> 这份文档又长又只在「真要调接口」时才查，所以放在 reference/，平时不加载。

## 用户相关

### GET /users
- 说明：返回用户列表
- 参数：page（页码，默认1）、size（每页条数，默认20）、sort（排序字段）
- 返回：id、name、email、created_at、status

### GET /users/{id}
- 说明：返回单个用户详情
- 路径参数：id
- 返回：id、name、email、phone、address、created_at、roles

### POST /users
- 说明：创建用户
- 请求体：name(必填)、email(必填)、phone、address

### PUT /users/{id}
- 说明：更新用户
- 请求体：name、email、phone、address（均可选）

### DELETE /users/{id}
- 说明：删除用户
- 路径参数：id

（真实项目里这份文件可能有几百个接口，全放这层，正文完全不受影响。）
