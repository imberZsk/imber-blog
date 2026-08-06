# Demo 17 · Monitor 实战：盯一个会偶尔报错的日志

提供一个**模拟服务脚本**，会持续往日志里写行，偶尔写一条 ERROR。用来让 Claude 用 Monitor 工具实时盯、出错即报。

## 文件
- `fake-service.sh`：模拟服务，每秒写一行日志，随机偶发 ERROR。
- `三件套对照.md`：Monitor vs /loop vs /goal 怎么选。

## 怎么练
1. 先跑起模拟服务，让它持续写日志：
   ```bash
   bash fake-service.sh
   ```
   （它会把日志写到 service.log，Ctrl+C 停止）
2. 另开一个 Claude 会话，在本目录让它用 Monitor 盯：
   ```
   用 Monitor 工具持续监听 service.log，一旦出现 ERROR 就立刻把那一行和上下文总结给我。persistent 模式。
   ```
3. 体会：错误一出现，事件即时推给 Claude，它马上反应——不用轮询。
