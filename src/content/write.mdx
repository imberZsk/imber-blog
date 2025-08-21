import { CodeSandbox } from '@/components/CodeSandbox'

## 手写题

### 题目 1：防抖和节流实现

<Sandpack>

```js
import { useState, useRef, useCallback } from 'react'

export default function DebounceThrottleDemo() {
  const [debounceCount, setDebounceCount] = useState(0)
  const [throttleCount, setThrottleCount] = useState(0)
  const debounceRef = useRef(0)
  const throttleRef = useRef(0)

  function debounce(fn, delay) {
    let timer = null
    return function (...args) {
      clearTimeout(timer)
      timer = setTimeout(() => {
        fn.apply(this, args)
      }, delay)
    }
  }

  function throttle(fn, delay) {
    let lastTime = 0
    return function (...args) {
      const now = Date.now()
      if (now - lastTime >= delay) {
        fn.apply(this, args)
        lastTime = now
      }
    }
  }

  // function throttle(fn, delay) {
  //   let timer = null
  //   return function (...args) {
  //     if (!timer) {
  //       timer = setTimeout(() => {
  //         fn.apply(this, args)
  //         timer = null
  //       }, delay)
  //     }
  //   }
  // }

  const handleDebounce = debounce(() => {
    debounceRef.current += 1
    setDebounceCount(debounceRef.current)
  }, 1000)

  // 使用useCallback,避免每次lastTime为0
  const handleThrottle = useCallback(
    throttle(() => {
      throttleRef.current += 1
      setThrottleCount(throttleRef.current)
    }, 2000),
    []
  )

  return (
    <div>
      <button onClick={handleDebounce}>测试防抖</button>
      <span>防抖触发次数：{debounceCount}</span>
      <br />
      <button onClick={handleThrottle}>测试节流</button>
      <span>节流触发次数：{throttleCount}</span>
    </div>
  )
}
```

</Sandpack>

总结：

### 题目 2：new

<Sandpack>

```js
import { useState } from 'react'

export default function NewDemo() {
  const [result, setResult] = useState('')

  function myNew(Fn, ...args) {
    // const obj = {}
    // obj.__proto__ = Fn.prototype
    const obj = Object.create(Fn.prototype)
    const res = Fn.apply(obj, args)
    // 用 instanceof 可以排除 null
    return res instanceof Object ? res : obj
  }

  function handleClick() {
    function Person(name) {
      this.name = name
    }
    const p = myNew(Person, '张三')
    setResult(JSON.stringify(p))
  }

  return (
    <div>
      <button onClick={handleClick}>测试 myNew</button>
      <div>结果：{result}</div>
    </div>
  )
}
```

</Sandpack>

总结：

- 先创建一个空对象，对象的隐式原型指向构造函数的显示原型，用 Object.create 实现更好
- 然后执行构造函数，将构造函数的 this 指向这个空对象，拿到执行结果
- 最后返回这个空对象，如果构造函数返回的是一个对象，则返回这个对象，否则返回这个空对象

Object.create(Fn.prototype) 和 const obj = {} {}.proto = Fn.prototype 其实没有什么大区别，也就是 Object.create 更遵循 ES6 写法规范，两者输出是是一样的

### 题目 3：instanceof

<Sandpack>

```js
import { useState } from 'react'

export default function InstanceOfDemo() {
  const [result, setResult] = useState('')

  function instanceOf(obj, fn) {
    let proto = Object.getPrototypeOf(obj)
    while (proto !== null) {
      if (proto === fn.prototype) return true
      proto = Object.getPrototypeOf(proto)
    }
    return false
  }

  function handleClick() {
    function Person() {}
    const p = new Person()
    setResult(instanceOf(p, Person) ? '是' : '否')
  }

  return (
    <div>
      <button onClick={handleClick}>测试 instanceOf</button>
      <div>结果：{result}</div>
    </div>
  )
}
```

</Sandpack>

总结：

- 核心逻辑是左边的 **proto** 上一直查找有没有等于右边的 prototype，有就返回 true，没有就返回 false
- while 循环，直到 proto 为 null 为止，因为原型链的尽头是 null，退出条件是找到了则返回 true，没找到则在循环外返回 false
- 在循环中 proto = Object.getPrototypeOf(proto) 一直往上找

### 题目 4：拍平数组

<Sandpack>

```js
import { useState } from 'react'

export default function FlatDemo() {
  const [result, setResult] = useState('')

  function flat(arr) {
    return arr.reduce((pre, next) => pre.concat(Array.isArray(next) ? flat(next) : next), [])
  }

  function handleClick() {
    const a = [
      [1, 2],
      [3, 4],
      [2, 3, 4, [7, 4, 9]]
    ]
    setResult(JSON.stringify(flat(a)))
  }

  return (
    <div>
      <button onClick={handleClick}>测试 flat</button>
      <div>结果：{result}</div>
    </div>
  )
}
```

</Sandpack>

总结：

### 题目 5：深拷贝

<Sandpack>

```js
import { useState } from 'react'

export default function DeepCloneDemo() {
  const [result, setResult] = useState('')

  function deepClone(obj, cache = new WeakMap()) {
    if (obj === null || typeof obj !== 'object') return obj
    if (cache.has(obj)) return cache.get(obj)
    if (obj instanceof Date) return new Date(obj)
    if (obj instanceof RegExp) return new RegExp(obj)
    const target = Array.isArray(obj) ? [] : {}
    cache.set(obj, target)
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        target[key] = deepClone(obj[key], cache)
      }
    }
    return target
  }

  function handleClick() {
    const obj = { a: 1, b: { c: 2 } }
    const clone = deepClone(obj)
    setResult(JSON.stringify(clone))
  }

  return (
    <div>
      <button onClick={handleClick}>测试 deepClone</button>
      <div>结果：{result}</div>
    </div>
  )
}
```

</Sandpack>

总结：

### 题目 6：控制请求并发

<Sandpack>

```js
import { useState, useEffect } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  function controlConcurrent(arr, max) {
    let running = 0 // 当前正在执行的请求数
    let index = 0 // 当前要执行的请求索引

    function runNext() {
      // 如果所有请求都已执行完，或者当前正在执行的请求数达到最大值，则返回
      if (index >= arr.length || running >= max) {
        return
      }

      running++ // 增加正在执行的请求数
      const currentIndex = index
      index++

      // 执行当前请求
      arr[currentIndex]()
        .then(() => {
          console.log(`请求 ${currentIndex + 1} 完成`)
        })
        .catch((err) => {
          console.error(`请求 ${currentIndex + 1} 失败:`, err)
        })
        .finally(() => {
          running-- // 减少正在执行的请求数
          runNext() // 执行下一个请求
        })
    }

    for (let i = 0; i < max; i++) {
      runNext()
    }
  }

  const arr = [
    () => fetch('https://imber.netlify.app/api?time=2'),
    () => fetch('https://imber.netlify.app/api?time=3'),
    () => fetch('https://imber.netlify.app/api?time=2'),
    () => fetch('https://imber.netlify.app/api?time=1'),
    () => fetch('https://imber.netlify.app/api?time=3'),
    () => fetch('https://imber.netlify.app/api?time=2')
  ]

  return (
    <div>
      <button onClick={() => controlConcurrent(arr, 3)}>控制请求并发</button>
      <div>结果在控制台查看接口请求</div>
    </div>
  )
}
```

</Sandpack>

总结：

- 递归实现
- 先根据 max 创建 max 个请求，
- 然后定义 runNext 函数
- runNext 核心是两个计数变量，一个记录当前队列的索引 index，一个记录正在执行的请求数 running
- 退出条件是 index >= arr.length 或者 running >= max
- index++ 和 新建一个 const currentIndex = index++ 拿到当前任务的索引来执行
- 最后在 finally 中递归调用 runNext 函数，这时候 running--，实现并发控制

对于 index++ 和 ++index 的区别：

```js
let index = 0
const result = index++
console.log(result) // 输出: 0 (返回自增前的值)
console.log(index) // 输出: 1 (变量已自增)

let index = 0
const result = ++index
console.log(result) // 输出: 1 (返回自增后的值)
console.log(index) // 输出: 1 (变量已自增)
```

### 题目 7：数组转树

<Sandpack>

```js
import { useState } from 'react'

export default function ArrayToTreeDemo() {
  const [result, setResult] = useState('')

  function arrayToTree(items, id = null, link = 'parentId') {
    return items
      .filter((item) => item[link] === id) // 1. 筛选当前层级的节点
      .map((item) => ({
        // 2. 转换每个节点
        ...item, // 3. 保留原有属性
        children: arrayToTree(items, item.id) // 4. 递归查找子节点
      }))
  }

  function handleClick() {
    const arr = [
      { id: 1, parentId: null, name: 'A' },
      { id: 2, parentId: 1, name: 'B' },
      { id: 3, parentId: 1, name: 'C' },
      { id: 4, parentId: 2, name: 'D' }
    ]
    setResult(JSON.stringify(arrayToTree(arr)))
  }

  return (
    <div>
      <button onClick={handleClick}>测试数组转树</button>
      <div>结果：{result}</div>
    </div>
  )
}
```

</Sandpack>

总结：

### 题目 8：大文件上传

### 题目 9：Call

```js
Function.prototype.myCall = function (context, ...args) {
  context = context || window
  const fnKey = Symbol()
  context[fnKey] = this
  const res = context[fnKey](...args) // 相当于谁调用，this就指向谁
  delete context[fnKey]
  return res
}

// 测试示例
function greet(greeting, other) {
  return `${greeting}, ${this.name}${other}`
}

const person = { name: 'Alice' }
greet.myCall(person, 'Hello', '!') // 输出: Hello, Alice!
```

### 题目 10：Apply

```js
Function.prototype.myApply = function (context, argsArray) {
  context = context || window
  const fnKey = Symbol()
  context[fnKey] = this
  const args = Array.isArray(argsArray) ? argsArray : []
  const res = context[fnKey](...args) // 相当于谁调用，this就指向谁
  delete context[fnKey]
  return res
}

// 测试示例
function greet(greeting, other) {
  return `${greeting}, ${this.name}${other}`
}

const person = { name: 'Alice' }
greet.myApply(person, ['Hello', '!']) // 输出: Hello, Alice!
```
