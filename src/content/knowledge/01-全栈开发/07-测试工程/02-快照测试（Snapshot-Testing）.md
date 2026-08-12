# 快照测试（Snapshot Testing）

> 读完你能：围绕“快照测试（Snapshot Testing）”理解“什么是快照测试”与“核心流程”，并结合正文示例完成实践与排障。

## 一、什么是快照测试

快照测试是一种**把某个输出"拍照存档"，之后每次运行都和存档对比**的测试方法。
它不需要手写一条条断言，而是自动记录输出的完整样子，用于发现"意料之外的改动"。

## 二、核心流程

1. **首次运行**：测试框架把被测对象的输出序列化成文本，存成快照文件（如 `__snapshots__/xxx.snap`），这一次默认通过。
2. **后续运行**：再次生成输出，和已存快照逐字符对比。
3. **结果判断**：一致则通过；不一致则失败，并打印差异（diff）。
4. **更新快照**：若差异是预期改动，用 `--update`（如 Jest 的 `jest -u`）刷新快照。

## 三、适用场景

- UI 组件渲染结果（React / Vue 组件的 DOM 结构）
- 复杂对象、API 返回的 JSON 结构
- 序列化输出、配置生成、代码生成器的产物
- 错误信息、日志格式

## 四、优点与缺点

### 优点

- 编写快、覆盖面广
- 能自动捕捉到"意料之外的改动"

### 缺点

- **容易盲目更新**：测试一红就 `-u`，快照失去把关意义
- **快照过大难审查**：几百行的快照，review 时没人真看
- **脆弱**：时间戳、随机 ID、顺序变化都会误报，需要规范化处理

## 五、最佳实践

- 保持快照**小而聚焦**，一个快照只测一件事
- 快照文件纳入**版本控制**，review 时认真看 diff
- 对动态数据（日期、UUID）做 mock 或用属性匹配器（如 Jest 的 `expect.any(String)`）
- 优先用**内联快照**（inline snapshot）写小输出，便于直接在测试文件里查看

## 六、常见工具

| 语言 / 框架 | 工具 |
| ----------- | ---- |
| JavaScript / TypeScript | Jest、Vitest |
| React 组件 | React Testing Library + Jest |
| 端到端 / 视觉回归 | Playwright、Percy |
| Rust | insta |
| Python | syrupy、pytest-snapshot |

## 七、一个简单示例（Jest）

```javascript
// 对函数输出做快照
test("用户对象序列化", () => {
  const user = { id: 1, name: "Alice", role: "admin" };
  // 首次运行生成快照，后续运行与快照对比
  expect(user).toMatchSnapshot();
});

// 内联快照：快照直接写在测试文件里
test("格式化金额", () => {
  expect(formatMoney(1234.5)).toMatchInlineSnapshot(`"¥1,234.50"`);
});
```

## 参考资料

- [Vitest 指南](https://vitest.dev/guide/)
- [Testing Library 原则](https://testing-library.com/docs/guiding-principles)
