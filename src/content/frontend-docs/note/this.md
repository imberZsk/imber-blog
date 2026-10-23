import { CodeSandbox } from '@/components/CodeSandbox'

## 复习面试题 - 打印题 - this 指向

### 题目 1：全局环境中的 this

<Sandpack>

```js
import { useState } from 'react'

export default function GlobalThisDemo() {
  const [result, setResult] = useState('')
  function handleClick() {
    setResult(typeof window !== 'undefined' ? (this === window ? 'true' : 'false') : '非浏览器环境')
  }
  return (
    <div>
      <button onClick={handleClick}>测试全局 this</button>
      <div>结果：{result}</div>
    </div>
  )
}
```

</Sandpack>

### 题目 2：对象方法调用

<Sandpack>

```js
import { useState } from 'react'

export default function ObjectMethodDemo() {
  const [result, setResult] = useState('')
  const obj = {
    name: 'Alice',
    greet: function () {
      setResult(`Hello, ${this.name}`)
    }
  }
  return (
    <div>
      <button onClick={() => obj.greet()}>测试对象方法 this</button>
      <div>结果：{result}</div>
    </div>
  )
}
```

</Sandpack>

### 题目 3：嵌套对象方法

<Sandpack>

```js
import { useState } from 'react'

export default function NestedObjectMethodDemo() {
  const [result, setResult] = useState('')
  const obj = {
    name: 'Bob',
    outer: function () {
      function inner() {
        setResult(this?.name)
      }
      inner() // 普通函数调用
    }
  }
  return (
    <div>
      <button onClick={() => obj.outer()}>测试嵌套对象方法 this</button>
      <div>结果：{String(result)}</div>
    </div>
  )
}
```

</Sandpack>

### 题目 4：箭头函数

<Sandpack>

```js
import { useState } from 'react'

export default function ArrowFuncDemo() {
  const [result, setResult] = useState('')
  const obj = {
    name: 'Charlie',
    greet: () => {
      // 箭头函数，直接确定了是obj外层的，也就是undefined
      setResult(`Hello, ${this?.name}`)
    }
  }
  return (
    <div>
      <button onClick={() => obj.greet()}>测试箭头函数 this</button>
      <div>结果：{result}</div>
    </div>
  )
}
```

</Sandpack>

### 题目 5：bind 方法

<Sandpack>

```js
import { useState } from 'react'

export default function BindDemo() {
  const [result, setResult] = useState('')
  const obj = {
    name: 'Grace',
    greet: function () {
      setTimeout(
        function () {
          setResult(`Hello, ${this.name}`)
        }.bind(this),
        1000
      )
    }
  }
  return (
    <div>
      <button onClick={() => obj.greet()}>测试 bind this</button>
      <div>结果：{result}</div>
    </div>
  )
}
```

</Sandpack>

### 题目 6：箭头函数中的 this

<Sandpack>

```js
import { useState } from 'react'

export default function ArrowThisDemo1() {
  const [result, setResult] = useState('')
  const obj = {
    name: 'Ivy',
    greet: function () {
      // 其实是window.setTimeout，所以为undefined
      setTimeout(function () {
        setResult(`Hello, ${this?.name}`)
      }, 1000)
    }
  }
  return (
    <div>
      <button onClick={() => obj.greet()}>测试普通函数 this</button>
      <div>结果：{result}</div>
      <div>解释：输出 Hello, undefined（因为 setTimeout 中的普通函数 this 指向全局）</div>
    </div>
  )
}
```

</Sandpack>

### 题目 7：箭头函数解决 this 问题

<Sandpack>

```js
import { useState } from 'react'

export default function ArrowThisDemo() {
  const [result, setResult] = useState('')
  const obj = {
    name: 'Jack',
    greet: function () {
      setTimeout(() => {
        setResult(`Hello, ${this.name}`)
      }, 1000)
    }
  }
  return (
    <div>
      <button onClick={() => obj.greet()}>测试箭头函数 this 2</button>
      <div>结果：{result}</div>
    </div>
  )
}
```

</Sandpack>

### 题目 8：严格模式下的 this

<Sandpack>

```js
import { useState } from 'react'

export default function StrictModeThisDemo() {
  const [result, setResult] = useState('')

  function test() {
    'use strict'
    setResult(String(this))
  }

  return (
    <div>
      <button onClick={test}>测试严格模式 this</button>
      <div>结果：{result}</div>
      <div>解释：严格模式下普通函数调用时 this 为 undefined</div>
    </div>
  )
}
```

</Sandpack>

### 题目 9：多层嵌套的 this

<Sandpack>

```js
import { useState } from 'react'

export default function NestedThisDemo() {
  const [result, setResult] = useState('')
  const obj = {
    name: 'Kate',
    outer: function () {
      const inner = () => {
        setResult(this.name)
      }
      inner()
    }
  }
  return (
    <div>
      <button onClick={() => obj.outer()}>测试多层嵌套 this</button>
      <div>结果：{result}</div>
      <div>解释：输出 Kate（箭头函数继承外层 this）</div>
    </div>
  )
}
```

</Sandpack>

### 题目 10：方法作为回调函数

<Sandpack>

```js
import { useState, useEffect } from 'react'

export default function CallbackThisDemo() {
  const [result, setResult] = useState('')
  const obj = {
    name: 'Liam',
    greet: function () {
      setResult(`Hello, ${this?.name}`)
    }
  }

  function handleClick() {
    setTimeout(obj.greet, 100)
  }

  return (
    <div>
      <button onClick={handleClick}>测试回调函数 this</button>
      <div>结果：{result}</div>
      <div>解释：输出 Hello, undefined（方法作为回调函数时丢失了 this 绑定）</div>
    </div>
  )
}
```

</Sandpack>

### 题目 11：显示和隐式

[this 指向问题](https://mp.weixin.qq.com/s/hYm0JgBI25grNG_2sCRlTA)

<Sandpack>

```js
import { useState } from 'react'

export default function ComplexThisDemo() {
  const [result, setResult] = useState('')

  // 模拟全局变量
  if (typeof window !== 'undefined') {
    window.name = 'window'
  }

  const person1 = {
    name: 'person1',
    foo1: function () {
      return this.name
    },
    foo2: () => {
      return typeof window !== 'undefined' ? window.name : 'window'
    },
    foo3: function () {
      return function () {
        return typeof window !== 'undefined' ? window.name : 'window'
      }
    },
    foo4: function () {
      return () => {
        return this.name
      }
    }
  }

  const person2 = { name: 'person2' }

  function handleClick() {
    const results = []

    results.push(`person1.foo1(): ${person1.foo1()}`)
    results.push(`person1.foo1.call(person2): ${person1.foo1.call(person2)}`)
    results.push(`person1.foo2(): ${person1.foo2()}`)
    results.push(`person1.foo2.call(person2): ${person1.foo2.call(person2)}`)
    results.push(`person1.foo3()(): ${person1.foo3()()}`)
    results.push(`person1.foo3.call(person2)(): ${person1.foo3.call(person2)()}`)
    results.push(`person1.foo3().call(person2): ${person1.foo3().call(person2)}`)
    results.push(`person1.foo4()(): ${person1.foo4()()}`)
    results.push(`person1.foo4.call(person2)(): ${person1.foo4.call(person2)()}`)
    results.push(`person1.foo4().call(person2): ${person1.foo4().call(person2)}`)

    setResult(results.join('\n'))
  }

  return (
    <div>
      <button onClick={handleClick}>测试复杂 this 指向</button>
      <pre>结果：{result}</pre>
    </div>
  )
}
```

</Sandpack>

### 总结

- 在严格模式下（React 默认严格模式），普通函数的 this 是 undefined，在非严格模式下，普通函数的 this 指向全局对象（浏览器中是 window）
- 箭头函数没有 this，会继承外层作用域的 this，如果用 call 或者 apply 改变 this 指向也没用
- 方法作为回调函数传递时，会丢失原有的 this 绑定，this 会指向全局对象
- 对象方法调用时，this 指向实际调用该方法的对象
