# 前端框架（04） - Electron、小程序与跨端安全边界

> 跨端框架让前端获得原生能力，也把 Web 输入带进更高权限环境；设计重点是最小桥接面而不是“API 能不能调”。

## 学习目标

- 解释 Electron 主进程、渲染进程和 Preload 的权限边界。
- 设计小程序登录、存储、分包和授权失败的状态处理。
- 根据离线、原生能力、发布和安全约束选择跨端方案。

## 一、Electron 的三个边界

- 主进程管理窗口、文件和系统能力，不渲染不可信页面。
- 渲染进程按 Web 页面看待，启用 contextIsolation 和 sandbox，关闭 Node integration。
- Preload 只通过 `contextBridge` 暴露少量、可校验的领域方法。

IPC 处理器必须校验发送方、参数 Schema 和权限。不要暴露 `run(command)`、`readFile(path)` 这类任意能力，应暴露 `selectDocument()`、`saveDraft(documentId, content)` 等受限接口。

## 二、小程序边界

小程序页面、组件和服务端接口仍遵循“客户端不可信”。`setData` 应控制体积与频率；登录 code 只能在服务端换取会话；授权弹窗不等于业务权限。分包和本地缓存优化启动速度，但缓存内容需要版本与失效策略。

## 三、跨端决策

| 需求 | 优先考虑 | 核心风险 |
| --- | --- | --- |
| 离线桌面与系统集成 | Electron | IPC、升级、签名与供应链 |
| 微信生态入口 | 原生小程序 | 登录、包体、平台能力差异 |
| 移动端原生体验 | React Native 等 | 原生模块与发布链路 |
| 可安装 Web | PWA | 浏览器能力和离线一致性 |

## 四、上线验收

- Electron 导航、外链、IPC、自动更新和签名策略经过安全测试。
- 小程序在弱网、冷启动、授权拒绝、会话过期和分包失败下有明确状态。
- Web 与原生共享业务 Schema，但不共享超出平台边界的权限实现。

## 参考资料

- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [微信小程序运行机制](https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/operating-mechanism.html)
