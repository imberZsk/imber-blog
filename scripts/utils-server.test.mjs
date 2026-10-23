import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cn } from '../src/lib/utils/index.ts'

// 回归首页 500：通用类名工具必须能在无浏览器、无编辑器的服务端环境直接导入。
// 若入口再次转导出 Tiptap 工具，测试会在加载模块时失败，而非只检查源码字符串。
test('通用工具入口在服务端可加载，并保留条件类名与 Tailwind 冲突合并能力', () => {
  assert.equal(cn('px-2', { 'font-bold': true, hidden: false }, 'px-4'), 'font-bold px-4')
})
