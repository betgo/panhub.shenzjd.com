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
| `VITE_RESHARE_API_BASE` | 代理基址，默认已指向 Hermes Cloudflare tunnel；`same-origin` 表示跟当前页同源 |
| （运行时）`localStorage.RESHARE_API_BASE` | 覆盖构建值，便于本地调试 |

默认基址（无尾斜杠）：

```
https://creator-howto-raises-monday.trycloudflare.com
```

（quick tunnel 重启后 URL 会变；服务器上以 `~/apps/urldb-reshare-proxy/public-base-url.txt` 为准，变更后需改 `src/config.ts` 的 `DEFAULT_RESHARE_API_BASE` 或 Pages 构建变量。）

前端请求体（urldb 契约）：

```json
{ "url": "https://pan.xunlei.com/s/xxx", "pwd": "abcd", "title": "可选", "pan_type": "xunlei" }
```

轮询：`GET /api/v1/reshare/:task_id` → `data.status` 为 `pending|processing|done|failed`；完成时有 `share_url` / `passcode`。

## 代理怎么配

### A. Hermes + Cloudflare tunnel（当前主推，Pages 用这个）

腾讯云 Hermes 上：

- `systemd`：`urldb-reshare-proxy`（127.0.0.1:8788，从 `.credentials` 的 `ADMIN_TOKEN` 注入 `X-API-Token`，CORS `*`）
- `systemd`：`urldb-reshare-tunnel`（cloudflared quick tunnel → 上述代理）

浏览器只访问 tunnel 的 `https://….trycloudflare.com`，**不需要** Vercel。

要固定域名时可再配 Cloudflare named tunnel；当前 quick tunnel 基址也写在服务器 `~/apps/urldb-reshare-proxy/public-base-url.txt`。

### B. 本地薄代理

```bash
URLDB_UPSTREAM=http://127.0.0.1:3030 \
URLDB_TOKEN=local-reshare-admin-token \
PORT=8788 node scripts/urldb-reshare-proxy.mjs
```

浏览器控制台：`localStorage.setItem("RESHARE_API_BASE","http://127.0.0.1:8788")`

### C. Hermes nginx（可选，同机藏密钥）

见 `docs/hermes-nginx-reshare-proxy.conf.snippet`。纯 HTTP 不能被 HTTPS Pages 直连（混合内容），需再套 Cloudflare / 证书。当前生产走 **A** 即可。

### D. Vercel（可选 / 已不主推）

若仍要用 `panhub-reshare` 项目，可设：

```
URLDB_UPSTREAM=http://49.234.16.138:3030
URLDB_TOKEN=<服务器 /home/ubuntu/apps/urldb/.credentials 里的令牌>
```

星盘搜默认已改指向 Hermes tunnel，**不必**再部署或授权 Vercel。

## 验证

```bash
BASE=https://creator-howto-raises-monday.trycloudflare.com

# CORS 预检
curl -sI -X OPTIONS "$BASE/api/v1/reshare" \
  -H 'Origin: https://example.com' \
  -H 'Access-Control-Request-Method: POST'

# 经代理创建（假链会 pending→failed，契约正确即可）
curl -s -X POST "$BASE/api/v1/reshare" \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://pan.xunlei.com/s/真实ID?pwd=xxxx","title":"smoke"}'

# 轮询
curl -s "$BASE/api/v1/reshare/<task_id>"
```

星盘搜：搜索结果点「立即获取」、首页精选可转存盘点「立即获取」，应弹窗轮询后出分享链；失败则软回退原链。

## 运维检查清单

1. Hermes 上 `urldb-reshare-proxy` / `urldb-reshare-tunnel` 在跑，基址与前端一致
2. urldb 已配网盘账号（cks）且有效
3. 代理从 `.credentials` 注入令牌（与 urldb 一致）
4. Pages 合并后构建产物含新 `DEFAULT_RESHARE_API_BASE`（或显式 `VITE_RESHARE_API_BASE`）
5. （可选）自动清理已在 urldb 开启；named tunnel 可避免 quick tunnel URL 漂移
