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

## 参考资料

- [Electron Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)

