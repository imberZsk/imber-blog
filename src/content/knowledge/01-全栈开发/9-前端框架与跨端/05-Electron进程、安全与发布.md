# 前端框架与跨端（05） - Electron 进程、安全与发布

> 读完你能：划分主进程、渲染进程和 preload 权限，并通过受控 IPC 暴露最小桌面能力。

## 核心知识清单

- 主进程、渲染进程与 preload
- contextIsolation、sandbox 与 nodeIntegration
- IPC Schema、来源校验与最小能力
- 窗口生命周期、深链与单实例
- 自动更新、代码签名与回滚
- 崩溃日志、版本追踪与跨平台打包

## 安全桥接

渲染进程按不可信网页处理，关闭 `nodeIntegration`，开启 `contextIsolation` 和 sandbox。preload 通过 `contextBridge` 暴露少量具名方法，不直接暴露 `ipcRenderer` 或任意文件系统。

```ts
contextBridge.exposeInMainWorld('desktop', {
  openDocument: (documentId: string) => ipcRenderer.invoke('document:open', { documentId })
})
```

主进程校验消息来源、参数 Schema、用户权限和目标路径。自动更新包需要签名与完整性验证；发布时记录应用版本、资源版本和更新通道，失败可退回已签名旧版。

## IPC 契约与故障边界

每个 Channel 对应一个具体用例，定义请求、响应和错误码；不要提供 `invoke(channel, payload)` 形式的任意转发。主进程从可信会话解析用户和工作区，模型或渲染层传入的文件路径先规范化，再确认位于允许根目录。事件订阅必须返回取消函数，窗口销毁时解除，避免重复监听和内存泄漏。

若渲染进程能读取任意本地文件，检查 preload 是否暴露了 Node 对象或宽泛路径 API；若 IPC 偶发响应两次，检查窗口重建后监听器是否重复注册；若更新后白屏，保留旧资源版本与启动健康标记，在新版本连续启动失败时回滚，而不是只重试下载。

## 发布验收

在 macOS、Windows 和目标 Linux 发行版验证签名、自动更新、协议深链、单实例和离线启动。崩溃报告只携带版本、平台、堆栈和去敏上下文；上传前取得用户授权，不包含文档正文和密钥。

## 参考资料

- [Electron Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
