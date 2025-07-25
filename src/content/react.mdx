### 文档

- [React 官网](https://react.docschina.org/)
- [dan 博客](https://overreacted.io/)
- [React 通关秘籍](https://juejin.cn/book/7294082310658326565?scrollMenuIndex=1)
- [玩转 React Hooks](https://juejin.cn/book/7230622711905517605?scrollMenuIndex=1)
- [Build Your Own React](https://pomb.us/build-your-own-react/)
- [React 进阶实践指南](https://juejin.cn/book/6945998773818490884?scrollMenuIndex=1)
- [React 技术揭秘](https://react.iamkasong.com/)
- [从0实现 React18](https://appjiz2zqrn2142.xet-pc.citv.cn/p/t_pc/goods_pc_detail/goods_detail/p_638035c1e4b07b05581d25db?fromH5=true&type=3)
- [源码流程图](https://www.processon.com/view/link/63bcef8cf27176074bb81a21)
- [深入浅出 React19](https://blog.xiguadev.com/)
- [我的源码调试 Demo](https://github.com/imberZsk/react/tree/main/debugger)
- [我的 React 学习 Demo](https://github.com/imberZsk/demos/tree/main/003react-learn)

学习源码推荐看一遍 Build Your Own React，了解基本流程，再边调试源码边看源码流程图

### 手写 Context 主题切换

Theme-context.tsx 通过 createContext 创建一个 Context 对象，传入默认值，同事封装一个 hook 用于获取 Context 对象

```tsx
import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark'

type ThemeContextType = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {}
})

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
```

Theme-provider.tsx，通过 value 属性`提供` Context 对象

```tsx
import { useState } from 'react'
import { ThemeContext, type Theme } from './theme-context'

export const ThemeProvider = ({ children }: { children: React.ReactElement }) => {
  const [theme, setTheme] = useState<Theme>('dark')

  const value = {
    theme,
    setTheme
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
```

Consumer.tsx，Consumer 组件，用于`消费` Context 对象， useContext 在前面已经封装好了

```tsx
import { ThemeContext } from './theme-context'
import { ThemeProvider } from './theme-provider'
import { useContext } from 'react'

const InnerContext = () => {
  const { theme, setTheme } = useContext(ThemeContext)

  return (
    <div className="size-40 bg-gray-200">
      <button className="cursor-pointer" onClick={() => setTheme('light')}>
        切换主题
      </button>
      <p>当前主题: {theme}</p>
    </div>
  )
}

const ContextTheme = () => {
  return (
    <ThemeProvider>
      <InnerContext />
    </ThemeProvider>
  )
}

export default ContextTheme
```

### React 优化将变的部分与不变部分分离

普通的性能优化有 React.memo 和 useMemo 和 useCallback，React.lazy 等

将变的部分与不变部分分离，这种思路可以减少父组件更新，子组件也更新，减少不必要的渲染

父组件（父组件更新，子组件也更新）

```tsx
import { useState } from 'react'
import Expensive from './Expensive'

const Index = () => {
  const [count, setCount] = useState(0)

  return (
    <div>
      <div>count: {count}</div>
      <br />
      <button className="cursor-pointer rounded-md bg-blue-500 p-2 text-white" onClick={() => setCount(count + 1)}>
        点击加1
      </button>
      <br />
      <br />
      <Expensive />
    </div>
  )
}

export default Index
```

子组件（耗时组件）

```tsx
const Expensive = () => {
  console.log('Expensive 组件渲染')

  const now = performance.now()

  while (performance.now() - now < 1000) {
    // 模拟耗时操作
  }

  return (
    <div>
      <div>Expensive</div>
    </div>
  )
}

export default Expensive
```

可以把父组件需要更新的部分，也就是下面这段代码单独抽离成一个组件

```jsx
<div>count: {count}</div>
<br />
<button
  className="bg-blue-500 text-white p-2 rounded-md cursor-pointer"
  onClick={() => setCount(count + 1)}
>
  点击加1
</button>
```

### 手写 KeepAlive
