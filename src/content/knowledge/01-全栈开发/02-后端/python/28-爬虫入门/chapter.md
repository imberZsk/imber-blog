# 第 28 课：爬虫入门

> 你在前端见多了「调后端 JSON 接口」的活，但很多数据根本没有接口，只有一个网页。爬虫要解决的就是：**把浏览器替你做的事——发请求拿 HTML、再从 HTML 里抠出想要的数据——用代码自动跑一遍**。本篇用两件兵器把这条链路打通：`requests` 负责「发请求」（≈ 你熟的 `fetch`/`axios`），`BeautifulSoup` 负责「解析 HTML 抠数据」（≈ 浏览器里的 `document.querySelector`）。学完你能写出一个能跑、能翻页、不被一脚封掉的最小爬虫。

阶段六是「自动化」主线，本篇是入口。这里不碰 Scrapy 那种重型框架，先把「请求 + 解析」这条最小可用链路吃透，下一篇（29）再讲怎么把脚本调度起来。

---

## 一、先给锚点：爬虫 = 没有浏览器的 fetch + querySelector

前端里你要从一个页面拿数据，心智模型是这样的：

```javascript
// JS：在浏览器/Node 里抓页面 + 解析
const res = await fetch("https://example.com")  // 发请求
const html = await res.text()                   // 拿到 HTML 字符串
// 浏览器里你会直接用 DOM 选择器抠元素：
const title = document.querySelector("h1").textContent
```

Python 爬虫就是把这两步换成两个库，**心智几乎一一对应**：

```python
import requests                       # requests：发 HTTP 请求，≈ fetch/axios
from bs4 import BeautifulSoup         # BeautifulSoup：解析 HTML，≈ DOM 查询

# resp：HTTP 响应对象，类比 fetch 返回的 Response
resp = requests.get("https://example.com")
# soup：解析后的「DOM 树」对象，之后所有抠数据都基于它
soup = BeautifulSoup(resp.text, "html.parser")
# select_one：CSS 选择器选第一个，≈ document.querySelector
title = soup.select_one("h1").get_text()   # title：h1 里的纯文本
```

先用对照表把直觉立起来：

| 浏览器 / JS | Python 爬虫 | 说明 |
|-------------|-------------|------|
| `fetch(url)` | `requests.get(url)` | 发 GET 请求 |
| `res.text()` | `resp.text` | 拿响应体文本（HTML） |
| `res.json()` | `resp.json()` | 把 JSON 响应解析成对象 |
| `res.status` | `resp.status_code` | HTTP 状态码 |
| `res.headers` | `resp.headers` | 响应头 |
| `document.querySelector(s)` | `soup.select_one(s)` | CSS 选第一个 |
| `document.querySelectorAll(s)` | `soup.select(s)` | CSS 选全部（返回列表） |
| `el.textContent` | `el.get_text()` | 取纯文本 |
| `el.getAttribute("href")` | `el["href"]` | 取属性 |

> **关键边界（哪里不一样）**：`requests` 拿到的是**服务器原始返回的那段 HTML 字符串**，它不是浏览器——**不会执行 JavaScript**。前端 SPA（React/Vue 渲染出来的页面）你 F12 看到的 DOM，和 `requests` 拿到的 HTML 往往对不上：后者可能只有一个空 `<div id="root">`。这是新手第一大坑，第六节专门讲怎么判断和应对。

先装库：

```bash
pip install requests beautifulsoup4
# beautifulsoup4 是包名，但导入时写 from bs4 import ...，这俩名字对不上是历史原因，记住即可
```

---

## 二、requests：发请求的四件事

`requests` 的 API 设计得非常直白，前端调接口会的那几样这里全都有。

```python
import requests

# 1) GET：最常见。params 会被拼成 ?key=value 的查询串，等价 fetch 里手拼 URL
resp = requests.get(
    "https://httpbin.org/get",
    params={"page": 2, "size": 20},   # params：查询参数字典，自动 URL 编码后拼到 ? 后面
)

# 2) POST：提交表单或 JSON
resp = requests.post(
    "https://httpbin.org/post",
    json={"name": "imber"},           # json=：自动序列化成 JSON 并设好 Content-Type
    # data={"name": "imber"},         # data=：按表单(application/x-www-form-urlencoded)提交
)

# 3) 自定义请求头：爬虫最常改的就是 User-Agent（见第三节）
headers = {"User-Agent": "Mozilla/5.0"}   # headers：请求头字典
resp = requests.get("https://example.com", headers=headers)

# 4) 超时：必须设！否则对方不响应会一直卡死
resp = requests.get("https://example.com", timeout=10)   # timeout：秒，超时抛异常
```

拿到 `resp` 后怎么用：

```python
resp = requests.get("https://httpbin.org/json", timeout=10)

resp.status_code      # 状态码，如 200 / 404，≈ res.status
resp.text             # 响应体文本（HTML/纯文本），≈ await res.text()
resp.content          # 响应体的二进制 bytes，下载图片/文件时用
resp.json()           # 若返回 JSON，直接解析成 dict/list，≈ await res.json()
resp.headers          # 响应头（类似 dict）
resp.encoding         # 文本编码，中文乱码时可手动改，见第五节

# raise_for_status：状态码是 4xx/5xx 时主动抛异常，否则默默继续
# 业务场景：fetch 默认不会因 404 reject，requests 也一样，所以要显式检查
resp.raise_for_status()
```

> **边界提醒**：和 `fetch` 一样，`requests` 对 4xx/5xx **不会自动报错**，它只是如实返回那个状态码。想让失败「炸出来」，得自己判断 `status_code` 或调 `raise_for_status()`。这点和 `axios`（默认对非 2xx reject）不同，反而更接近原生 `fetch`。

---

## 三、伪装成浏览器：User-Agent 与请求头

你直接 `requests.get` 很多网站会返回 403 或一个「请用浏览器访问」的页面。原因是：默认 `requests` 会带一个 `User-Agent: python-requests/2.x` 的请求头，等于在门口举牌「我是爬虫」。

解决办法是**把请求头伪装成真实浏览器**，这和前端在 Node 里用 `fetch` 手动设 headers 是同一件事：

```python
# headers：模拟 Chrome 浏览器的请求头，绕过最基础的反爬识别
headers = {
    # User-Agent：浏览器身份标识，最关键的一项，直接抄浏览器 F12 里的真实值即可
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    # Accept-Language：声明语言偏好，部分站点据此返回中文页
    "Accept-Language": "zh-CN,zh;q=0.9",
}

resp = requests.get("https://example.com", headers=headers, timeout=10)
```

```javascript
// JS 对照：Node 里手动设 headers，形状完全一样
const resp = await fetch("https://example.com", {
  headers: {
    "User-Agent": "Mozilla/5.0 ... Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "zh-CN,zh;q=0.9",
  },
})
```

> 多次请求同一站点时，更专业的做法是用 `requests.Session()`：它会**自动复用连接、保留 cookie**，相当于浏览器的「同一个会话」。需要登录态、要连着翻很多页时尤其有用。

```python
session = requests.Session()              # session：贯穿多次请求的会话，自动管理 cookie
session.headers.update(headers)           # 给整个会话统一挂上请求头，后续请求自动带
resp = session.get("https://example.com/page1", timeout=10)
resp = session.get("https://example.com/page2", timeout=10)   # 复用连接 + cookie
```

---

## 四、BeautifulSoup：用 CSS 选择器从 HTML 抠数据

`requests` 拿到的 `resp.text` 是一坨 HTML 字符串。直接正则去抠又脆又难写，正确姿势是把它喂给 `BeautifulSoup`，得到一棵「能查询的 DOM 树」。

```python
from bs4 import BeautifulSoup

# 第二个参数是解析器，"html.parser" 是 Python 标准库自带、零依赖，够用
# 想更快/容错更强可装 lxml，写 "lxml"，本篇用标准库即可
soup = BeautifulSoup(resp.text, "html.parser")   # soup：整棵 DOM 树，所有查询的入口
```

**首选 `select` / `select_one`——直接写 CSS 选择器，和你前端肌肉记忆完全一致**：

```python
# select_one：CSS 选第一个匹配元素，≈ document.querySelector，找不到返回 None
title_el = soup.select_one("h1.title")        # title_el：第一个 class=title 的 h1 元素

# select：CSS 选全部，返回一个列表（即使一个都没有，也是空列表，不是 None）
# ≈ document.querySelectorAll，但返回的是真·列表，能直接 for 遍历
items = soup.select("ul.list > li")           # items：所有匹配的 li 元素列表

for item in items:                            # item：列表里的单个元素
    # get_text：取该元素下所有文本，strip=True 顺手去掉首尾空白
    text = item.get_text(strip=True)          # text：这条 li 的纯文本
    print(text)
```

取文本和取属性：

```python
link = soup.select_one("a.more")              # link：第一个 class=more 的 <a>

link.get_text(strip=True)                     # 取标签内文本，≈ el.textContent
link["href"]                                  # 取属性，key 不存在会 KeyError
link.get("href")                              # 取属性的安全版，不存在返回 None（推荐）
link.get("href", "")                          # 还能给默认值，彻底防 None
```

> **边界（哪里不一样）**：`select` 返回的是普通 Python **列表**，能直接 `for`、`len()`、列表推导。这比浏览器里 `querySelectorAll` 返回的 `NodeList`（伪数组，要 `Array.from` 才能用数组方法）更顺手。这是 Python 这边占便宜的地方。

CSS 选择器对照表（语法和前端一模一样，直接迁移）：

| 选择器 | 含义 |
|--------|------|
| `"div"` | 所有 div 标签 |
| `".title"` | class=title |
| `"#main"` | id=main |
| `"ul > li"` | ul 的直接子级 li |
| `"a[href]"` | 带 href 属性的 a |
| `"div.card a"` | card 卡片内的所有 a（后代） |

---

## 五、把它跑成一个完整最小爬虫

把前面的零件拼起来——一个「抓列表页 → 抠出每条标题和链接 → 翻页」的最小可用爬虫，这是你 90% 场景的骨架：

```python
import requests
from bs4 import BeautifulSoup
import time   # time：用于翻页之间 sleep 降速，别把人家网站打挂

# 统一的浏览器伪装头，整个脚本共用
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36",
}


def fetch_html(url: str) -> str:
    """发请求拿 HTML 文本。
    url：目标页面地址。
    返回：解码后的 HTML 字符串；失败时抛异常（由 raise_for_status 触发）。
    """
    resp = requests.get(url, headers=HEADERS, timeout=10)   # resp：HTTP 响应对象
    # 中文站点偶尔会乱码：apparent_encoding 用 chardet 分析响应字节、统计推断真实编码，治大多数乱码
    resp.encoding = resp.apparent_encoding
    resp.raise_for_status()                                 # 非 2xx 直接抛错，避免拿到错误页还往下解析
    return resp.text


def parse_list(html: str) -> list[dict]:
    """从列表页 HTML 中抠出每条记录。
    html：列表页的 HTML 字符串。
    返回：[{title, link}, ...]，每个元素是一条记录。
    """
    soup = BeautifulSoup(html, "html.parser")   # soup：解析后的 DOM 树
    results = []                                # results：本页抓到的所有记录

    # 选择器按目标网站真实结构改，这里假设每条记录是 li.item 里有个 a 标签
    for item in soup.select("li.item"):         # item：单条记录的 li 元素
        a = item.select_one("a")                # a：该记录里的链接元素
        if a is None:                           # 业务场景：有的 li 是广告/占位，没有 a，跳过防报错
            continue
        results.append({
            "title": a.get_text(strip=True),    # title：标题文本
            "link": a.get("href", ""),          # link：详情页链接，缺失给空串兜底
        })
    return results


def crawl(max_page: int = 3) -> list[dict]:
    """主流程：逐页抓取并汇总。
    max_page：最多抓几页，防止无限翻页。
    返回：所有页合并后的记录列表。
    """
    all_items = []                              # all_items：全部页面汇总的记录
    for page in range(1, max_page + 1):         # page：当前页码，从 1 到 max_page
        url = f"https://example.com/list?page={page}"   # url：拼出当前页地址
        print(f"抓取第 {page} 页: {url}")
        html = fetch_html(url)                  # html：当前页 HTML
        all_items.extend(parse_list(html))      # 把本页记录追加进总列表
        time.sleep(1)                           # WHY：每页间隔 1 秒，礼貌降速，避免请求过快被封 IP
    return all_items


if __name__ == "__main__":
    data = crawl(max_page=3)        # data：抓到的全部记录
    print(f"共抓到 {len(data)} 条")
    for row in data[:5]:            # 只打印前 5 条看看效果
        print(row)
```

这套结构和你写前端「分页拉接口 + map 渲染」几乎同构，只是数据源从 JSON 接口换成了 HTML 页面。

---

## 六、新手必踩的坑

**坑 1：页面是 JS 渲染的，`requests` 抓到的是空壳。**
现代前端站（React/Vue SPA）的数据多是前端再发 ajax 填进去的。你 `requests.get` 拿到的 HTML 里**根本没有那些数据**，`select` 自然选不到，返回空列表。

- 怎么判断：把 `resp.text` 打印出来，或者浏览器里「查看网页源代码」（不是 F12 的 Elements，那是渲染后的）。如果源码里搜不到目标文字，就是 JS 渲染。
- 怎么破：**优先去 F12 的 Network 面板找它实际请求的那个 JSON 接口，直接 `requests.get` 那个接口**——又快又稳，连解析 HTML 都省了。实在没有接口、非渲染不可，才上 `playwright`/`selenium` 这种真·浏览器（重，本篇不展开）。

**坑 2：中文乱码。** `requests` 有时猜错编码，中文变成「ä½ å¥½」。修法见上面代码：`resp.encoding = resp.apparent_encoding`，让它用 chardet 分析响应字节、统计推断真实编码（注意：它看的是原始字节，不是 `<meta charset>` 声明）。

**坑 3：`select_one` 没匹配到却直接取属性 / 文本，报 `AttributeError`。**
`select_one` 找不到时返回的是 `None`，你再 `.get_text()` 就会炸（类似 JS 的 `Cannot read properties of null`）。务必先判空：

```python
el = soup.select_one("h1.title")
title = el.get_text(strip=True) if el else ""   # 先判空再取，缺失给空串兜底
```

**坑 4：请求太快被封。** 循环里不 `sleep`、并发狂打，轻则 IP 被限流，重则被拉黑。加 `time.sleep`、控制频率是基本礼貌，也是自保。

**坑 5：无视 robots.txt 和站点条款。** 爬之前看一眼目标站的 `/robots.txt`，别爬明令禁止的路径，别爬需要登录的私密数据，别把人家服务器打挂。这是合规底线，不是技术问题。

---

## 七、和 JS 生态的整体对照

| 能力 | JS/Node 生态 | Python 爬虫生态 |
|------|--------------|-----------------|
| 发请求 | `fetch` / `axios` | `requests` |
| 解析 HTML | `cheerio`（服务端 jQuery） | `BeautifulSoup` |
| CSS 选择器 | `querySelector(All)` | `select_one` / `select` |
| 真·浏览器（跑 JS） | `puppeteer` / `playwright` | `playwright` / `selenium` |
| 重型爬虫框架 | `crawlee` | `Scrapy` |

如果你之前用过 `cheerio`，那 `BeautifulSoup` 几乎是无缝迁移——都是「拿字符串、给选择器、抠数据」。

---

## 小结

爬虫的本质就是**「没有浏览器的 fetch + querySelector」**：`requests` 发请求拿 HTML，`BeautifulSoup` 用 CSS 选择器抠数据，循环翻页 + sleep 降速，就是一个能用的最小爬虫。

✅ **该掌握**
- `requests.get(url, headers=..., timeout=...)`，记得设 `timeout` 和浏览器 `User-Agent`
- `resp.text` / `resp.json()` / `resp.status_code` / `resp.raise_for_status()`
- `BeautifulSoup(html, "html.parser")` + `select` / `select_one` + `get_text()` / `["attr"]`
- 翻页 + `time.sleep` 降速这套骨架

⚠️ **易混淆**
- `requests` **不执行 JS**：SPA 页面优先去抓它背后的 JSON 接口，而不是死磕 HTML
- `select_one` 找不到返回 `None`，取值前必须判空，否则 `AttributeError`
- 4xx/5xx 不会自动报错（和 `fetch` 一样），要自己 `raise_for_status()`
- 包名 `beautifulsoup4`，导入却是 `from bs4 import BeautifulSoup`
- 爬之前看 `robots.txt`、控制频率、别碰私密数据——合规是底线
