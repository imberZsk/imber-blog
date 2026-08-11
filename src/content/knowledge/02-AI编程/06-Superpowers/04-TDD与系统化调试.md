# Superpowers（4）- Test Driven Development 与 Systematic Debugging：用证据约束修改

> 读完你能：围绕“Test Driven Development 与 Systematic Debugging：用证据约束修改”理解“TDD 的最小循环”与“调试的四个阶段”，并结合正文示例完成实践与排障。

TDD 用失败测试定义新行为，系统化调试用可复现证据定位已有故障。共同原则是：**没有看到问题，就不要声称修复；没有看到测试先失败，就不知道测试是否真的覆盖需求。**

# 一、TDD 的最小循环

1. 写一个只描述当前行为的测试。
2. 运行它，确认因预期原因失败。
3. 写让测试通过的最小实现。
4. 再次运行测试，确认通过。
5. 保持测试通过的前提下整理代码。

```text
需求：空标题应返回“未命名文章”。
RED：新增空字符串用例，确认当前返回空字符串而失败。
GREEN：只增加空值回退，不重构其他标题逻辑。
VERIFY：运行目标测试，再运行受影响模块测试。
```

# 二、调试的四个阶段

`systematic-debugging`
强调先调查根因：稳定复现、读取错误与调用链、比较正常和异常路径、提出一个可证伪假设，然后只改能验证该假设的最小代码。

常见反模式是连续尝试多个 CSS、超时或空判断，直到现象暂时消失。这样既不知道哪个修改有效，也无法解释为什么不会复发。

# 三、选择哪一个

- 新功能或明确新规则：先 TDD。
- 历史故障、偶发异常、性能退化：先系统化调试。
- 修复根因后：用回归测试固定故障场景。

# 四、官方资料

- [test-driven-development](https://github.com/obra/superpowers/tree/main/skills/test-driven-development)
- [systematic-debugging](https://github.com/obra/superpowers/tree/main/skills/systematic-debugging)

# 五、总结

- **调试的四个阶段**：systematic-debugging
- **选择哪一个**：新功能或明确新规则：先 TDD。
- **官方资料**：test-driven-development
