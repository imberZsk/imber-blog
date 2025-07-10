import { CodeSandbox } from '@/components/CodeSandbox'

## 复习面试题 - 打印题 - Promise 执行顺序

### 题目 1：async/await

解释：await fn，这个fn仍然是同步，但是 await fn后面的成了微任务，所以会先打印 async1 end

<Sandpack>

```js
import { useState } from 'react'

export default function AsyncAwaitDemo() {
  const [logs, setLogs] = useState([])

  function log(msg) {
    setLogs((prev) => [...prev, msg])
  }

  async function async1() {
    log('async1 start')
    await async2()
    log('async1 end')
  }
  async function async2() {
    log('async2')
  }

  function handleClick() {
    setLogs([])
    log('script start')
    setTimeout(() => log('setTimeout'), 0)
    async1()
    new Promise((resolve) => {
      log('promise1')
      resolve()
    }).then(() => {
      log('promise2')
    })
    log('script end')
  }

  return (
    <div>
      <button onClick={handleClick}>执行 async/await 顺序</button>
      <div>输出：</div>
      <pre>{logs.join('\n')}</pre>
    </div>
  )
}
```

</Sandpack>

### 题目 2：resolve

解释：resolve 不会阻止当前的同步执行，所以先打印3，4，执行完了同步再执行resolve，两个setTimeout，一个0，一个10，所以先打印6，2

<Sandpack>

```js
import { useState } from 'react'

export default function ResolveDemo() {
  const [logs, setLogs] = useState([])
  function log(msg) {
    setLogs((prev) => [...prev, msg])
  }
  function handleClick() {
    setLogs([])
    log('1')
    setTimeout(() => log('2'), 10)
    new Promise((resolve) => {
      log('3')
      resolve()
      log('4')
    }).then(() => log('5'))
    setTimeout(() => log('6'), 0)
    log('7')
  }
  return (
    <div>
      <button onClick={handleClick}>执行 resolve 顺序</button>
      <div>输出：</div>
      <pre>{logs.join('\n')}</pre>
    </div>
  )
}
```

</Sandpack>

### 题目 3：Promise链式调用

<Sandpack>

```js
import { useState } from 'react'

export default function PromiseDemo() {
  const [result, setResult] = useState('')

  function testPromiseChain() {
    setResult('执行中...')
    const results = []

    results.push('1. 开始执行')

    Promise.resolve()
      .then(() => {
        results.push('2. 第一个then')
        return Promise.resolve()
      })
      .then(() => {
        results.push('3. 第二个then')
        // return Promise.resolve()
      })
      .then(() => {
        results.push('4. 第三个then')
        updateResult()
      })

    Promise.resolve().then(() => {
      results.push('5. 独立的Promise')
      updateResult()
    })

    results.push('6. 同步代码结束')

    function updateResult() {
      setResult(results.join('\n') + '\n\n解释：微任务按照加入队列的顺序执行')
    }

    setTimeout(updateResult, 10)
  }

  return (
    <div>
      <button onClick={testPromiseChain}>测试Promise链</button>
      <pre>结果：{result}</pre>
    </div>
  )
}
```

</Sandpack>

### 题目 4：then

解释：多个 then 都会执行

<Sandpack>

```js
import { useState } from 'react'

export default function ThenDemo() {
  const [logs, setLogs] = useState([])
  function log(msg) {
    setLogs((prev) => [...prev, msg])
  }
  async function async1() {
    log('async1 start')
    await async2()
    log('async1 middle')
    await async3()
    log('async1 end')
  }
  async function async2() {
    log('async2')
  }
  async function async3() {
    log('async3')
  }
  function handleClick() {
    setLogs([])
    log('script start')
    setTimeout(() => log('setTimeout'), 0)
    async1()
    new Promise((resolve) => {
      log('promise1')
      resolve(1)
    })
      .then((res) => {
        log('promise2 ' + res)
        return Promise.resolve(2)
      })
      .then((res) => {
        log('promise3 ' + res)
      })
    log('script end')
  }
  return (
    <div>
      <button onClick={handleClick}>执行 then 顺序</button>
      <div>输出：</div>
      <pre>{logs.join('\n')}</pre>
    </div>
  )
}
```

</Sandpack>

### 题目 5：Promise.all

解释：promise.all 会等待所有 promise 都执行完，然后执行 then

<Sandpack>

```js
import { useState } from 'react'

export default function PromiseAllDemo() {
  const [logs, setLogs] = useState([])
  function log(msg) {
    setLogs((prev) => [...prev, msg])
  }
  function handleClick() {
    setLogs([])
    log('start')
    Promise.all([
      new Promise((resolve) => {
        setTimeout(() => {
          log('promise1')
          resolve(1)
        }, 2000)
      }),
      new Promise((resolve) => {
        setTimeout(() => {
          log('promise2')
          resolve(2)
        }, 1000)
      })
    ]).then((res) => {
      log('all done ' + JSON.stringify(res))
    })
    log('end')
  }
  return (
    <div>
      <button onClick={handleClick}>执行 Promise.all 顺序</button>
      <div>输出：</div>
      <pre>{logs.join('\n')}</pre>
    </div>
  )
}
```

</Sandpack>

### 题目 6：事件循环

解释：清空完微任务再执行宏任务

<Sandpack>

```js
import { useState } from 'react'

export default function EventLoopDemo() {
  const [logs, setLogs] = useState([])
  function log(msg) {
    setLogs((prev) => [...prev, msg])
  }
  function handleClick() {
    setLogs([])
    log('1')
    setTimeout(() => {
      log('2')
      Promise.resolve().then(() => log('3'))
    }, 0)
    new Promise((resolve) => {
      log('4')
      resolve()
    }).then(() => {
      log('5')
      setTimeout(() => log('6'), 0)
    })
    Promise.resolve().then(() => log('7'))
    log('8')
  }
  return (
    <div>
      <button onClick={handleClick}>执行事件循环顺序</button>
      <div>输出：</div>
      <pre>{logs.join('\n')}</pre>
    </div>
  )
}
```

</Sandpack>

### 总结

- await 会暂停 async 函数执行，await 之后的代码会作为微任务加入队列
- resolve 不会影响同步执行
- then 都会执行，默认是 return undefined
- 事件循环，先清空微任务，再执行宏任务
