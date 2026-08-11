# Python（17）- 异步与并发

> 你在 Node 里写惯了 `async/await`，第一眼看 Python 的 `async def` 会觉得"这不就是一模一样吗"。语法层面确实几乎逐字对应，但底下藏着一个 JS 世界里完全不存在的东西——GIL（全局解释器锁）。本篇解决两个问题：怎么用和 JS 心智模型几乎一致的方式写异步代码；以及为什么 Python 有"真线程"却还是不能靠多线程跑满多核 CPU，到底该用 async、线程、还是进程。

# 一、先建立前端锚点

| 你在 JS/Node 里这么写 | Python 对应写法 | 说明 |
|----------------------|----------------|------|
| `async function f() {}` | `async def f(): ...` | 声明协程函数 |
| `await fetch(url)` | `await client.get(url)` | 等待一个异步结果 |
| `Promise.all([a, b])` | `asyncio.gather(a, b)` | 并发等多个任务 |
| `setTimeout` / `await sleep` | `await asyncio.sleep(n)` | 非阻塞等待 |
| 顶层 `await`（或 IIFE） | `asyncio.run(main())` | 启动事件循环的入口 |
| 事件循环（V8/libuv） | `asyncio` 事件循环 | 调度协程的引擎 |

核心切入点：**Python 的 `asyncio` 就是把 JS 那套"单线程 + 事件循环 + 协作式并发"搬了过来，心智模型几乎可以直接平移**。先用这个直觉快速上手，第三节再立刻划清两个世界真正的分水岭——GIL 和"Python 还有真线程/真进程"。

---

# 二、async/await：心智模型直接搬 JS

## 2.1 它和 JS 长得有多像

先并排看。JS：

```javascript
// fetchUser：异步取用户，返回 Promise
async function fetchUser(id) {
  await sleep(1000)              // 等 1 秒（非阻塞）
  return { id, name: 'imber' }   // 返回值会被包进 Promise
}

async function main() {
  const user = await fetchUser(1) // await 拿到真正的结果
  console.log(user)
}
main()
```

Python 几乎逐字对应，只是把 `function` 换成 `def`、`async function` 换成 `async def`：

```python
import asyncio

# fetch_user：异步取用户。async def 声明的函数叫"协程函数"，调用它返回一个协程对象（≈ Promise）
async def fetch_user(uid):  # uid：用户 id
    await asyncio.sleep(1)          # 非阻塞等待 1 秒，期间事件循环可去跑别的协程
    return {"id": uid, "name": "imber"}  # 返回值会成为 await 的结果

# main：程序的异步入口
async def main():
    user = await fetch_user(1)     # await 拿到真正的结果（≈ JS 的 await）
    print(user)

# asyncio.run：创建事件循环、跑完 main、再关闭。是启动异步程序的标准入口
asyncio.run(main())
```

逐行对照：

| JS | Python |
|------|--------|
| `async function f(){}` | `async def f(): ...` |
| `await x` | `await x` |
| `f()` 返回 Promise | `f()` 返回协程对象（coroutine） |
| `await sleep(1000)` | `await asyncio.sleep(1)`（单位是秒） |
| 顶层启动 `main()` | `asyncio.run(main())` |

## 2.2 一个关键差异：调用了不 await，等于没执行

这是从 JS 过来最先踩的坑。JS 里 `fetchUser(1)` 一调用，函数体就立刻开始跑（只是返回 Promise）；Python 里 `fetch_user(1)` 调用后函数体**一行都不会执行**，只是造了个协程对象，必须 `await` 它（或交给事件循环）才会真正跑。

```python
# main：演示"只调用不 await"与"正确 await"的区别
async def main():
    fetch_user(1)        # ❌ 只创建了协程对象，函数体根本没跑，还会报 RuntimeWarning
    await fetch_user(1)  # ✅ 这样才真正执行
```

记法：**Python 的协程更"懒"，没 await 就是一张没兑现的票**。

## 2.3 并发：Promise.all → asyncio.gather

串行 await 三次要等三倍时间，要并发就用 `gather`，和 `Promise.all` 一一对应：

```python
import asyncio

# fetch_one：模拟一次耗时 1 秒的 IO 请求
async def fetch_one(uid):  # uid：用户 id
    await asyncio.sleep(1)
    return uid

# main：演示用 gather 并发跑多个协程
async def main():
    # asyncio.gather：把多个协程并发跑，全部完成后按传入顺序返回结果列表（≈ Promise.all）
    results = await asyncio.gather(
        fetch_one(1),
        fetch_one(2),
        fetch_one(3),
    )  # results：[1, 2, 3]，总耗时约 1 秒而非 3 秒
    print(results)

asyncio.run(main())
```

```javascript
// 等价 JS
const results = await Promise.all([fetchOne(1), fetchOne(2), fetchOne(3)])
```

> 注：这里每个 `async def` 出现的地方，背后都是同一套事件循环在调度，机制和细节在本篇第三、四节讲透。

---

# 三、边界：GIL——JS 世界里不存在的东西

类比建立了直觉，现在必须立刻划清差异，否则你会带着错误预期写出诡异的代码。

## 3.1 一句话理解 GIL

JS 本身就是单线程语言，你从没纠结过"多线程能不能跑满 CPU"，因为根本没有线程这个概念（worker 是独立的隔离环境）。Python 不一样——它**有真正的操作系统线程**，但有一把全局锁：

> **GIL（Global Interpreter Lock，全局解释器锁）：同一时刻，一个 Python 进程里只允许一个线程在执行 Python 字节码。**

意思是：你开 8 个线程跑纯计算，它们不会真的并行占满 8 个核，而是被 GIL 强制"轮流"执行，本质还是一个核在转。这是 CPython（最主流的 Python 实现）的机制，不是语言规范，但你日常用的就是它。

## 3.2 关键澄清：async 不受 GIL 影响（别搞混）

这是新手最容易脑补错的地方：**GIL 限制的是"多线程并行跑 Python 代码"，和你刚学的 `async/await` 是两码事**。

- `asyncio` 是**单线程**的协作式并发，本来就只用一个线程，根本没想并行跑计算，所以 GIL 对它毫无影响——它和 JS 的事件循环模型完全一致。
- async 的价值在于：等 IO（网络、磁盘、数据库）的时候，把这个线程让出去跑别的协程，而不是干等。它解决的是"等待"，不是"算得快"。

记法：**async 省的是"等的时间"，GIL 限制的是"算的并行"，两者不冲突也不互相替代**。

## 3.3 那 GIL 到底卡了谁

| 任务类型 | 例子 | 该用什么 | 受 GIL 影响吗 |
|---------|------|---------|--------------|
| IO 密集 | 网络请求、读写文件、查数据库 | `asyncio` 或多线程 | 不受影响（等 IO 时锁会释放） |
| CPU 密集 | 大量数学计算、图像处理、加解密 | **多进程** | 受影响，多线程没用 |

结论先记住：**IO 密集用 async，CPU 密集用多进程**。下一节展开。

---

# 四、三种并发手段：async / 线程 / 进程

Python 比 JS 多了"真线程"和"真进程"两个工具，搞清楚什么时候用哪个，是本篇的实战重点。

## 4.1 asyncio：IO 密集首选（最像 JS）

绝大多数后端场景（接口里查数据库、调下游服务、读 Redis）都是 IO 密集，`asyncio` 是首选，写法你第二节已经会了。要注意的是**别在协程里调用阻塞函数**，否则会卡死整个事件循环：

```python
import asyncio

# bad：错误示范——在协程里调用同步阻塞函数
async def bad():
    import time
    time.sleep(3)   # ❌ 同步阻塞！整个事件循环被卡死 3 秒，所有协程都停摆

# good：协程里等待的正确写法，用非阻塞的 asyncio.sleep
async def good():
    await asyncio.sleep(3)  # ✅ 非阻塞，期间事件循环能跑别的协程
```

这和 JS 里"别在 async 函数里写同步死循环卡住主线程"是同一个道理。

## 4.2 多线程：用 threading，但记住 GIL 的限制

线程适合"IO 密集但库不支持 async"的老代码（比如某个只有同步版本的 SDK）。语法上 Python 有 `threading`，但因为 GIL，**多线程跑纯计算不会变快**。

```python
import threading

# worker：线程要执行的任务
def worker(name):  # name：线程名，仅用于打印区分
    print(f"线程 {name} 在跑")

# t：一个线程对象。target 指定要跑的函数，args 是传给它的参数（注意是元组）
t = threading.Thread(target=worker, args=("A",))
t.start()   # 启动线程
t.join()    # 等待该线程结束（≈ await 它跑完）
```

更省心的写法是用线程池 `ThreadPoolExecutor`，避免手动管理线程：

```python
from concurrent.futures import ThreadPoolExecutor

# download：模拟一个只有同步版本、会阻塞的 IO 任务
def download(url):  # url：要下载的地址
    return f"已下载 {url}"

# 用 with 确保线程池用完自动回收。max_workers：池子里最多几个线程
with ThreadPoolExecutor(max_workers=3) as pool:
    # pool.map：把列表里每个元素分发给线程并发执行，返回结果迭代器
    results = list(pool.map(download, ["a.com", "b.com", "c.com"]))
    print(results)
```

## 4.3 多进程：CPU 密集的唯一正解

要真正跑满多核做计算，必须开**多进程**——每个进程有自己独立的 Python 解释器和独立的 GIL，互不干扰。接口和 `ThreadPoolExecutor` 几乎一样，只是把 Thread 换成 Process：

```python
from concurrent.futures import ProcessPoolExecutor

# heavy_calc：CPU 密集任务，纯计算
def heavy_calc(n):  # n：上界，计算 0..n-1 的平方和（range(n) 不含 n）
    return sum(i * i for i in range(n))

# 注意：多进程代码必须放在 if __name__ == "__main__" 保护块里
# WHY：子进程会重新 import 主模块，不加保护会无限递归创建进程
if __name__ == "__main__":
    # ProcessPoolExecutor：进程池，每个进程独立 GIL，能真正并行占满多核
    with ProcessPoolExecutor(max_workers=4) as pool:
        # 把 4 个重计算任务分到 4 个进程并行跑
        results = list(pool.map(heavy_calc, [10**6, 10**6, 10**6, 10**6]))
        print(results)
```

JS 里对应的概念是 `worker_threads` / `cluster`——独立隔离、靠消息通信。Python 多进程同理：进程间不共享内存，数据要靠序列化传递，所以传大对象有开销。

## 4.4 一张表收口选型

| 场景 | 选什么 | 理由 |
|------|--------|------|
| 查库、调接口、读文件（IO 密集，库支持 async） | `asyncio` | 单线程事件循环，最轻量，最像 JS |
| IO 密集但只有同步库 | `ThreadPoolExecutor` | 等 IO 时 GIL 会释放，线程有效 |
| 大量计算（CPU 密集） | `ProcessPoolExecutor` | 唯一能绕开 GIL 跑满多核的方式 |

## 4.5 混合场景：在 async 里跑阻塞/计算任务

如果你已经在 `asyncio` 世界里，又必须调一个阻塞函数或重计算，正确做法是把它丢到线程/进程池，用 `run_in_executor` 包一层，避免卡住事件循环：

```python
import asyncio
from concurrent.futures import ProcessPoolExecutor

def heavy_calc(n):  # n：计算上界
    return sum(i * i for i in range(n))

# main：在 async 环境里把 CPU 密集任务丢进进程池，避免卡住事件循环
async def main():
    # 拿到当前事件循环
    loop = asyncio.get_running_loop()
    # run_in_executor：把阻塞/计算任务交给指定执行器，返回可 await 的结果
    # 第一个参数传执行器实例（None 则用默认线程池）；这里用进程池跑 CPU 任务
    with ProcessPoolExecutor() as pool:
        result = await loop.run_in_executor(pool, heavy_calc, 10**6)  # result：平方和
        print(result)

if __name__ == "__main__":
    asyncio.run(main())
```

---

# 五、最容易踩的坑

1. **调了协程却没 await**。`fetch_user(1)` 单独写一行不会执行，只会触发 `RuntimeWarning: coroutine was never awaited`。这是 JS 老手最高频的坑——JS 里一调就跑，Python 里不 await 就是废纸。

2. **以为 async 能加速计算**。async 只解决"等待"，不解决"算得慢"。把一堆数学计算塞进 `async def` 不会快分毫，反而把事件循环卡死。CPU 活儿一律走多进程。

3. **在协程里写同步阻塞调用**。`time.sleep`、同步版的 `requests.get`、同步数据库驱动，都会把整个事件循环冻住，所有并发瞬间归零。要么换 async 版库（`httpx`、`aiomysql` 等），要么用 `run_in_executor` 隔离。

4. **多进程忘了 `if __name__ == "__main__"`**。不加这层保护，子进程重新导入模块时会再次创建进程，无限递归直接炸掉。这是 Python 多进程的硬性规矩，JS 里没有对应概念，特别容易漏。

5. **把 GIL 和 async 搅在一起理解**。再强调一次：GIL 管的是多线程并行执行字节码，async 是单线程协作式并发，两者根本不在一个维度。面试时这俩混答几乎必挂。

6. **gather 里一个任务报错会牵连其他**。`asyncio.gather` 默认任一协程抛异常就整体抛出（其余任务不会自动取消但结果丢失）。要容错可加 `return_exceptions=True`，让异常作为结果返回而不中断：

   ```python
   # return_exceptions=True：某个协程出错时，把异常对象放进结果列表，而不是直接抛出
   results = await asyncio.gather(task_a(), task_b(), return_exceptions=True)
   ```

---

# 六、综合示例：并发抓取多个接口

把本篇知识串成一个真实后端常见场景——并发请求多个下游服务。用 `httpx`（支持 async 的 HTTP 客户端，相当于 async 版的 axios/fetch）：

```python
import asyncio
import httpx   # 第三方库：支持 async 的 HTTP 客户端，需 pip install httpx

# fetch：异步请求单个 url，返回状态码
async def fetch(client, url):  # client：复用的连接客户端；url：目标地址
    resp = await client.get(url)   # await 等待响应期间，事件循环可去发别的请求
    return url, resp.status_code   # 返回 (地址, 状态码) 元组

# main：并发请求多个下游接口的入口
async def main():
    # urls：要并发请求的地址列表
    urls = [
        "https://httpbin.org/delay/1",
        "https://httpbin.org/delay/1",
        "https://httpbin.org/delay/1",
    ]
    # 用 async with 管理客户端生命周期，自动关闭连接池
    async with httpx.AsyncClient(timeout=10) as client:
        # 列表推导式批量造协程，再用 gather 并发执行（≈ urls.map(fetch) + Promise.all）
        tasks = [fetch(client, u) for u in urls]  # tasks：协程对象列表
        results = await asyncio.gather(*tasks)    # *tasks：把列表拆开作为多个参数传入
        print(results)  # 三个请求并发，总耗时约 1 秒而非 3 秒

if __name__ == "__main__":
    asyncio.run(main())
```

对照等价 JS，几乎是逐行翻译：

```javascript
async function main() {
  const urls = [/* ...三个地址... */]
  const tasks = urls.map(u => fetch(u).then(r => [u, r.status]))
  const results = await Promise.all(tasks)
  console.log(results)
}
```

这就是 async 的核心价值：三个各等 1 秒的请求，并发只花 1 秒。这套模型也正是下一阶段 FastAPI 接口的底座——接口处理函数本身就是 `async def`（详见 FastAPI 篇）。

---

# 七、总结

Python 的 `asyncio` 把 JS 的"单线程 + 事件循环 + 协作式并发"几乎原样搬了过来，`async def`/`await`/`gather` 与 `async function`/`await`/`Promise.all` 一一对应，心智模型可以直接平移。真正的分水岭是 GIL：CPython 同一时刻只允许一个线程跑字节码，所以多线程救不了 CPU 密集任务。记住一条选型铁律——**IO 密集用 async，库不支持 async 就用线程池，CPU 密集必须上多进程**。

✅ 该掌握
- `async def` / `await` / `asyncio.gather` 对标 JS 的 `async`/`await`/`Promise.all`
- 协程调用了不 await 就不会执行（比 JS 更"懒"）
- IO 密集用 `asyncio`，同步库用 `ThreadPoolExecutor`，CPU 密集用 `ProcessPoolExecutor`
- 阻塞/计算任务要用 `run_in_executor` 丢出主线程
- 多进程代码必须包在 `if __name__ == "__main__"` 里

⚠️ 易混淆
- GIL 限制的是多线程并行算，async 是单线程协作并发，两者无关
- async 省的是"等的时间"，不能让计算变快
- 协程里写 `time.sleep`、同步 `requests` 会冻死整个事件循环
- `asyncio.sleep` 单位是秒，不是毫秒（和 `setTimeout` 不同）
- `gather` 默认遇错即抛，要容错加 `return_exceptions=True`

下一篇：进入三·Web后端的框架部分（FastAPI / Pydantic）

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“Python（17）- 异步与并发”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
