# 前端框架与跨端（09） - Vue 3 组件、组合式 API 与工程实践

> Vue 的响应式只是起点。组件契约、组合逻辑、路由、服务端状态、性能和测试共同决定应用是否可维护。

> 读完你能：使用 SFC、Props/Emit、Slots、provide/inject 和 Composable，并处理 v-model、异步组件、请求缓存与测试。

## 核心知识清单

- 单文件组件 SFC、模板与 `<script setup>`
- Props、Emit、v-model 与单向数据流
- Slots、provide/inject 与组件边界
- ref、reactive、computed、watch 与副作用
- Composable、Pinia、Vue Router 与服务端状态
- 异步组件、Suspense、Key 与性能优化
- Vue Test Utils、Vitest 与可访问性测试

## 组件契约

Props 是只读输入，Emit 表达变化意图；`v-model` 是 Prop + Event 的语法契约，不应让子组件直接修改父状态。Slots 用于结构扩展，provide/inject 适合跨层稳定依赖，但隐藏依赖过多会让组件难测试。

## 组合式 API

ref 保存可替换值，reactive 适合对象状态，computed 表达纯派生，watch 处理明确副作用。不要用 watch 复制能计算出的状态。Composable 封装可复用状态与生命周期，返回清晰 API，并在卸载时取消请求和订阅。

## 应用工程

Pinia 保存少量跨页面客户端状态，Vue Router 将页面状态映射到 URL，服务端数据交给查询缓存。异步组件按路由或低频功能拆包，Key 使用业务身份。大列表、频繁响应式更新和不稳定对象引用需要通过性能工具验证。

Vue Test Utils 关注用户可见行为，Vitest 控制依赖与时间；路由、Store 和网络通过最小替身注入。组件还要测试键盘、焦点、加载、空和错误状态。

## 参考资料

- [Vue Components](https://vuejs.org/guide/essentials/component-basics.html)
- [Vue Composables](https://vuejs.org/guide/reusability/composables.html)
- [Vue Performance](https://vuejs.org/guide/best-practices/performance.html)
- [Vue Test Utils](https://test-utils.vuejs.org/)

