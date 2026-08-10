# 38 Docker 基础 demo

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
