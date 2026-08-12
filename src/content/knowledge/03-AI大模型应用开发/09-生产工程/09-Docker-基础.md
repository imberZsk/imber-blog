# 工程基础（38）- Docker 基础

> 读完你能：看懂并写出一个最小的 Dockerfile，讲清「FROM / COPY / RUN / CMD」每行在干什么，理解层缓存为什么要「先拷依赖再拷代码」，并知道 Docker 到底解决了 AI 应用的什么痛点。

# 一、与进阶篇的分工

本篇保留为 Dockerfile 基础：重点讲镜像、容器、层缓存和单服务打包。进阶部署请读 77《基于 Docker Compose 的本地开发提效和生产环境部署》，那里会处理 PostgreSQL、Redis、Milvus、ES、对象存储等多服务编排。

# 二、一个真实场景

你的 RAG 应用在自己 Mac 上跑得好好的。提交给后端同学部署到 Linux 服务器，他跑起来一堆报错：Python 版本不对、某个库装不上、环境变量没配。你俩对着屏幕排了一下午"为什么你那能跑我这不能跑"。

AI 应用尤其容易遇到这事：依赖多（模型 SDK、向量库、各种工具包）、版本敏感、还常带 C 扩展。Docker 就是来终结"在我电脑上是好的"这句话的——**把应用和它的整个运行环境（Python 版本、依赖、系统库）一起打包成一个镜像，在哪台机器上跑出来都一样。**

# 三、镜像和容器：模板和实例

两个最基本的概念先分清：

- **镜像（Image）**：一个打包好的、只读的"应用环境快照"。包含系统、Python、依赖、你的代码。类比前端，它像构建产物 `dist/`。
- **容器（Container）**：镜像跑起来的一个运行实例。一个镜像可以跑出多个容器。类比，它像 `node dist/server.js` 起的一个进程。

```
Dockerfile  --build-->  镜像（模板）  --run-->  容器（运行实例）
  你写的配方            可分发的产物        实际在跑的进程
```

你写 Dockerfile（配方），`docker build` 出镜像（产物），`docker run` 跑出容器（进程）。

# 四、Dockerfile 逐行拆解

一个 Python 应用的最小 Dockerfile 就这么几行，每行都有明确职责：

```dockerfile
FROM python:3.12-slim          # 1. 基础镜像：站在官方 Python 环境的肩上
WORKDIR /app                   # 2. 后续操作的工作目录
COPY requirements.txt .        # 3. 先单独拷依赖清单
RUN pip install --no-cache-dir -r requirements.txt   # 4. 装依赖
COPY main.py .                 # 5. 再拷应用代码
EXPOSE 8000                    # 6. 声明对外端口（文档作用）
CMD ["python3", "main.py"]     # 7. 容器启动时跑的命令
```

- `FROM` 决定起点。`slim` 版比完整版小很多，又比 `alpine` 少踩 C 扩展编译的坑，是 Python 应用的稳妥选择。
- `RUN` 在构建镜像时执行（装依赖发生在 build 阶段）。
- `CMD` 在容器启动时执行（跑应用发生在 run 阶段）。用数组形式（exec form），进程才能正确收到停止信号、优雅退出。

# 五、为什么"先拷依赖再拷代码"——层缓存

第 3-5 行的顺序不是随便排的，这是 Docker 最重要的提速技巧。

Docker 镜像是**分层**的，每条指令生成一层。构建时如果某一层的输入没变，就直接命中缓存，跳过执行。关键点：**一旦某层变了，它后面的所有层缓存全部失效，要重新执行。**

```
COPY requirements.txt   →  依赖没变 → 这层命中缓存
RUN pip install         →  上一层缓存命中 → 这层也命中，不重装依赖   ← 省时间
COPY main.py            →  代码变了 → 这层失效，重新拷（但这层很快）
```

你天天改的是代码（`main.py`），很少动依赖（`requirements.txt`）。把**不常变的依赖放前面、常变的代码放后面**，改代码时就能复用"装依赖"那层缓存，构建从几分钟变几秒。反过来排，每次改一行代码都要重装所有依赖，慢到崩溃。

# 不装 Docker 也能先验证 app 本身

```bash
python3 main.py
# 另开终端：curl http://localhost:8000/
```

`main.py` 是个最小 HTTP 服务，访问返回一句带 `hostname` 的 JSON。这个 hostname 是关键：本机跑显示你的机器名，**容器里跑会显示容器 ID**，一眼看出"这是在容器里跑的"。

装了 Docker 的话：

```bash
docker build -t docker-demo .      # 构建镜像
docker run -p 8000:8000 docker-demo  # 跑容器，-p 把容器 8000 映射到本机 8000
```

demo 目录里的文件和概念对应：
- `Dockerfile` —— 上面逐行拆解的那个配方
- `requirements.txt` —— 依赖清单（demo 无第三方依赖，留作结构演示）
- `.dockerignore` —— 声明哪些文件不打进镜像（缓存、.git、文档）
- `main.py` 里 `os.getenv("PORT")` —— 端口可配置，对应 12-factor「配置走环境变量」

`docker run -p 8000:8000` 里的 `-p` 是端口映射：容器内部的 8000 端口映射到你本机的 8000。不加这个，容器里服务起来了你也访问不到。

# 七、工程上真正会踩的坑

- **层顺序排错，每次都全量重装依赖**。先 `COPY` 全部代码再装依赖，改一行代码就触发整个 `pip install` 重跑。永远「先拷 requirements，装依赖，再拷代码」。
- **服务监听 127.0.0.1 而非 0.0.0.0**。容器里绑 `127.0.0.1` 的服务，宿主机的请求进不来，`-p` 映射了也访问不到。容器内必须监听 `0.0.0.0`（demo 里就是这么写的）。
- **把密钥、.env 打进镜像**。镜像会被分发，硬编码的 API Key 跟着泄露。密钥用 `docker run -e` 或挂载传入，源码和镜像里都不留，`.dockerignore` 也要排除 `.env`。
- **忘了 `-p` 映射端口**。容器里服务跑得好好的，本机 curl 不通，以为程序挂了，其实是端口没映射出来。

# 八、一句话面试答法

> **Docker 解决了 AI 应用的什么问题，Dockerfile 怎么写才高效？** AI 应用依赖多、版本敏感，最容易出"我电脑能跑线上不能跑"。Docker 把应用和整个运行环境打包成镜像，到哪都一样跑。写 Dockerfile 我会注意层缓存：先 COPY requirements.txt 装依赖、再 COPY 代码，因为依赖不常变、代码常变，这样改代码能复用装依赖的缓存层。另外服务要监听 0.0.0.0、密钥靠环境变量传入不打进镜像、用 .dockerignore 排除无关文件。

# 十、总结

- **为什么"先拷依赖再拷代码"——层缓存**：第 3-5 行的顺序不是随便排的，这是 Docker 最重要的提速技巧。
- **工程上真正会踩的坑**：层顺序排错，每次都全量重装依赖。
- **镜像和容器：模板和实例**：镜像（Image）：一个打包好的、只读的"应用环境快照"。
- **Dockerfile 逐行拆解**：一个 Python 应用的最小 Dockerfile 就这么几行，每行都有明确职责：

<!-- knowledge-lab-merged -->

# 动手实践：38 Docker 基础

一个最小的 Python HTTP 应用 + 可读正确的 Dockerfile，演示「把应用打成镜像，到处一样跑」。

## 先跑应用本身（不需要 Docker）

```bash
python3 main.py
```

然后另开一个终端：

```bash
curl http://localhost:8000/
```

预期输出（hostname 在你本机就是你的机器名）：

```json
{"message": "Hello from a Dockerized Python app", "hostname": "imberdeMac-mini.local", "port": 8000}
```

按 Ctrl+C 停止服务。零依赖，纯标准库。

## 再用 Docker 跑（需要装了 Docker）

```bash
# 1. 构建镜像，-t 给镜像起名 docker-demo
docker build -t docker-demo .

# 2. 运行容器，-p 把容器的 8000 映射到本机 8000
docker run -p 8000:8000 docker-demo

# 3. 另开终端访问
curl http://localhost:8000/
```

容器里跑的预期输出（注意 hostname 变成了容器 ID，证明这是在容器里跑的）：

```json
{"message": "Hello from a Dockerized Python app", "hostname": "3f9a1c2b4d5e", "port": 8000}
```

本机跑和容器里跑，应用代码一字没改，输出格式完全一样，只有 hostname 不同。这就是 Docker 的核心价值：**环境一致，到处一样跑。**

> 本 demo 的 Python app 已实测可跑（`python3 main.py` + curl 验证）。Dockerfile 语法正确、可读，但是否真的 `docker build` 取决于你本机装没装 Docker。

## 代码 ↔ 概念对应

| Docker 概念 | 在哪里 |
|---|---|
| 基础镜像（站在巨人肩上） | Dockerfile `FROM python:3.12-slim` |
| 工作目录 | `WORKDIR /app` |
| 层缓存（先拷依赖再拷代码） | `COPY requirements.txt` 在 `COPY main.py` 之前 |
| 装依赖 | `RUN pip install` |
| 暴露端口 | `EXPOSE 8000` + `docker run -p` |
| 启动命令 | `CMD ["python3", "main.py"]` |
| 端口可配置（12-factor） | `main.py` 里 `os.getenv("PORT")` |
| 不打进镜像的文件 | `.dockerignore` |

## 动手改

- 用 `PORT=9000 python3 main.py` 跑，验证端口可通过环境变量改。
- 故意把 `COPY main.py` 挪到 `COPY requirements.txt` 前面，体会层缓存失效（改代码也会重装依赖）。
- 在 `requirements.txt` 写一个真实依赖（如 `fastapi`），看 `docker build` 时 `pip install` 这一层怎么跑。

## 参考资料

- [OWASP LLM Top 10](https://genai.owasp.org/llm-top-10/)
- [Google SRE Workbook](https://sre.google/workbook/table-of-contents/)
