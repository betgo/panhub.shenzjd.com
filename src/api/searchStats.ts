/**
 * 向 urldb 上报搜索词（写入 search_stats，供后台「搜索统计」）。
 *
 * POST /api/search-stats/record  body: { keyword, source? }
 * 鉴权令牌不进前端：走与 reshare 相同的代理基址（Hermes same-origin / Cloudflare tunnel）。
 * 失败静默，不影响搜索主流程。
 */
import { RESHARE_API_BASE } from "../config";

const DEFAULT_SOURCE = "web";

function statsRoot(): string {
  let b = RESHARE_API_BASE;
  if (typeof localStorage !== "undefined") {
    const ls = String(localStorage.getItem("RESHARE_API_BASE") || "")
      .trim()
      .replace(/\/$/, "");
    if (ls) b = ls;
  }
  if (b) return b.replace(/\/$/, "");

  // 未配 reshare 时：Hermes / 本地域名仍可走同源 Caddy → urldb
  if (typeof window !== "undefined" && window.location?.origin) {
    const host = window.location.hostname;
    if (
      host === "49.234.16.138" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith("xingpansou.site")
    ) {
      return window.location.origin;
    }
  }
  return "";
}

/** fire-and-forget：每次用户发起搜索时调用一次 */
export function recordSearchStat(
  keyword: string,
  source: string = DEFAULT_SOURCE,
): void {
  const kw = String(keyword || "").trim();
  if (!kw) return;
  const root = statsRoot();
  if (!root) return;

  const body = JSON.stringify({
    keyword: kw,
    source: String(source || DEFAULT_SOURCE).trim() || DEFAULT_SOURCE,
  });

  try {
    void fetch(`${root}/api/search-stats/record`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
      keepalive: true,
    }).catch(() => {
      /* ignore */
    });
  } catch {
    /* ignore */
  }
}
