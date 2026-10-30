# 星盘搜 × urldb Reshare 对接说明

## 架构

```
浏览器 (GitHub Pages HTTPS)
  → RESHARE_API_BASE（HTTPS 代理，无密钥）
    → 注入 X-API-Token
      → urldb http://49.234.16.138:3030/api/v1/reshare
```

**禁止**把 `ADMIN_TOKEN` / `RESHARE_TOKEN` 写进前端仓库或 `VITE_*`。

## 环境变量（前端构建）

| 变量 | 说明 |
|------|------|
| `VITE_RESHARE_API_BASE` | 代理基址，如 `https://panhub-reshare.vercel.app`；`same-origin` 表示跟当前页同源 |
| （运行时）`localStorage.RESHARE_API_BASE` | 覆盖构建值，便于本地调试 |

前端请求体（urldb 契约）：

```json
{ "url": "https://pan.xunlei.com/s/xxx", "pwd": "abcd", "title": "可选", "pan_type": "xunlei" }
```

轮询：`GET /api/v1/reshare/:task_id` → `data.status` 为 `pending|processing|done|failed`；完成时有 `share_url` / `passcode`。

## 代理怎么配

### A. Vercel（panhub-reshare，推荐给 Pages）

在 `panhub-reshare` 项目设置：

```
URLDB_UPSTREAM=http://49.234.16.138:3030
URLDB_TOKEN=<服务器 /home/ubuntu/apps/urldb/.credentials 里的令牌>
```

设置后 `/api/v1/reshare*` 转发到 urldb，不再走本地 mock/xunlei 驱动。

### B. 本地薄代理

```bash
URLDB_UPSTREAM=http://127.0.0.1:3030 \
URLDB_TOKEN=local-reshare-admin-token \
PORT=8788 node scripts/urldb-reshare-proxy.mjs
```

浏览器控制台：`localStorage.setItem("RESHARE_API_BASE","http://127.0.0.1:8788")`

### C. Hermes nginx（同机藏密钥；Pages 仍需 HTTPS 出口）

见 `docs/hermes-nginx-reshare-proxy.conf.snippet`。纯 HTTP 不能被 HTTPS Pages 直连（混合内容），需再套 Cloudflare / 证书，或继续用 A。

## 验证

```bash
# 经代理创建
curl -s -X POST "$BASE/api/v1/reshare" \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://pan.xunlei.com/s/真实ID?pwd=xxxx","title":"smoke"}'

# 轮询
curl -s "$BASE/api/v1/reshare/<task_id>"
```

星盘搜：搜索结果点「立即获取」、首页精选可转存盘点「立即获取」，应弹窗轮询后出分享链；失败则软回退原链。

## 运维检查清单

1. 腾讯云放行 / 可达 `49.234.16.138:3030`（代理所在网络）
2. urldb 已配网盘账号（cks）且有效
3. 代理已设 `URLDB_TOKEN`（与服务器 `.credentials` 一致）
4. Pages 构建的 `VITE_RESHARE_API_BASE` 指向该 HTTPS 代理
5. （可选）自动清理已在 urldb 开启
