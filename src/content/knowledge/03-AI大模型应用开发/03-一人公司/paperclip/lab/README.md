- UI 面板：http://127.0.0.1:3100
- API：http://127.0.0.1:3100/api
- Health：返回 {"status":"ok","version":"0.3.1"}
- 模式：local_trusted（本地可信模式）
- 数据库：内嵌 PostgreSQL，端口 54329

和你之前用 npx paperclipai run 的效果一样，但现在是从源码运行的，你可以直接修改 server/、ui/ 等目录下的代码，改动会通过 watch 模式自动热重载。

你可以在浏览器打开 http://localhost:3100 看看面板。
