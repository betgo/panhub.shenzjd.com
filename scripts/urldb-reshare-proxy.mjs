#!/usr/bin/env node
/**
 * 本地/运维用薄代理：浏览器 → 本服务(HTTPS或HTTP) → urldb
 * 密钥只读环境变量，不进前端仓库。
 *
 *   URLDB_UPSTREAM=http://127.0.0.1:3030 \
 *   URLDB_TOKEN=local-reshare-admin-token \
 *   PORT=8788 node scripts/urldb-reshare-proxy.mjs
 */
import http from 'node:http';

const upstream = (process.env.URLDB_UPSTREAM || 'http://127.0.0.1:3030').replace(/\/$/, '');
const token = (process.env.URLDB_TOKEN || '').trim();
const port = Number(process.env.PORT || 8788);

if (!token) {
  console.error('URLDB_TOKEN required');
  process.exit(1);
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Token',
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }
  const path = req.url || '/';
  if (!path.startsWith('/api/v1/reshare')) {
    res.writeHead(404, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'only /api/v1/reshare*' }));
    return;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  try {
    const headers = {
      Accept: 'application/json',
      'X-API-Token': token,
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      headers['Content-Type'] = 'application/json';
    }
    const u = await fetch(`${upstream}${path}`, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body.length ? body : undefined,
    });
    const text = await u.text();
    res.writeHead(u.status, {
      ...cors,
      'Content-Type': u.headers.get('content-type') || 'application/json',
    });
    res.end(text);
  } catch (e) {
    res.writeHead(502, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: String(e?.message || e) }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[urldb-reshare-proxy] http://127.0.0.1:${port} → ${upstream}`);
});
