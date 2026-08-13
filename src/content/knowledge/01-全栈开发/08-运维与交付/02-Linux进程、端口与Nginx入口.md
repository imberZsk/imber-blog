# 运维与交付（02） - Linux 进程、端口与 Nginx 入口

> 排障先证明请求到了哪一层，再修改配置；不要看到 502 就重启所有服务。

> 读完你能：沿 DNS、TLS、Nginx 和应用进程定位 502/504，并用 request_id 保留证据。

## 核心知识清单

- 进程、监听地址与端口归属
- DNS、TLS、Nginx 与反向代理链路
- 连接超时、读取超时与上游超时
- 静态资源缓存与 API 路由边界
- access log、error log 与 request_id

## 请求链路

浏览器先解析 DNS，与入口建立 TCP/TLS 连接；Nginx 根据 Host 和 Path 选择静态文件或上游服务；应用再访问缓存、数据库和其他服务。`connection refused` 通常表示目标没有监听，`502` 多是上游不可达或协议错误，`504` 多是上游未在超时预算内返回。

```bash
# 确认 8080 由哪个进程监听，以及只监听本机还是所有网卡。
ss -lntp | grep ':8080'
# 分别绕过和经过 Nginx 验证响应，定位故障边界。
curl -v http://127.0.0.1:8080/health
curl -vk https://example.com/health
```

```nginx
location /api/ {
    proxy_pass http://app:8080/;
    proxy_connect_timeout 2s;
    proxy_read_timeout 30s;
    proxy_set_header X-Request-ID $request_id;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 排障顺序

1. 用 DNS 查询和证书信息确认入口域名。
2. 用 `curl -v` 记录状态码、握手和响应时间。
3. 查 Nginx access/error log 中相同 request_id。
4. 直连上游健康检查，确认监听地址、端口和协议。
5. 只修改已证实有问题的一层，修改后重复同一请求。

## 参考资料

- [NGINX Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Linux ss manual](https://man7.org/linux/man-pages/man8/ss.8.html)
