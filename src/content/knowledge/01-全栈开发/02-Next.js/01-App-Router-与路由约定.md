# Next.js（01） - App Router 与路由约定

> 读完后，你应能完成以下任务：
> - 绘制“Next.js（01） - App Router 与路由约定 / 为什么不能把 App Router 只理解成“文件即路由””的关键对象与数据流，解释“App Router 真正建立的是一棵 URL、代码边界和 UI 边界相互对应的树。”，并用源码位置、日志或 Trace 标注证据。
> - 为“Next.js（01） - App Router 与路由约定 / 一次请求到底匹配了哪些文件”设计正常与异常输入，验证“DIAGRAM_DESCRIPTION：图中必须包含 URL 分段匹配、根布局、项目布局、动态项目布局、叶子页面，以及等待、404、异常三条分支；”，输出首个偏差位置与回归测试结果。
> - 实现“Next.js（01） - App Router 与路由约定 / 这些特殊文件分别管什么”的最小代码或配置，检验“它适合导航栏、侧栏和共享外壳，不适合依赖“每次进入页面都重新执行”的副作用。”，输出命令、结果与 Diff，并说明不适用边界。

> 本文面向会 React 和 TypeScript、但第一次使用 Next.js App Router 的开发者。示例按 Next.js 16.3.0 编写。读完后，你能从 URL 反推出文件树，能正确放置 `layout`、`page`、`loading`、`error` 和 `not-found`，并能运行一个包含正常、404 和异常分支的动态路由。

# 一、为什么不能把 App Router 只理解成“文件即路由”

“文件即路由”只说对了一半。App Router 真正建立的是一棵 **URL、代码边界和 UI 边界相互对应的树**。

例如产品地址是 `/projects/42/settings`，你至少要回答四个问题：

- 哪些布局在页面切换后继续保留？
- 项目 `42` 不存在时，由哪一级显示 404？
- 设置页渲染失败时，错误会不会拖垮整站？
- 用户能访问 `/projects/42`，是否就代表他有权读取项目 `42`？

如果这些问题没有先定清楚，目录虽然能跑，后面通常会出现布局放错、错误边界过大、重复请求和越权读取。本文只解决路由和边界设计；Server/Client Component、数据缓存和 Server Action 分别由后续文章展开。

本文完成后的可验证结果是：

- 能把 `/projects/[id]/settings` 映射成正确的 App Router 文件树。
- 能说明同层特殊文件的输入、作用范围和失败边界。
- 能用 `pnpm dev` 验证正常页面、资源不存在和服务端异常三条路径。
- 能识别“动态参数合法”与“当前用户有权限”是两次不同的校验。

# 二、一次请求到底匹配了哪些文件

App Router 会把 URL 拆成 segment。普通文件夹生成固定 segment，`[id]` 生成动态 segment，最末端的 `page.tsx` 才让这条路径真正可访问。沿途的 `layout.tsx` 会从外到内包住页面。

```mermaid
flowchart LR
  URL["GET /projects/42/settings"] --> MATCH["匹配 URL segments"]
  MATCH --> ROOT["app/layout.tsx"]
  ROOT --> PROJECTS["projects/layout.tsx（可选）"]
  PROJECTS --> ID["[id]/layout.tsx（可选）"]
  ID --> PAGE["settings/page.tsx"]
  PAGE --> RESULT{"渲染结果"}
  RESULT -->|等待| LOADING["loading.tsx"]
  RESULT -->|抛出 notFound()| NOT_FOUND["not-found.tsx"]
  RESULT -->|抛出异常| ERROR["error.tsx"]
```

`DIAGRAM_DESCRIPTION`：图中必须包含 URL 分段匹配、根布局、项目布局、动态项目布局、叶子页面，以及等待、404、异常三条分支；重点表达特殊文件的作用域跟随目录层级，而不是全局生效。

## 2.1 这些特殊文件分别管什么

| 文件 | 输入与输出 | 作用范围 | 最容易放错的地方 |
|---|---|---|---|
| `page.tsx` | 接收路由参数，输出该路径的页面 UI | 当前 segment | 把它当成通用组件到处导入 |
| `layout.tsx` | 接收 `children`，输出可复用外壳 | 当前 segment 及子树 | 把每次导航都要刷新的逻辑放进持久布局 |
| `loading.tsx` | 输出 Suspense 回退 UI | 当前 segment 及子树 | 请求太快时误以为它没有生效 |
| `error.tsx` | 接收 `error`、`reset`，输出错误 UI | 当前 segment 的子树 | 期待它捕获同层 `layout.tsx` 自己的异常 |
| `not-found.tsx` | 输出资源不存在时的 UI | `notFound()` 所在边界 | 把无权限也伪装成普通空数据 |
| `route.ts` | 接收 Web `Request`，输出 `Response` | 当前 URL 的 HTTP 接口 | 与同层 `page.tsx` 同时占用同一路由 |

`layout.tsx` 在客户端导航时会保留，不会像普通页面一样每次重新挂载。它适合导航栏、侧栏和共享外壳，不适合依赖“每次进入页面都重新执行”的副作用。`error.tsx` 必须是 Client Component；而且它捕获的是当前 segment **下面** 的错误，同层 `layout.tsx` 的错误需要由父级错误边界处理。

## 2.2 文件夹不一定都会出现在 URL 中

下面四种命名解决的是不同问题：

| 写法 | 示例 | 是否进入 URL | 使用场景 |
|---|---|---:|---|
| 普通 segment | `projects` | 是 | 稳定的产品路径 |
| 动态 segment | `[id]` | 是 | 单个项目、订单或用户 |
| Route Group | `(workspace)` | 否 | 整理源码、划分布局，不改变公开 URL |
| 私有文件夹 | `_components` | 否 | 明确标记非路由实现文件 |

`[...slug]` 匹配一个或多个剩余 segment，`[[...slug]]` 连零个 segment 也能匹配。只有确实需要不定层级路径时才使用 catch-all；普通详情页优先使用 `[id]`，否则参数类型和 404 规则都会更难理解。

Route Group 只是代码组织工具，不是 URL 命名空间。两个 Group 如果最终生成相同 URL，构建会冲突；如果使用多个根布局，跨根布局导航会触发完整页面加载。这些行为应在设计 URL 时确认，而不是上线后才靠点击测试发现。

# 三、动手做一个能验证三条分支的项目

这个示例完成 `/projects/[id]/settings`：项目 `42` 正常显示，其他数字返回 404，项目 `500` 模拟数据源异常并进入错误边界。延迟只用于在开发环境观察 `loading.tsx`，不是生产建议。

## 3.1 创建项目和文件结构

需要 Node.js 20.9+ 和 pnpm。以下命令会创建 TypeScript App Router 项目：

```bash
pnpm create next-app@16.3.0 next-route-lab \
  --ts --eslint --app --use-pnpm --empty --yes \
  --import-alias "@/*"
cd next-route-lab
```

保留脚手架生成的配置，删除示例 `app/page.tsx`，然后把 `app` 和 `lib` 调整为：

```text
next-route-lab/
├── app/
│   ├── layout.tsx
│   └── projects/
│       └── [id]/
│           ├── settings/
│           │   ├── error.tsx
│           │   ├── loading.tsx
│           │   ├── not-found.tsx
│           │   └── page.tsx
└── lib/
    └── projects.ts
```

## 3.2 准备根布局和数据函数

`app/layout.tsx` 是根布局，必须包含 `html` 和 `body`：

```tsx
import type { ReactNode } from 'react'

/** 根布局接收的页面子树。 */
interface RootLayoutProps {
  /** 当前路由匹配出的页面内容。 */
  children: ReactNode
}

/** 为所有路由提供最小 HTML 外壳。 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
```

`lib/projects.ts` 用内存数据模拟数据库。项目 `500` 专门用于验证异常边界：

```typescript
/** 页面需要的最小项目数据。 */
export interface Project {
  /** 项目的稳定业务 ID。 */
  id: string
  /** 页面展示的项目名称。 */
  name: string
}

/** 开发示例允许访问的项目集合。 */
const PROJECTS: ReadonlyMap<string, Project> = new Map([
  ['42', { id: '42', name: 'Knowledge Base' }]
])

/** 模拟读取项目；ID 500 用来验证服务端异常分支。 */
export async function findProject(projectId: string): Promise<Project | null> {
  // 延迟让开发环境中的 loading.tsx 有机会显示，生产代码不要人为等待。
  await new Promise((resolve) => setTimeout(resolve, 400))

  if (projectId === '500') {
    throw new Error('模拟项目服务不可用')
  }

  return PROJECTS.get(projectId) ?? null
}
```

## 3.3 实现页面和三个状态边界

Next.js 16 的动态路由 `params` 是 Promise，页面必须先 `await`。路径参数来自用户输入，先验证格式，再访问数据源：

```tsx
// app/projects/[id]/settings/page.tsx
import { notFound } from 'next/navigation'
import { findProject } from '@/lib/projects'

/** 项目设置页接收的动态路由参数。 */
interface ProjectSettingsPageProps {
  /** Next.js 延迟解析的项目 ID。 */
  params: Promise<{ id: string }>
}

/** 允许进入数据查询的项目 ID 格式。 */
const PROJECT_ID_PATTERN = /^\d+$/

/** 校验项目 ID、读取资源并渲染设置页。 */
export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  /** URL 中解包后的项目 ID。 */
  const { id } = await params

  if (!PROJECT_ID_PATTERN.test(id)) {
    notFound()
  }

  /** 当前 ID 对应的项目；不存在时不向组件传递空值。 */
  const project = await findProject(id)
  if (!project) {
    notFound()
  }

  return (
    <main>
      <p>项目 ID：{project.id}</p>
      <h1>{project.name} 设置</h1>
    </main>
  )
}
```

```tsx
// app/projects/[id]/settings/loading.tsx

/** 在设置页服务端渲染尚未完成时提供回退内容。 */
export default function SettingsLoading() {
  return <p role="status">正在读取项目设置...</p>
}
```

```tsx
// app/projects/[id]/settings/not-found.tsx
import Link from 'next/link'

/** 告知用户项目不存在，并提供可恢复的返回路径。 */
export default function ProjectNotFound() {
  return (
    <main>
      <h1>没有找到这个项目</h1>
      <Link href="/projects/42/settings">打开示例项目</Link>
    </main>
  )
}
```

```tsx
// app/projects/[id]/settings/error.tsx
'use client'

import { useEffect } from 'react'

/** 设置页错误边界接收的异常和重试入口。 */
interface SettingsErrorProps {
  /** 服务端或客户端渲染阶段抛出的异常。 */
  error: Error & { digest?: string }
  /** 请求重新渲染当前错误边界的函数。 */
  reset: () => void
}

/** 隔离设置页异常，并允许用户主动重试。 */
export default function SettingsError({ error, reset }: SettingsErrorProps) {
  useEffect(() => {
    // 生产环境应上报 digest 和路由模板，不要把敏感异常详情展示给用户。
    console.error('项目设置页渲染失败', { digest: error.digest })
  }, [error])

  return (
    <main>
      <h1>项目设置暂时不可用</h1>
      <button type="button" onClick={reset}>重试</button>
    </main>
  )
}
```

## 3.4 启动、输入和预期结果

```bash
pnpm dev
```

依次访问：

| 输入 | 预期结果 | 验证重点 |
|---|---|---|
| `/projects/42/settings` | 显示 `Knowledge Base 设置` | 动态参数和正常数据链路 |
| `/projects/999/settings` | 显示“没有找到这个项目” | `notFound()` 进入最近的 404 UI |
| `/projects/abc/settings` | 显示“没有找到这个项目” | 非法参数没有进入数据查询 |
| `/projects/500/settings` | 显示“项目设置暂时不可用” | 异常被局部 `error.tsx` 隔离 |

最后执行生产构建：

```bash
pnpm build
```

构建成功只能证明目录和类型基本正确。还要在浏览器内从一个页面导航到另一个页面，观察 loading、错误边界和布局是否按预期保留。使用流式响应时，`notFound()` 页面可能返回 HTTP 200 并附带 `noindex`；非流式响应才返回 404，因此监控不能只依赖状态码判断业务资源是否存在。

# 四、生产项目怎么划分路由边界

## 4.1 URL 是产品契约，不是源码目录的镜像

需要分享、收藏、刷新后恢复或进入审计日志的状态，应放入路径或查询参数。弹窗开关、临时选中项等纯视觉状态留在组件中。源码团队划分可以用 Route Group 表达，不要为了迁就代码目录频繁改公开 URL。

新增路由前按这个顺序决策：

1. 先写出用户应该看到的稳定 URL。
2. 再确定哪些页面共享布局、加载态和错误边界。
3. 然后决定动态参数的格式以及资源不存在的行为。
4. 最后才把 URL 映射为目录，不要反过来从文件夹“拼”产品路径。

## 4.2 路由匹配成功不等于有权限

`[id]` 只负责取出字符串，不负责证明 ID 存在，更不负责证明当前用户有权访问。真实查询必须同时带上用户或租户边界，例如使用 `WHERE id = ? AND tenant_id = ?`，而不是先按 ID 查出对象再在页面层隐藏。

页面鉴权也不能替代 Route Handler 或 Server Action 的鉴权，因为它们都是可以被单独请求的服务端入口。对“无权限”和“不存在”是否统一返回 404，要根据防资源枚举策略决定；无论页面文案如何，服务端日志都应保留可审计的真实原因。

## 4.3 把错误边界放在能够恢复的位置

错误边界越靠上，兜底范围越大，但一次局部故障影响的 UI 也越多。项目设置失败时，通常应保留全站导航和项目侧栏，只替换设置内容区。对错误日志至少记录路由模板、Trace ID、错误 digest 和部署版本；原始路径参数可能包含业务标识，写日志前需要按隐私规则处理。

# 五、四类常见问题怎么定位

| 现象 | 根因 | 怎么定位 | 修复方式 | 防止复发 |
|---|---|---|---|---|
| 访问目录一直 404 | 只有文件夹或组件，没有 `page.tsx` | 对照 URL 从 `app` 根逐段检查，确认叶子存在 `page.tsx` | 在可访问 segment 增加 `page.tsx` | 为关键 URL 增加端到端冒烟测试 |
| `error.tsx` 没接住异常 | 异常来自同层 `layout.tsx`，不在该边界子树内 | 临时在 page 和 layout 分别抛错，确认实际故障层级 | 把边界上移到父 segment，或把高风险逻辑下移 | 设计评审时标明每个错误边界的覆盖子树 |
| 两个目录生成同一 URL | Route Group 不进入 URL，最终路径发生冲突 | 执行 `pnpm build`，根据冲突路径反查各 Group | 调整公开 segment，确保每个 URL 唯一 | CI 强制执行生产构建 |
| 用户读到了别人的项目 | 只校验 `id`，查询没有附带用户或租户条件 | 用两个租户的账号请求同一 ID，检查 SQL 和审计日志 | 在数据访问层同时过滤资源 ID 与租户 ID | 增加跨租户负向测试，不依赖前端隐藏 |
| loading 几乎看不到 | 数据立即返回，或边界放得离异步组件太远 | 在开发环境临时增加可控延迟，观察 Network 和 React DevTools | 把 `loading.tsx` 放到真正需要回退的 segment | 自动化测试断言最终内容，不依赖 loading 停留时长 |

不要用“把所有文件移到根目录”来修复路由问题。先确认失败属于 URL 匹配、资源查询、权限判断还是渲染边界，四者的修复位置完全不同。

# 六、上线前按什么验收

- [ ] 每条公开 URL 都能从产品语义解释，而不是由源码目录偶然决定。
- [ ] 正常、非法参数、资源不存在、无权限和服务异常都有明确结果。
- [ ] `page.tsx` 只负责路由编排，可复用 UI 已下沉为普通组件。
- [ ] 动态参数在查询前完成格式校验，数据访问同时包含用户或租户条件。
- [ ] 错误只替换预期子树，导航和其他可用区域不会一起消失。
- [ ] 日志包含路由模板、Trace ID、digest 和版本，但不泄露敏感参数。
- [ ] `pnpm build`、直接刷新和客户端导航全部通过。
- [ ] 旧 URL 调整时有重定向、监控和可回滚方案。

## 学完自测

## 6.1 场景选择：目录怎么设计

产品要求外部 URL 固定为 `/settings/profile`，但团队想把源码按 `(account)` 分组，并让设置页共享导航。哪种结构最合适？

A. `app/account/settings/profile.tsx`  
B. `app/(account)/settings/layout.tsx` 与 `app/(account)/settings/profile/page.tsx`  
C. `app/[account]/settings/profile/page.tsx`  
D. `app/(account)/settings/profile/route.ts`

**答案：B。** Route Group `(account)` 不进入 URL，`settings/layout.tsx` 提供共享外壳，`profile/page.tsx` 让目标路径可访问。A 既会生成多余的 `account` segment，也缺少 `page.tsx` 约定；C 把固定分组误建成用户可控动态参数；D 创建的是 HTTP Handler，不是页面 UI。

## 6.2 多选：哪些说法成立

关于 `app/projects/[id]/settings/error.tsx`，哪些判断正确？

A. 文件必须是 Client Component。  
B. 它能捕获同层 `settings/layout.tsx` 自己抛出的异常。  
C. `reset()` 会尝试重新渲染当前错误边界。  
D. 页面应直接把服务端异常堆栈展示给用户，方便排查。

**答案：A、C。** `error.tsx` 需要客户端交互能力，因此必须声明 `'use client'`；`reset()` 用于重新尝试渲染该边界。错误边界只包裹当前 segment 的子树，不能捕获同层 layout 自己的错误，所以 B 错；生产异常可能包含路径、SQL 或密钥信息，应记录到受控日志而不是展示，D 错。

## 6.3 故障分析：为什么出现越权

页面先检查 `/projects/[id]` 中的 `id` 是数字，再执行 `SELECT * FROM projects WHERE id = ?`。攻击者把 URL 中的 ID 换成另一个租户的项目后读到了数据。根因和正确修复位置是什么？

**答案：** 根因是把“参数格式正确”误当成“当前用户有权访问”。修复应落在服务端数据访问边界：查询同时带上 `project_id` 与 `tenant_id` 或授权主体，并为跨租户 ID 建立负向测试。只在页面隐藏字段、猜测 ID 难以枚举或返回统一 404，都不能修复已经发生的数据越权。

## 6.4 架构设计：错误边界应该放哪里

一个后台页面有全站导航、项目侧栏和设置内容区。设置接口偶发失败，但用户仍需要切换其他项目。应该把最近的 `error.tsx` 放在根目录、项目目录还是设置目录？

**答案：** 优先放在设置目录，让故障只替换设置内容区，保留导航和项目侧栏作为恢复入口。根错误边界仍应存在，用来兜住无法局部恢复的异常；项目级边界适合项目外壳本身失败的情况。判断依据不是“越靠根越安全”，而是故障发生后用户还需要保留哪些可用操作。

# 七、总结

- **为什么不能把 App Router 只理解成“文件即路由”**：App Router 真正建立的是一棵 URL、代码边界和 UI 边界相互对应的树。
- **一次请求到底匹配了哪些文件**：DIAGRAM_DESCRIPTION：图中必须包含 URL 分段匹配、根布局、项目布局、动态项目布局、叶子页面，以及等待、404、异常三条分支；
- **动手做一个能验证三条分支的项目**：这个示例完成 /projects/[id]/settings：项目 42 正常显示，其他数字返回 404，项目 500 模拟数据源异常并进入错误边界。
- **生产项目怎么划分路由边界**：先写出用户应该看到的稳定 URL。 -> 再确定哪些页面共享布局、加载态和错误边界。 -> 然后决定动态参数的格式以及资源不存在的行为。 -> 最后才把 URL 映射为目录，不要反过来从文件夹“拼”产品路径。
- **四类常见问题怎么定位**：| error.tsx 没接住异常 | 异常来自同层 layout.tsx，不在该边界子树内 | 临时在 page 和 layout 分别抛错，确认实际故障层级 | 把边界上移到父 segment，或把高风险逻辑下移 | 设计评审时标明每个错误边界的覆盖子树 |
- **上线前按什么验收**：[ ] 每条公开 URL 都能从产品语义解释，而不是由源码目录偶然决定。

## 参考资料

- [Next.js：Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [Next.js：Installation](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js：Layouts and Pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages)
- [Next.js：Dynamic Segments](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes)
- [Next.js：Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups)
- [Next.js：error.js](https://nextjs.org/docs/app/api-reference/file-conventions/error)
- [Next.js：not-found.js](https://nextjs.org/docs/app/api-reference/file-conventions/not-found)
